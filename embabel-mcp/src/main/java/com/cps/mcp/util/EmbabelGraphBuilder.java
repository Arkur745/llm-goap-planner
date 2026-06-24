package com.cps.mcp.util;

import com.embabel.agent.api.annotation.Action;
import java.lang.reflect.Method;
import java.util.*;

public class EmbabelGraphBuilder {

    public static String generateMermaidDiagram(Class<?> agentClass) {
        if (agentClass == null) {
            return "flowchart TD";
        }
        
        StringBuilder sb = new StringBuilder();
        sb.append("flowchart TD\n");

        List<Method> actionMethods = new ArrayList<>();
        Map<String, String> methodLabels = new HashMap<>();
        
        for (Method method : agentClass.getDeclaredMethods()) {
            if (method.isAnnotationPresent(Action.class)) {
                actionMethods.add(method);
                // Convert method name to readable label (camelCase to Title Case)
                String label = toReadableLabel(method.getName());
                methodLabels.put(method.getName(), label);
            }
        }

        // Sort action methods by name to ensure stable, deterministic edge order
        actionMethods.sort(Comparator.comparing(Method::getName));

        // Add node definitions with labels
        for (Method method : actionMethods) {
            String methodName = method.getName();
            String label = methodLabels.get(methodName);
            sb.append("  ").append(methodName).append("[\"").append(label).append("\"]\n");
        }
        
        // Add edges
        for (Method a : actionMethods) {
            Class<?> returnType = a.getReturnType();
            if (returnType == void.class || returnType == Void.class) {
                continue;
            }
            for (Method b : actionMethods) {
                for (Class<?> paramType : b.getParameterTypes()) {
                    if (paramType.isAssignableFrom(returnType)) {
                        sb.append("  ").append(a.getName()).append(" --> ").append(b.getName()).append("\n");
                    }
                }
            }
        }
        
        return sb.toString().trim();
    }
    
    private static String toReadableLabel(String methodName) {
        StringBuilder label = new StringBuilder();
        for (int i = 0; i < methodName.length(); i++) {
            char c = methodName.charAt(i);
            if (i > 0 && Character.isUpperCase(c)) {
                label.append(" ");
            }
            label.append(c);
        }
        // Capitalize first letter
        String result = label.toString();
        if (!result.isEmpty()) {
            result = result.substring(0, 1).toUpperCase() + result.substring(1);
        }
        return result;
    }
}
