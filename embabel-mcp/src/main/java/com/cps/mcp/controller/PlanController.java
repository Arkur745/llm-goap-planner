package com.cps.mcp.embabel_mcp.controller;

import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.stream.Collectors;
import com.cps.mcp.model.*;
import com.cps.mcp.util.LLMClient;
import com.cps.mcp.util.MermaidVisualizer;

@RestController
public class PlanController {

    @PostMapping("/plan")
    public Map<String, Object> plan(@RequestBody Map<String, Object> body) {
        String goalStr = (String) body.get("goal");
        List<String> tools = (List<String>) body.get("tools");

        if (goalStr == null || goalStr.isBlank()) {
            Map<String, Object> errorRes = new LinkedHashMap<>();
            errorRes.put("error", "Goal is required");
            return errorRes;
        }

        // 1. Tool Logic: SearchAgent is ALWAYS included as the foundation agent
        List<String> allPossibleAgents = Arrays.asList("SearchAgent", "CalendarAgent", "BudgetAgent", "InviteAgent", "FoodAgent");
        List<String> userTools = (tools == null || tools.isEmpty()) ? allPossibleAgents : tools;
        
        // Ensure SearchAgent is always there even if not selected
        Set<String> toolSet = new LinkedHashSet<>(userTools);
        toolSet.add("SearchAgent"); 
        List<String> effectiveTools = new ArrayList<>(toolSet);

        // 2. Create initial state
        State state = new State();

        // 3. Dynamic Action Generation using LLM (Tool-aware)
        String toolsStr = String.join(", ", effectiveTools);
        String prompt = "You are a planning system. \n" +
                        "Available tools: " + toolsStr + "\n" +
                        "Rules:\n" +
                        "1. Return ONLY the steps. NO introduction, NO explanations.\n" +
                        "2. Format: - Description of the task | ToolName\n" +
                        "3. Use ONE tool per step. Use SearchAgent for anything non-specialized.\n" +
                        "4. Goal: " + goalStr;
        
        String rawOutput = LLMClient.callLLM(prompt).trim();
        System.out.println("RAW LLM OUTPUT:\n" + rawOutput);

        List<Action> allActions = new ArrayList<>();
        Goal goal = null;

        // 4. Step Extraction and Agent Validation
        String[] lines = rawOutput.split("\\n+");
        List<String[]> parsedSteps = new ArrayList<>();
        Set<String> seenDescriptions = new HashSet<>();
        
        for (String line : lines) {
            String rawLine = line.trim();
            if (rawLine.isEmpty()) continue;

            // Skip common LLM meta-text
            String lower = rawLine.toLowerCase();
            if (lower.contains("here is") || lower.contains("sequential list") || lower.contains("achieve the goal") || lower.contains("i'm ready")) continue;

            // Clean formatting
            String cleaned = rawLine.replace("**", "").replaceAll("(?i)^(Step\\s+\\d+[:\\.]?\\s*|[\\d\\.\\-\\)\\*•\\s]+)", "").trim();
            if (cleaned.length() < 10 || (cleaned.endsWith(":") && cleaned.length() < 60)) continue;

            String stepName = cleaned;
            String suggestedAgent = "SearchAgent";

            if (cleaned.contains("|")) {
                String[] parts = cleaned.split("\\|");
                stepName = parts[0].trim();
                String rawAgent = parts[1].trim();
                
                // Validate agent name
                for (String t : effectiveTools) {
                    if (rawAgent.toLowerCase().contains(t.toLowerCase().replace("agent", ""))) {
                        suggestedAgent = t;
                        break;
                    }
                }
            }

            // Deduplication and sanity check
            String shortDesc = stepName.substring(0, Math.min(stepName.length(), 20)).toLowerCase();
            if (!seenDescriptions.contains(shortDesc)) {
                parsedSteps.add(new String[]{stepName, suggestedAgent});
                seenDescriptions.add(shortDesc);
            }
            
            if (parsedSteps.size() >= 6) break;
        }

        // 4. Convert steps into GOAP actions
        if (parsedSteps.size() >= 1) {
            for (int j = 0; j < parsedSteps.size(); j++) {
                String name = parsedSteps.get(j)[0];
                String agent = parsedSteps.get(j)[1];
                
                List<String> pre = (j > 0) ? Arrays.asList("step_" + (j - 1) + "_done") : new ArrayList<>();
                List<String> eff = Arrays.asList("step_" + j + "_done");
                
                allActions.add(new Action(name, pre, eff, goalStr, agent));
            }
            goal = new Goal(Arrays.asList("step_" + (allActions.size() - 1) + "_done"));
        } else {
            // Fallback if no steps parsed
            allActions.add(new Action("Complete general task", new ArrayList<>(), Arrays.asList("done"), goalStr, effectiveTools.get(0)));
            goal = new Goal(Arrays.asList("done"));
        }

        // 5. Call planner
        Planner planner = new Planner();
        PlanResult planResult = planner.plan(state, goal, allActions);
        List<Action> plan = planResult.getPlan();
        List<Map<String, Object>> trace = planResult.getTrace();

        // 6. EXECUTION PHASE
        List<Map<String, Object>> tasks = new ArrayList<>();
        List<Map<String, Object>> executions = new ArrayList<>();
        int i = 1;
        for (Action action : plan) {
            Map<String, Object> task = new LinkedHashMap<>();
            task.put("id", "T" + i);
            task.put("description", action.getName());
            task.put("agent", action.getAgent());
            task.put("dependencies", (i > 1) ? Arrays.asList("T" + (i - 1)) : new ArrayList<>());

            System.out.println("Executing " + task.get("id") + " with " + action.getAgent() + "...");
            String agentResponse = LLMClient.simulateAgentExecution(action.getAgent(), action.getName());
            task.put("output", agentResponse);

            Map<String, Object> execResult = new LinkedHashMap<>();
            execResult.put("type", "MCP");
            execResult.put("agent", action.getAgent());
            execResult.put("task", action.getName());
            execResult.put("response", Map.of("content", agentResponse));
            executions.add(execResult);

            tasks.add(task);
            i++;
        }

        // 7. Visualizations
        String flowchart = MermaidVisualizer.generateFlowchart(tasks);
        String gantt = MermaidVisualizer.generateGantt(tasks);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("goal", goalStr);
        response.put("classification", "dynamic_plan");
        response.put("tasks", tasks);
        response.put("execution", executions);
        response.put("trace", trace);
        response.put("flowchart", flowchart);
        response.put("gantt", gantt);
        return response;
    }
}