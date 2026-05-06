package com.cps.mcp.embabel_mcp.controller;

import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.stream.Collectors;
import com.cps.mcp.model.*;
import com.cps.mcp.util.LLMClient;

@RestController
public class PlanController {

    private String mapActionToTool(String actionName) {
        String name = actionName.toLowerCase();
        if (name.contains("research")) return "SearchAgent";
        if (name.contains("slide")) return "SearchAgent";
        if (name.contains("practice")) return "SearchAgent";
        if (name.contains("agenda")) return "SearchAgent";
        if (name.contains("invite")) return "InviteAgent";
        if (name.contains("schedule")) return "CalendarAgent";
        if (name.contains("book")) return "BudgetAgent";
        if (name.contains("ticket")) return "BudgetAgent";
        if (name.contains("pack")) return "SearchAgent";
        if (name.contains("travel")) return "SearchAgent";
        return "SearchAgent";
    }

    private boolean isAllowed(String actionName, List<String> allowedTools) {
        // If no tools specified, allow all actions (default behavior)
        if (allowedTools == null || allowedTools.isEmpty()) {
            return true;
        }
        
        // Otherwise, strictly check if action's tool is in allowedTools
        String tool = mapActionToTool(actionName);
        return allowedTools.contains(tool);
    }

    @PostMapping("/plan")
    public Map<String, Object> plan(@RequestBody Map<String, Object> body) {
        String goalStr = (String) body.get("goal");
        List<String> tools = (List<String>) body.get("tools");

        // 1. Create initial state
        State state = new State();

        // 2. Dynamic Action Generation using LLM (Tool-aware)
        String prompt = "You are a planning system. \n" +
                        "Available tools:\n" +
                        "* SearchAgent (research, analysis)\n" +
                        "* CalendarAgent (scheduling, time planning)\n" +
                        "* BudgetAgent (cost estimation, finance)\n" +
                        "* InviteAgent (invitations, email)\n" +
                        "* FoodAgent (catering, restaurant)\n" +
                        "Generate a sequential list of 4-6 steps to achieve the goal.\n" +
                        "Each step MUST include ONE tool in this EXACT format: description | ToolName\n" +
                        "Goal: " + goalStr;
        
        String rawOutput = LLMClient.callLLM(prompt).trim();
        System.out.println("RAW LLM OUTPUT:\n" + rawOutput);

        List<Action> allActions = new ArrayList<>();
        Goal goal = null;

        // 3. Robust Step Extraction
        String[] lines = rawOutput.split("\\n+");
        List<String> steps = new ArrayList<>();
        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) continue;
            
            // Skip intro/outro lines (often end with :)
            if (trimmed.endsWith(":") && trimmed.length() < 100) continue;
            
            // Skip common filler phrases
            String lower = trimmed.toLowerCase();
            if (lower.startsWith("here is") || lower.startsWith("by following") || lower.startsWith("this plan")) continue;
            
            // Clean markdown bolding
            String cleaned = trimmed.replace("**", "");
            
            // Remove "Step 1:", "1.", "-", "*", etc.
            cleaned = cleaned.replaceAll("(?i)^(Step\\s+\\d+[:\\.]?\\s*|[\\d\\.\\-\\)\\*•\\s]+)", "").trim();
            
            // Parse Step | Tool
            String stepName = cleaned;
            String suggestedAgent = "SearchAgent";
            if (cleaned.contains("|")) {
                String[] parts = cleaned.split("\\|");
                stepName = parts[0].trim();
                suggestedAgent = parts[1].trim();
            }

            // Validate against allowed tools
            if (tools != null && !tools.isEmpty()) {
                if (!tools.contains(suggestedAgent)) {
                    // Fallback to SearchAgent if allowed, else first allowed tool
                    suggestedAgent = tools.contains("SearchAgent") ? "SearchAgent" : tools.get(0);
                }
            }
            
            // Validate length and quality
            if (stepName.length() > 5 && stepName.length() < 150) {
                System.out.println("Parsed: " + stepName + " -> " + suggestedAgent);
                steps.add(stepName + "|" + suggestedAgent);
            }
            
            if (steps.size() >= 6) break;
        }
        System.out.println("FINAL STEPS LIST: " + steps);

        // 4. Validate and Convert steps into sequential GOAP actions
        if (steps.size() >= 2) {
            for (int j = 0; j < steps.size(); j++) {
                String[] parts = steps.get(j).split("\\|");
                String name = parts[0];
                String agent = parts[1];
                
                List<String> pre = new ArrayList<>();
                if (j > 0) {
                    pre.add("step_" + (j - 1) + "_done");
                }
                List<String> eff = Arrays.asList("step_" + j + "_done");
                
                Action action = new Action(name, pre, eff, goalStr, agent);
                allActions.add(action);
            }
            
            // Define goal as completion of the last step
            goal = new Goal(Arrays.asList("step_" + (allActions.size() - 1) + "_done"));
            System.out.println("Generated " + allActions.size() + " dynamic actions.");
        }

        // 5. Fallback: If LLM returned no usable steps or validation failed
        if (allActions.isEmpty()) {
            System.out.println("FALLBACK TRIGGERED: Using minimal generic steps.");
            goal = new Goal(Arrays.asList("task_completed"));
            allActions.add(new Action("Research topic", Arrays.asList(), Arrays.asList("researched"), goalStr));
            allActions.add(new Action("Execute task", Arrays.asList("researched"), Arrays.asList("task_completed"), goalStr));
        }

        String planType = allActions.size() > 2 ? "dynamic_text_" + allActions.size() : "fallback";

        // Filter actions based on allowed tools
        List<Action> actions = allActions.stream()
                .filter(action -> isAllowed(action.getName(), tools))
                .collect(Collectors.toList());

        // 4. Call planner
        Planner planner = new Planner();
        PlanResult planResult = planner.plan(state, goal, actions);
        List<Action> plan = planResult.getPlan();
        List<Map<String, Object>> trace = planResult.getTrace();

        // Fallback: if plan is empty or incomplete due to tool restrictions, allow minimal required actions
        if ((plan == null || plan.isEmpty()) && tools != null && !tools.isEmpty()) {
            List<Action> minimalActions = allActions.stream()
                    .filter(action -> action.getName().toLowerCase().contains("research") || 
                                     action.getName().toLowerCase().contains("slide") ||
                                     action.getName().toLowerCase().contains("practice"))
                    .collect(Collectors.toList());
            PlanResult fallbackResult = planner.plan(state, goal, minimalActions);
            plan = fallbackResult.getPlan();
            trace = fallbackResult.getTrace();
        }

        // 5. Convert actions → tasks
        List<Map<String, Object>> tasks = new ArrayList<>();
        int i = 1;
        for (Action action : plan) {
            List<String> deps = new ArrayList<>();
            if (i > 1) {
                deps.add("T" + (i - 1));
            }
            Map<String, Object> task = new LinkedHashMap<>();
            task.put("id", "T" + i);
            task.put("description", action.getName());
            task.put("agent", action.getAgent());
            task.put("dependencies", deps);

            if (action.getName().toLowerCase().contains("research")) {
                String data = state.get("research_data:");
                if (data != null && !data.isBlank()) {
                    task.put("output", data);
                }
            }

            if (action.getName().toLowerCase().contains("schedule")) {
                String data = state.get("schedule_data:");
                if (data != null && !data.isBlank()) {
                    task.put("output", data);
                }
            }

            tasks.add(task);
            i++;
        }

        // 6. Return JSON with trace
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("goal", goalStr);
        response.put("classification", planType);
        response.put("tasks", tasks);
        response.put("trace", trace);
        return response;
    }
}