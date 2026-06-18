package com.cps.mcp.util;

import com.embabel.agent.core.AgentProcess;
import com.embabel.agent.core.ActionInvocation;
import com.embabel.agent.api.annotation.Action;
import java.lang.reflect.Method;
import java.util.*;

public class EmbabelTraceMapper {

    public static List<Map<String, Object>> mapSteps(Class<?> agentClass, AgentProcess process) {
        List<Map<String, Object>> steps = new ArrayList<>();
        List<ActionInvocation> history = process.getHistory();
        int order = 1;
        for (ActionInvocation inv : history) {
            String fullName = inv.getActionName();
            int lastDot = fullName.lastIndexOf('.');
            String className = fullName.substring(0, lastDot);
            String methodName = fullName.substring(lastDot + 1);

            Class<?> declaringClass = agentClass;
            try {
                declaringClass = Class.forName(className);
            } catch (ClassNotFoundException e) {
                // fallback
            }

            Method actionMethod = findActionMethod(declaringClass, methodName);
            String details = "Embabel Action";
            if (actionMethod != null && actionMethod.isAnnotationPresent(Action.class)) {
                details = actionMethod.getAnnotation(Action.class).description();
            }

            Object producedObj = null;
            if (actionMethod != null) {
                Class<?> returnType = actionMethod.getReturnType();
                if (returnType != void.class && returnType != Void.class) {
                    producedObj = process.last(returnType);
                }
            }

            String outputStr = formatOutput(producedObj);

            Map<String, Object> step = new LinkedHashMap<>();
            step.put("order", order++);
            step.put("title", methodName);
            step.put("details", details);
            step.put("agent", declaringClass.getSimpleName());
            step.put("output", outputStr);
            steps.add(step);
        }
        return steps;
    }

    public static List<Map<String, Object>> mapTrace(Class<?> agentClass, AgentProcess process) {
        List<Map<String, Object>> traceList = new ArrayList<>();
        List<ActionInvocation> history = process.getHistory();
        
        Set<String> rollingState = new LinkedHashSet<>();
        rollingState.add("UserInput");

        for (ActionInvocation inv : history) {
            String fullName = inv.getActionName();
            int lastDot = fullName.lastIndexOf('.');
            String className = fullName.substring(0, lastDot);
            String methodName = fullName.substring(lastDot + 1);

            Class<?> declaringClass = agentClass;
            try {
                declaringClass = Class.forName(className);
            } catch (ClassNotFoundException e) {
                // fallback
            }

            Method actionMethod = findActionMethod(declaringClass, methodName);
            List<String> preconditionsChecked = new ArrayList<>();
            List<String> effectsApplied = new ArrayList<>();

            if (actionMethod != null) {
                for (Class<?> param : actionMethod.getParameterTypes()) {
                    preconditionsChecked.add(param.getSimpleName());
                }
                Class<?> returnType = actionMethod.getReturnType();
                if (returnType != void.class && returnType != Void.class) {
                    effectsApplied.add(returnType.getSimpleName());
                }
            }

            List<String> stateBefore = new ArrayList<>(rollingState);

            List<String> missingPreconditions = new ArrayList<>();
            for (String pre : preconditionsChecked) {
                if (!rollingState.contains(pre)) {
                    missingPreconditions.add(pre);
                }
            }

            rollingState.addAll(effectsApplied);

            List<String> stateAfter = new ArrayList<>(rollingState);

            Map<String, Object> traceEntry = new LinkedHashMap<>();
            traceEntry.put("action", methodName);
            traceEntry.put("state_before", stateBefore);
            traceEntry.put("preconditions_checked", preconditionsChecked);
            traceEntry.put("missing_preconditions", missingPreconditions);
            traceEntry.put("effects_applied", effectsApplied);
            traceEntry.put("state_after", stateAfter);
            traceList.add(traceEntry);
        }
        return traceList;
    }

    public static String formatOutput(Object obj) {
        if (obj == null) {
            return "";
        }
        
        String simpleName = obj.getClass().getSimpleName();

        if ("Destination".equals(simpleName)) {
            try {
                return (String) obj.getClass().getMethod("name").invoke(obj);
            } catch (Exception e) {
                try {
                    return (String) obj.getClass().getMethod("getName").invoke(obj);
                } catch (Exception ex) {
                    return obj.toString();
                }
            }
        }

        if ("TravelPlanReport".equals(simpleName)) {
            try {
                return (String) obj.getClass().getMethod("content").invoke(obj);
            } catch (Exception e) {
                try {
                    return (String) obj.getClass().getMethod("getContent").invoke(obj);
                } catch (Exception ex) {
                    return obj.toString();
                }
            }
        }

        if (obj instanceof com.cps.mcp.search.model.SearchResponse) {
            com.cps.mcp.search.model.SearchResponse sr = (com.cps.mcp.search.model.SearchResponse) obj;
            StringBuilder sb = new StringBuilder();
            sb.append("Provider: ").append(sr.getProvider()).append(", Query: ").append(sr.getQuery()).append("\n");
            for (com.cps.mcp.search.model.SearchResult r : sr.getResults()) {
                sb.append("- ").append(r.getTitle()).append(" (").append(r.getUrl()).append("): ").append(r.getContent()).append("\n");
            }
            return sb.toString().trim();
        }

        if (obj instanceof com.cps.mcp.weather.model.WeatherReport) {
            com.cps.mcp.weather.model.WeatherReport wr = (com.cps.mcp.weather.model.WeatherReport) obj;
            return String.format("Location: %s\nCondition: %s\nTemperature: %.1f°C\nHumidity: %.1f%%\nWind Speed: %.1f km/h\nSeverity: %s\nProvider: %s",
                wr.getLocation(), wr.getCondition(), wr.getTemperature(), wr.getHumidity(), wr.getWindSpeed(), wr.getSeverity(), wr.getProvider());
        }

        if (obj instanceof com.cps.mcp.budget.model.BudgetEstimate) {
            com.cps.mcp.budget.model.BudgetEstimate be = (com.cps.mcp.budget.model.BudgetEstimate) obj;
            StringBuilder sb = new StringBuilder();
            sb.append("Destination: ").append(be.getDestination()).append("\n");
            sb.append("Duration: ").append(be.getDays()).append(" days\n");
            sb.append("Total Estimate: ").append(be.getTotalEstimate()).append("\n");
            if (be.getBreakdown() != null && be.getBreakdown().getItems() != null) {
                sb.append("Breakdown:\n");
                for (com.cps.mcp.budget.model.BudgetItem item : be.getBreakdown().getItems()) {
                    sb.append("  * ").append(item.getName()).append(": ").append(item.getAmount()).append("\n");
                }
            }
            return sb.toString().trim();
        }

        return obj.toString();
    }

    private static Method findActionMethod(Class<?> declaringClass, String methodName) {
        if (declaringClass == null) return null;
        for (Method m : declaringClass.getDeclaredMethods()) {
            if (m.getName().equals(methodName)) {
                return m;
            }
        }
        return null;
    }
}
