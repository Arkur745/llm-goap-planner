package com.cps.mcp.controller;

import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.lang.reflect.Proxy;
import java.lang.reflect.Method;
import java.lang.reflect.InvocationHandler;
import com.embabel.agent.api.common.autonomy.Autonomy;
import com.embabel.agent.api.common.autonomy.AgentProcessExecution;
import com.embabel.agent.core.AgentProcess;
import com.embabel.agent.core.ProcessOptions;
import com.embabel.agent.core.ActionInvocation;
import com.embabel.agent.core.Blackboard;
import com.embabel.agent.domain.io.UserInput;

@RestController
public class PlanController {

    private final Autonomy autonomy;
    private final Blackboard blackboard;

    public PlanController(Autonomy autonomy, Blackboard blackboard) {
        this.autonomy = autonomy;
        this.blackboard = blackboard;
    }

    @PostMapping("/plan")
    public Map<String, Object> plan(@RequestBody Map<String, Object> body) {
        // Clear the shared singleton blackboard to prevent state pollution from previous requests
        try {
            blackboard.clear();
            System.out.println("PlanController: Cleared singleton blackboard");
        } catch (Exception e) {
            System.err.println("PlanController: Failed to clear blackboard: " + e.getMessage());
        }

        String goalStr = (String) body.get("goal");
        if (goalStr == null || goalStr.isBlank()) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST,
                "Goal is required"
            );
        }

        try {
            // Phase E: Classify intent for tracking/logging only
            // Planner will choose best matching goal based on action graph
            com.cps.mcp.agent.TravelIntent intent = classifyIntent(goalStr);
            System.out.println("PlanController: Classified intent=" + intent + " for goal: " + goalStr);
            
            return executeEmbabelPlanner(goalStr, intent);
        } catch (IllegalArgumentException ex) {
            System.err.println("PlanController: Validation error: " + ex.getMessage());
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST,
                ex.getMessage(),
                ex
            );
        } catch (Exception ex) {
            System.err.println("PlanController: Embabel execution failed: " + ex.getMessage());
            ex.printStackTrace();
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR,
                ex.getMessage(),
                ex
            );
        }
    }

    private com.cps.mcp.agent.TravelIntent classifyIntent(String goalStr) {
        if (goalStr == null) {
            return com.cps.mcp.agent.TravelIntent.SEARCH;
        }
        
        String normalized = goalStr.toLowerCase();
        
        // Weather intent keywords
        if (normalized.contains("weather") || normalized.contains("forecast") || 
            normalized.contains("rain") || normalized.contains("temperature") || 
            normalized.contains("sunny") || normalized.contains("climate") ||
            normalized.contains("snow") || normalized.contains("wind") ||
            normalized.contains("condition")) {
            return com.cps.mcp.agent.TravelIntent.WEATHER;
        }
        
        // Budget intent keywords
        if (normalized.contains("budget") || normalized.contains("cost") || 
            normalized.contains("price") || normalized.contains("expense") || 
            normalized.contains("estimate") || normalized.contains("how much") ||
            normalized.contains("spending") || normalized.contains("afford")) {
            return com.cps.mcp.agent.TravelIntent.BUDGET;
        }
        
        // Travel plan intent keywords
        if (normalized.contains("plan") || normalized.contains("trip") || 
            normalized.contains("vacation") || normalized.contains("itinerary") || 
            normalized.contains("weekend") || normalized.contains("holiday") ||
            normalized.contains("travel") || normalized.contains("create itinerary")) {
            return com.cps.mcp.agent.TravelIntent.TRAVEL_PLAN;
        }
        
        // Default to search for general information queries
        return com.cps.mcp.agent.TravelIntent.SEARCH;
    }

    private String mapIntentToGoal(com.cps.mcp.agent.TravelIntent intent) {
        switch (intent) {
            case WEATHER:
                return "Provide weather forecast";
            case BUDGET:
                return "Provide budget estimate";
            case SEARCH:
                return "Provide destination information";
            case TRAVEL_PLAN:
            default:
                return "Plan Travel Itinerary";
        }
    }

    private static final Set<String> FILTERED_INPUTS = Set.of(
        "provide weather forecast",
        "provide budget estimate",
        "provide destination information",
        "plan travel itinerary"
    );

    private String getUserInputContent(Object userInputObj) {
        try {
            java.lang.reflect.Method getContentMethod = userInputObj.getClass().getMethod("getContent");
            return (String) getContentMethod.invoke(userInputObj);
        } catch (Exception e) {
            return "";
        }
    }

    private boolean isFilteredUserInput(Object obj) {
        if (obj == null) return false;
        if (obj.getClass().getSimpleName().equals("UserInput")) {
            String content = getUserInputContent(obj).toLowerCase().trim();
            return FILTERED_INPUTS.contains(content);
        }
        return false;
    }

    private Blackboard createFilteringBlackboardProxy(Blackboard target, String goalStr, String mappedGoalStr) {
        return (Blackboard) Proxy.newProxyInstance(
            Blackboard.class.getClassLoader(),
            new Class<?>[]{Blackboard.class},
            new InvocationHandler() {
                private boolean isActionCaller() {
                    StackTraceElement[] stack = Thread.currentThread().getStackTrace();
                    for (StackTraceElement element : stack) {
                        String className = element.getClassName();
                        String methodName = element.getMethodName();
                        if (className.contains("com.cps.mcp.agent") || 
                            className.contains("TravelPlannerAgent") || 
                            methodName.equals("executeAction")) {
                            return true;
                        }
                    }
                    return false;
                }

                @Override
                public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
                    String methodName = method.getName();
                    System.out.println(">>> Proxy Method: " + methodName + " with args: " + java.util.Arrays.toString(args));
                    if (args != null && args.length > 0) {
                        if ("addObject".equals(methodName)) {
                            Object arg = args[0];
                            if (isFilteredUserInput(arg)) {
                                System.out.println(">>> Blackboard Proxy: Filtering out addObject for UserInput: " + arg);
                                if (method.getReturnType().equals(Blackboard.class)) {
                                    return proxy;
                                }
                                return null;
                            }
                        } else if ("bind".equals(methodName) || "bindProtected".equals(methodName)) {
                            if (args.length >= 2) {
                                Object value = args[1];
                                if (isFilteredUserInput(value)) {
                                    if (args[0] != null && "it".equals(args[0].toString())) {
                                        System.out.println(">>> Blackboard Proxy: Allowing bind/bindProtected for key \"it\" -> " + value);
                                    } else {
                                        System.out.println(">>> Blackboard Proxy: Filtering out bind/bindProtected for: " + args[0] + " -> " + value);
                                        if (method.getReturnType().equals(Blackboard.class)) {
                                            return proxy;
                                        }
                                        return null;
                                    }
                                }
                            }
                        } else if ("bindAll".equals(methodName)) {
                            Object arg = args[0];
                            if (arg instanceof java.util.Map) {
                                java.util.Map<?, ?> originalMap = (java.util.Map<?, ?>) arg;
                                java.util.Map<Object, Object> filteredMap = new java.util.LinkedHashMap<>();
                                boolean modified = false;
                                for (java.util.Map.Entry<?, ?> entry : originalMap.entrySet()) {
                                    if (isFilteredUserInput(entry.getValue())) {
                                        if (entry.getKey() != null && "it".equals(entry.getKey().toString())) {
                                            System.out.println(">>> Blackboard Proxy: Allowing bindAll entry for key \"it\" -> " + entry.getValue());
                                            filteredMap.put(entry.getKey(), entry.getValue());
                                        } else {
                                            System.out.println(">>> Blackboard Proxy: Filtering out bindAll entry: " + entry.getKey() + " -> " + entry.getValue());
                                            modified = true;
                                        }
                                    } else {
                                        filteredMap.put(entry.getKey(), entry.getValue());
                                    }
                                }
                                if (modified) {
                                    Object result = method.invoke(target, new Object[]{filteredMap});
                                    if (result == target) {
                                        return proxy;
                                    }
                                    return result;
                                }
                            }
                        } else if ("getValue".equals(methodName)) {
                            if (args.length >= 2 && args[0] != null) {
                                String key = args[0].toString();
                                if ("userInput".equals(key) || "input".equals(key)) {
                                    System.out.println(">>> Blackboard Proxy: Intercepting getValue(\"" + key + "\"), returning original prompt: " + goalStr);
                                    return new UserInput(goalStr);
                                } else if ("it".equals(key)) {
                                    if (args[1] != null && args[1].toString().contains("UserInput")) {
                                        boolean act = isActionCaller();
                                        String val = act ? goalStr : mappedGoalStr;
                                        System.out.println(">>> Blackboard Proxy: Intercepting getValue(\"it\"), isAction=" + act + ", returning: " + val);
                                        return new UserInput(val);
                                    }
                                }
                            }
                        } else if ("get".equals(methodName)) {
                            if (args.length >= 1 && args[0] != null) {
                                String key = args[0].toString();
                                if ("userInput".equals(key) || "input".equals(key)) {
                                    System.out.println(">>> Blackboard Proxy: Intercepting get(\"" + key + "\"), returning original prompt: " + goalStr);
                                    return new UserInput(goalStr);
                                } else if ("it".equals(key)) {
                                    boolean act = isActionCaller();
                                    String val = act ? goalStr : mappedGoalStr;
                                    System.out.println(">>> Blackboard Proxy: Intercepting get(\"it\"), isAction=" + act + ", returning: " + val);
                                    return new UserInput(val);
                                }
                            }
                        } else if ("last".equals(methodName)) {
                            if (args.length >= 1 && args[0] != null && args[0].toString().contains("UserInput")) {
                                boolean act = isActionCaller();
                                String val = act ? goalStr : mappedGoalStr;
                                System.out.println(">>> Blackboard Proxy: Intercepting last(), isAction=" + act + ", returning: " + val);
                                return new UserInput(val);
                            }
                        } else if ("objectsOfType".equals(methodName)) {
                            if (args.length >= 1 && args[0] != null && args[0].toString().contains("UserInput")) {
                                boolean act = isActionCaller();
                                String val = act ? goalStr : mappedGoalStr;
                                System.out.println(">>> Blackboard Proxy: Intercepting objectsOfType(), isAction=" + act + ", returning: " + val);
                                return List.of(new UserInput(val));
                            }
                        }
                    } else if (args == null || args.length == 0) {
                        if ("getObjects".equals(methodName)) {
                            List<Object> originalObjects = (List<Object>) method.invoke(target, args);
                            List<Object> modifiedObjects = new java.util.ArrayList<>();
                            boolean act = isActionCaller();
                            String val = act ? goalStr : mappedGoalStr;
                            for (Object obj : originalObjects) {
                                if (obj != null && obj.getClass().getSimpleName().equals("UserInput")) {
                                    continue;
                                }
                                modifiedObjects.add(obj);
                            }
                            modifiedObjects.add(new UserInput(val));
                            System.out.println(">>> Blackboard Proxy: Intercepting getObjects(), isAction=" + act + ", injecting: " + val);
                            return modifiedObjects;
                        }
                    }
                    Object result = method.invoke(target, args);
                    if (result == target) {
                        return proxy;
                    }
                    if (result instanceof Blackboard) {
                        System.out.println(">>> Blackboard Proxy: Wrapping returned Blackboard instance: " + result);
                        return createFilteringBlackboardProxy((Blackboard) result, goalStr, mappedGoalStr);
                    }
                    return result;
                }
            }
        );
    }

    private Map<String, Object> executeEmbabelPlanner(String goalStr, com.cps.mcp.agent.TravelIntent intent) throws Exception {
        // Map the TravelIntent to the correct terminal goal string
        String mappedGoalStr = mapIntentToGoal(intent);

        // Instantiate a fresh InMemoryBlackboard to prevent state pollution across requests
        Blackboard childBlackboard = new com.embabel.agent.core.support.InMemoryBlackboard();
        Blackboard proxyBlackboard = createFilteringBlackboardProxy(childBlackboard, goalStr, mappedGoalStr);
        proxyBlackboard.bind("userInput", new UserInput(goalStr));
        proxyBlackboard.bind("input", new UserInput(goalStr));
        proxyBlackboard.addObject(new UserInput(goalStr));

        // Create ProcessOptions using seeded proxy blackboard
        ProcessOptions options = new ProcessOptions().withBlackboard(proxyBlackboard);

        // Run autonomy with mapped terminal goal
        AgentProcessExecution execution = autonomy.chooseAndRunAgent(mappedGoalStr, options);
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
        
        // Check for any of the possible result types
        for (Object obj : process.getObjects()) {
            String simpleClassName = obj.getClass().getSimpleName();
            if ("TravelPlanReport".equals(simpleClassName) || 
                "WeatherReportResult".equals(simpleClassName) ||
                "BudgetReportResult".equals(simpleClassName) ||
                "SearchReportResult".equals(simpleClassName)) {
                finalReport = obj;
                break;
            }
        }

        if (finalReport != null) {
            summary = com.cps.mcp.util.EmbabelTraceMapper.formatOutput(finalReport);
        } else {
            Object output = execution.getOutput();
            summary = output != null ? output.toString() : "";
        }

        // Restored compliance with stable 8-field response contract (no classifiedIntent)
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("goal", goalStr);
        response.put("summary", summary);
        response.put("status", "Ready");
        response.put("steps", steps);
        response.put("assignments", new ArrayList<>());
        response.put("flowchart", mermaidDiagram);
        response.put("gantt", "");
        response.put("classification", "embabel_runtime");
        response.put("trace", trace);

        return response;
    }
}