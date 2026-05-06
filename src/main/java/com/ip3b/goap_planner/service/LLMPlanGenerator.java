package com.ip3b.goap_planner.service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ip3b.goap_planner.model.PlanStep;
import com.ip3b.goap_planner.model.PlanAssignment;
import com.ip3b.goap_planner.model.MermaidGanttTask;
import com.ip3b.goap_planner.visualization.MermaidPlanDiagramFactory;

/**
 * Generates plans using Llama3 via Ollama
 */
@Service
public class LLMPlanGenerator {

    private final MermaidPlanDiagramFactory diagramFactory;
    private static final ObjectMapper mapper = new ObjectMapper();

    public LLMPlanGenerator(MermaidPlanDiagramFactory diagramFactory) {
        this.diagramFactory = diagramFactory;
    }

    /**
     * Generate a plan using Llama3 LLM
     */
    public LLMPlanResult generatePlanWithLLM(String goal) {
        // Java-side LLM integration removed. Use the Python planner API instead.
        System.out.println("LLMPlanGenerator: Java Ollama integration removed; skipping LLM path.");
        return null;
    }

    private String buildPlanningPrompt(String goal) {
        return """
                You are a deterministic planning system that generates detailed action plans.

                Your task is to break down the following goal into clear, actionable steps.

                OUTPUT FORMAT (strictly valid JSON, no markdown, no explanations):
                {
                  "goal": "%s",
                  "summary": "Brief summary of the plan approach",
                  "steps": [
                    {
                      "order": 1,
                      "title": "First step title",
                      "details": "Detailed description of what to do"
                    },
                    {
                      "order": 2,
                      "title": "Second step title",
                      "details": "Detailed description of what to do"
                    }
                  ]
                }

                Generate a plan for this goal. Output ONLY valid JSON.

                Goal: %s
                """.formatted(goal, goal);
    }

    private LLMPlanResult parseAndValidatePlan(String response, String goal) {
        try {
            // Extract JSON from response
            String jsonStr = extractJson(response);
            System.out.println("LLMPlanGenerator: Extracted JSON length = " + (jsonStr == null ? "null" : jsonStr.length()));
            if (jsonStr == null) {
                System.out.println("LLMPlanGenerator: Could not extract JSON from response. Response preview: " + response.substring(0, Math.min(200, response.length())));
                return null;
            }

            Map<String, Object> planMap = mapper.readValue(jsonStr, Map.class);

            List<PlanStep> steps = new ArrayList<>();
            List<?> stepsData = (List<?>) planMap.get("steps");

            if (stepsData == null || stepsData.isEmpty()) {
                return null;
            }

            for (Object stepObj : stepsData) {
                Map<String, Object> step = (Map<String, Object>) stepObj;
                int order = ((Number) step.get("order")).intValue();
                String title = (String) step.get("title");
                String details = (String) step.get("details");

                if (title != null && !title.isBlank()) {
                    steps.add(new PlanStep(order, title, details != null ? details : ""));
                }
            }

            // Generate agent assignments
            List<PlanAssignment> assignments = generateAssignments(steps, goal);

            // Generate Gantt tasks
            List<MermaidGanttTask> ganttTasks = generateGanttTasks(steps);

            String summary = (String) planMap.get("summary");
            if (summary == null) {
                summary = "AI-generated plan for: " + goal;
            }

            return new LLMPlanResult(
                    goal,
                    summary,
                    steps,
                    assignments,
                    ganttTasks,
                    diagramFactory.buildFlowchart(goal, steps),
                    diagramFactory.buildGantt(goal, ganttTasks)
            );

        } catch (Exception e) {
            System.err.println("Error parsing LLM plan: " + e.getMessage());
            return null;
        }
    }

    private List<PlanAssignment> generateAssignments(List<PlanStep> steps, String goal) {
        List<String> agents = getAgentPool(goal);
        List<PlanAssignment> assignments = new ArrayList<>();

        String[] capabilities = {"Analysis", "Execution", "Integration", "Testing", "Coordination"};

        for (int i = 0; i < steps.size(); i++) {
            PlanStep step = steps.get(i);
            String agent = agents.get(i % agents.size());
            String capability = capabilities[i % capabilities.length];
            String status = getStatusForStep(i, steps.size());
            String handoffTo = i < steps.size() - 1 ? agents.get((i + 1) % agents.size()) : "Complete";

            assignments.add(new PlanAssignment(
                    step.order(),
                    step.title(),
                    agent,
                    capability,
                    status,
                    handoffTo,
                    "AI-assigned based on step requirements"
            ));
        }

        return assignments;
    }

    private List<MermaidGanttTask> generateGanttTasks(List<PlanStep> steps) {
        List<MermaidGanttTask> tasks = new ArrayList<>();
        String[] sections = {"Planning", "Execution", "Validation", "Completion"};

        for (int i = 0; i < steps.size(); i++) {
            PlanStep step = steps.get(i);
            String section = sections[i % sections.length];
            int durationDays = 1 + (i % 3);

            tasks.add(new MermaidGanttTask(
                    section,
                    "Step " + step.order() + ": " + step.title(),
                    "step_" + step.order(),
                    i,
                    durationDays
            ));
        }

        return tasks;
    }

    private String getStatusForStep(int index, int totalSteps) {
        if (index == 0) return "Ready";
        if (index == 1) return "Queued";
        if (index < totalSteps - 1) return "In progress";
        return "Waiting";
    }

    private List<String> getAgentPool(String goal) {
        // Simple heuristic-based agent selection
        String lowerGoal = goal.toLowerCase();
        List<String> agents = new ArrayList<>();

        if (lowerGoal.contains("hack") || lowerGoal.contains("code")) {
            agents.addAll(List.of("DeveloperAgent", "TestAgent", "IntegrationAgent", "ReviewAgent"));
        } else if (lowerGoal.contains("event") || lowerGoal.contains("party")) {
            agents.addAll(List.of("CoordinationAgent", "VenueAgent", "LogisticsAgent", "CommunicationAgent"));
        } else if (lowerGoal.contains("app") || lowerGoal.contains("launch")) {
            agents.addAll(List.of("ProductAgent", "DesignAgent", "EngineerAgent", "LaunchAgent"));
        } else {
            agents.addAll(List.of("PlannerAgent", "ExecutorAgent", "MonitorAgent", "OptimizationAgent"));
        }

        return agents;
    }

    private String extractJson(String text) {
        // Find the JSON object in the response
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');

        if (start == -1 || end == -1 || start >= end) {
            return null;
        }

        return text.substring(start, end + 1);
    }

    private boolean isValidPlan(LLMPlanResult result) {
        return result != null
                && result.steps != null
                && !result.steps.isEmpty()
                && result.steps.size() <= 10;
    }

    // Result class for holding generated plan data
    public static class LLMPlanResult {
        public String goal;
        public String summary;
        public List<PlanStep> steps;
        public List<PlanAssignment> assignments;
        public List<MermaidGanttTask> ganttTasks;
        public String mermaidDiagram;
        public String ganttDiagram;

        public LLMPlanResult(String goal, String summary, List<PlanStep> steps,
                List<PlanAssignment> assignments, List<MermaidGanttTask> ganttTasks,
                String mermaidDiagram, String ganttDiagram) {
            this.goal = goal;
            this.summary = summary;
            this.steps = steps;
            this.assignments = assignments;
            this.ganttTasks = ganttTasks;
            this.mermaidDiagram = mermaidDiagram;
            this.ganttDiagram = ganttDiagram;
        }
    }
}
