package com.cps.mcp.controller;

import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.stream.Collectors;
import com.cps.mcp.model.PlanningResponse;
import com.cps.mcp.model.PlanningTask;
import com.cps.mcp.util.LLMService;
import com.cps.mcp.util.LLMServiceFactory;
import com.cps.mcp.util.MermaidVisualizer;
import com.cps.mcp.util.PlanValidator;
import com.embabel.plan.common.condition.ConditionAction;
import com.embabel.plan.common.condition.ConditionGoal;
import com.embabel.plan.common.condition.ConditionDetermination;
import com.embabel.agent.api.common.autonomy.Autonomy;
import com.embabel.agent.api.common.autonomy.AgentProcessExecution;
import com.embabel.agent.core.AgentProcess;
import com.embabel.agent.core.ProcessOptions;
import com.embabel.agent.core.ActionInvocation;

@RestController
public class PlanController {

    private final LLMServiceFactory llmServiceFactory;
    private final Autonomy autonomy;

    public PlanController(LLMServiceFactory llmServiceFactory, Autonomy autonomy) {
        this.llmServiceFactory = llmServiceFactory;
        this.autonomy = autonomy;
    }

    @PostMapping("/plan")
    public Map<String, Object> plan(
            @RequestBody Map<String, Object> body,
            @RequestParam(value = "runtime", required = false) String runtime) {
        String goalStr = (String) body.get("goal");

        String runtimeVal = runtime;
        if (runtimeVal == null && body.containsKey("runtime")) {
            runtimeVal = body.get("runtime").toString();
        }

        if (runtimeVal == null || runtimeVal.isBlank()) {
            runtimeVal = "embabel";
        }

        if (!"embabel".equalsIgnoreCase(runtimeVal) && !"legacy".equalsIgnoreCase(runtimeVal)) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST,
                "Invalid runtime: '" + runtimeVal + "'. Supported values: 'embabel', 'legacy'"
            );
        }

        if ("legacy".equalsIgnoreCase(runtimeVal)) {
            Map<String, Object> res = executeLegacyPlanner(goalStr, body);
            res.put("fallbackUsed", false);
            return res;
        }

        try {
            Map<String, Object> res = executeEmbabelPlanner(goalStr, body);
            res.put("fallbackUsed", false);
            return res;
        } catch (Exception ex) {
            System.err.println("PlanController: Embabel execution failed, falling back to legacy: " + ex.getMessage());
            ex.printStackTrace();

            Map<String, Object> res = executeLegacyPlanner(goalStr, body);
            res.put("classification", "legacy_runtime");
            res.put("source", "LEGACY_FALLBACK");
            res.put("fallbackUsed", true);
            res.put("fallbackReason", ex.getMessage());
            return res;
        }
    }

    private Map<String, Object> executeEmbabelPlanner(String goalStr, Map<String, Object> body) throws Exception {
        AgentProcessExecution execution = autonomy.chooseAndRunAgent(goalStr, new ProcessOptions());
        AgentProcess process = execution.getAgentProcess();

        Class<?> agentClass = com.cps.mcp.agent.TravelPlannerAgent.class;
        List<ActionInvocation> history = process.getHistory();
        if (!history.isEmpty()) {
            String firstAction = history.get(0).getActionName();
            int lastDot = firstAction.lastIndexOf('.');
            if (lastDot != -1) {
                try {
                    agentClass = Class.forName(firstAction.substring(0, lastDot));
                } catch (Exception e) {
                    // ignore
                }
            }
        }

        List<Map<String, Object>> steps = com.cps.mcp.util.EmbabelTraceMapper.mapSteps(agentClass, process);
        List<Map<String, Object>> trace = com.cps.mcp.util.EmbabelTraceMapper.mapTrace(agentClass, process);
        String mermaidDiagram = com.cps.mcp.util.EmbabelGraphBuilder.generateMermaidDiagram(agentClass);

        String summary = "";
        Object finalReport = null;
        for (Object obj : process.getObjects()) {
            if ("TravelPlanReport".equals(obj.getClass().getSimpleName())) {
                finalReport = obj;
            }
        }

        if (finalReport != null) {
            summary = com.cps.mcp.util.EmbabelTraceMapper.formatOutput(finalReport);
        } else {
            Object output = execution.getOutput();
            summary = output != null ? output.toString() : "";
        }

        List<String> actionsExecuted = new ArrayList<>();
        for (ActionInvocation inv : history) {
            actionsExecuted.add(inv.getActionName());
        }

        List<String> blackboardObjects = new ArrayList<>();
        for (Object obj : process.getObjects()) {
            blackboardObjects.add(obj.getClass().getSimpleName());
        }

        Map<String, Object> embabelDebug = new LinkedHashMap<>();
        embabelDebug.put("actionsExecuted", actionsExecuted);
        embabelDebug.put("blackboardObjects", blackboardObjects);
        embabelDebug.put("processStatus", process.getStatus() != null ? process.getStatus().name() : "COMPLETED");
        embabelDebug.put("durationMs", process.getRunningTime() != null ? process.getRunningTime().toMillis() : 0L);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("goal", goalStr);
        response.put("classification", "embabel_runtime");
        response.put("status", "Ready");
        response.put("source", "EMBABEL");
        response.put("summary", summary);
        response.put("steps", steps);
        response.put("trace", trace);
        response.put("mermaidDiagram", mermaidDiagram);
        response.put("flowchart", mermaidDiagram);
        response.put("embabel", embabelDebug);

        return response;
    }

    private Map<String, Object> executeLegacyPlanner(String goalStr, Map<String, Object> body) {
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

        // 2. Create initial state map
        Map<String, Boolean> initialStateMap = new LinkedHashMap<>();
        if (body.containsKey("initial_state")) {
            Object rawState = body.get("initial_state");
            if (rawState instanceof Map) {
                for (Map.Entry<?, ?> entry : ((Map<?, ?>) rawState).entrySet()) {
                    if (entry.getKey() != null) {
                        initialStateMap.put(entry.getKey().toString(), Boolean.TRUE.equals(entry.getValue()));
                    }
                }
            }
        }

        // 3. Resolve LLM provider from request body
        String provider = (String) body.get("provider");
        if (provider == null) {
            provider = "auto";
        }
        LLMService llmService = llmServiceFactory.getService(provider);

        // 4. Dynamic Action Generation using LLM (Tool-aware)
        String toolsStr = String.join(", ", effectiveTools);
        
        PlanningResponse planningResponse;
        try {
            planningResponse = llmService.generatePlan(goalStr, toolsStr);
        } catch (Exception e) {
            System.err.println("PlanController: LLM planning failed: " + e.getMessage());
            Map<String, Object> errorRes = new LinkedHashMap<>();
            errorRes.put("error", "Failed to generate plan: " + e.getMessage());
            return errorRes;
        }

        List<ConditionAction> allActions = new ArrayList<>();
        Map<ConditionAction, String> actionToId = new HashMap<>();
        Map<ConditionAction, String> actionToDesc = new HashMap<>();
        Map<ConditionAction, String> actionToAgent = new HashMap<>();

        // 5. Convert DTO tasks into GOAP actions with validation/normalization
        List<PlanningTask> tasksList = planningResponse.getTasks();
        if (tasksList != null && !tasksList.isEmpty()) {
            for (int j = 0; j < tasksList.size(); j++) {
                PlanningTask task = tasksList.get(j);
                String name = task.getTitle();
                String desc = task.getDescription();
                String agent = task.getAgent();
                
                // Validate suggested agent against effectiveTools
                String validatedAgent = "SearchAgent";
                for (String t : effectiveTools) {
                    if (agent.toLowerCase().contains(t.toLowerCase().replace("agent", ""))) {
                        validatedAgent = t;
                        break;
                    }
                }
                
                // Extract preconditions and effects
                List<String> rawPre = task.getPreconditions();
                List<String> rawEff = task.getEffects();
                
                // Normalize and clean facts
                List<String> pre = new ArrayList<>();
                if (rawPre != null) {
                    for (String p : rawPre) {
                        if (p != null && !p.trim().isEmpty()) {
                            pre.add(p.trim().toLowerCase());
                        }
                    }
                }
                
                List<String> eff = new ArrayList<>();
                if (rawEff != null) {
                    for (String e : rawEff) {
                        if (e != null && !e.trim().isEmpty()) {
                            eff.add(e.trim().toLowerCase());
                        }
                    }
                }
                
                // Self-dependency detection & validation
                for (String p : pre) {
                    if (eff.contains(p)) {
                        Map<String, Object> errorRes = new LinkedHashMap<>();
                        errorRes.put("error", "Invalid plan: Self-dependency detected in task '" + name + "' (fact '" + p + "' is in both preconditions and effects).");
                        return errorRes;
                    }
                }
                
                // Deduplicate
                Set<String> preSet = new LinkedHashSet<>(pre);
                Set<String> effSet = new LinkedHashSet<>(eff);
                
                pre = new ArrayList<>(preSet);
                eff = new ArrayList<>(effSet);
                
                // Infer reasonable defaults if preconditions/effects are omitted
                if (pre.isEmpty()) {
                    pre = (j > 0) ? Arrays.asList("step_" + (j - 1) + "_done") : new ArrayList<>();
                }
                if (eff.isEmpty()) {
                    eff = Arrays.asList("step_" + j + "_done");
                }
                
                Map<String, Boolean> preMap = new LinkedHashMap<>();
                for (String p : pre) preMap.put(p, true);
                Map<String, Boolean> effMap = new LinkedHashMap<>();
                for (String e : eff) effMap.put(e, true);

                ConditionAction action = com.embabel.plan.common.condition.EmbabelPlanningFactory.createAction(name, preMap, effMap);
                allActions.add(action);
                
                String idStr = "T" + task.getId();
                actionToId.put(action, idStr);
                actionToDesc.put(action, desc);
                actionToAgent.put(action, validatedAgent);
            }
        } else {
            Map<String, Boolean> preMap = new LinkedHashMap<>();
            Map<String, Boolean> effMap = new LinkedHashMap<>();
            effMap.put("done", true);
            ConditionAction action = com.embabel.plan.common.condition.EmbabelPlanningFactory.createAction("Complete general task", preMap, effMap);
            allActions.add(action);
            
            actionToId.put(action, "T1");
            actionToDesc.put(action, "No tasks found");
            actionToAgent.put(action, effectiveTools.get(0));
        }

        // 6. Goal Construction Priorities
        ConditionGoal goal = null;
        List<String> explicitGoalConditions = (List<String>) body.get("goal_conditions");
        List<String> goalConditionsList = new ArrayList<>();
        if (explicitGoalConditions != null && !explicitGoalConditions.isEmpty()) {
            // Priority 1: Explicit goal_conditions
            for (String g : explicitGoalConditions) {
                if (g != null && !g.trim().isEmpty()) goalConditionsList.add(g.trim().toLowerCase());
            }
            System.out.println("Goal constructed via Priority 1 (Explicit): " + goalConditionsList);
        } else {
            // Priority 2: Inferred semantic goal from the final task
            List<String> inferredSemantic = null;
            if (!allActions.isEmpty()) {
                ConditionAction finalAction = allActions.get(allActions.size() - 1);
                if (finalAction.getEffects() != null && !finalAction.getEffects().isEmpty()) {
                    inferredSemantic = new ArrayList<>(finalAction.getEffects().keySet());
                }
            }
            
            if (inferredSemantic != null && !inferredSemantic.isEmpty()) {
                goalConditionsList = inferredSemantic;
                System.out.println("Goal constructed via Priority 2 (Semantic): " + inferredSemantic);
            } else {
                // Priority 3: Inferred leaf effects
                Set<String> allEffects = new HashSet<>();
                Set<String> allPreconditions = new HashSet<>();
                for (ConditionAction action : allActions) {
                    allEffects.addAll(action.getEffects().keySet());
                    allPreconditions.addAll(action.getPreconditions().keySet());
                }
                List<String> leafEffects = new ArrayList<>(allEffects);
                leafEffects.removeAll(allPreconditions);
                
                if (leafEffects.isEmpty() && !allActions.isEmpty()) {
                    leafEffects = new ArrayList<>(allActions.get(allActions.size() - 1).getEffects().keySet());
                }
                goalConditionsList = leafEffects;
                System.out.println("Goal constructed via Priority 3 (Leaf Fallback): " + leafEffects);
            }
        }

        Map<String, Boolean> goalMap = new LinkedHashMap<>();
        for (String g : goalConditionsList) {
            goalMap.put(g, true);
        }
        goal = com.embabel.plan.common.condition.EmbabelPlanningFactory.createGoal("Goal", goalMap);

        // 7. Validate plan inputs (self-loops, cyclic dependencies, unreachable goals, disconnected components)
        PlanValidator.ValidationResult validationResult = PlanValidator.validate(initialStateMap, goal, allActions);
        if (!validationResult.isValid()) {
            Map<String, Object> errorRes = new LinkedHashMap<>();
            errorRes.put("error", validationResult.getErrorMessage());
            return errorRes;
        }

        // 8. Solve using GOAP Planner
        com.embabel.plan.goap.astar.AStarGoapPlanner planner = new com.embabel.plan.goap.astar.AStarGoapPlanner(
            com.embabel.plan.common.condition.EmbabelPlanningFactory.createDeterminer(initialStateMap)
        );
        com.embabel.plan.common.condition.ConditionPlan planResult = planner.planToGoal(allActions, goal);
        List<com.embabel.plan.Action> planActions = (planResult != null) ? planResult.getActions() : Collections.emptyList();

        // Validate plan outcome (detect cyclic dependency or unreachable goals)
        if (planActions.isEmpty() && !allActions.isEmpty() && !goal.getPreconditions().isEmpty()) {
            Map<String, Object> errorRes = new LinkedHashMap<>();
            errorRes.put("error", "Failed to generate plan: Unreachable goal or cyclic dependency detected. GOAP could not find a path to satisfy " + goal.getPreconditions().keySet());
            return errorRes;
        }

        // Reconstruct Execution Trace
        List<Map<String, Object>> trace = new ArrayList<>();
        Set<String> tempState = new HashSet<>();
        for (Map.Entry<String, Boolean> entry : initialStateMap.entrySet()) {
            if (entry.getValue() != null && entry.getValue()) {
                tempState.add(entry.getKey());
            }
        }

        for (com.embabel.plan.Action rawAction : planActions) {
            ConditionAction action = (ConditionAction) rawAction;
            List<String> stateBefore = new ArrayList<>(tempState);

            List<String> preconditionsChecked = new ArrayList<>();
            List<String> missing = new ArrayList<>();
            for (Map.Entry<String, ConditionDetermination> preEntry : action.getPreconditions().entrySet()) {
                String preFact = preEntry.getKey();
                if (preEntry.getValue() == ConditionDetermination.TRUE) {
                    preconditionsChecked.add(preFact);
                    if (!tempState.contains(preFact)) {
                        missing.add(preFact);
                    }
                }
            }

            List<String> effectsApplied = new ArrayList<>();
            for (Map.Entry<String, ConditionDetermination> effEntry : action.getEffects().entrySet()) {
                String effFact = effEntry.getKey();
                if (effEntry.getValue() == ConditionDetermination.TRUE) {
                    effectsApplied.add(effFact);
                    tempState.add(effFact);
                } else {
                    tempState.remove(effFact);
                }
            }

            List<String> stateAfter = new ArrayList<>(tempState);

            Map<String, Object> traceEntry = new LinkedHashMap<>();
            traceEntry.put("action", action.getName());
            traceEntry.put("state_before", stateBefore);
            traceEntry.put("preconditions_checked", preconditionsChecked);
            traceEntry.put("missing_preconditions", missing);
            traceEntry.put("effects_applied", effectsApplied);
            traceEntry.put("state_after", stateAfter);
            trace.add(traceEntry);
        }

        // 9. Dynamic Dependency Graph generation
        List<Map<String, Object>> tasks = new ArrayList<>();
        List<Map<String, Object>> executions = new ArrayList<>();
        
        // Map resolved Action list to task maps
        Map<com.embabel.plan.Action, String> resolvedActionToId = new HashMap<>();
        int idx = 1;
        for (com.embabel.plan.Action rawAction : planActions) {
            ConditionAction action = (ConditionAction) rawAction;
            String originalId = actionToId.get(action);
            String idStr = (originalId != null) ? originalId : "T" + idx;
            resolvedActionToId.put(action, idStr);
            idx++;
        }

        idx = 1;
        for (com.embabel.plan.Action rawAction : planActions) {
            ConditionAction action = (ConditionAction) rawAction;
            Map<String, Object> task = new LinkedHashMap<>();
            String currentId = resolvedActionToId.get(action);
            task.put("id", currentId);
            
            String desc = actionToDesc.get(action);
            task.put("description", action.getName() + " - " + (desc != null ? desc : ""));
            
            String agent = actionToAgent.get(action);
            task.put("agent", agent != null ? agent : "SearchAgent");

            // Compute dynamic dependencies: find prior actions that satisfy preconditions
            List<String> deps = new ArrayList<>();
            for (int j = 0; j < idx - 1; j++) {
                com.embabel.plan.Action prevRaw = planActions.get(j);
                ConditionAction prevAction = (ConditionAction) prevRaw;
                boolean hasOverlap = false;
                for (String effect : prevAction.getEffects().keySet()) {
                    if (action.getPreconditions().containsKey(effect)) {
                        hasOverlap = true;
                        break;
                    }
                }
                if (hasOverlap) {
                    deps.add(resolvedActionToId.get(prevAction));
                }
            }
            task.put("dependencies", deps);

            System.out.println("Executing " + task.get("id") + " with " + task.get("agent") + "...");
            String agentResponse;
            try {
                agentResponse = llmService.simulateAgentExecution(task.get("agent").toString(), action.getName());
            } catch (Exception e) {
                System.err.println("PlanController: Agent simulation failed: " + e.getMessage());
                agentResponse = "Task completed by " + task.get("agent");
            }
            task.put("output", agentResponse);

            Map<String, Object> execResult = new LinkedHashMap<>();
            execResult.put("type", "MCP");
            execResult.put("agent", task.get("agent"));
            execResult.put("task", action.getName());
            execResult.put("response", Map.of("content", agentResponse));
            executions.add(execResult);

            tasks.add(task);
            idx++;
        }

        // 10. Visualizations
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
