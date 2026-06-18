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
        for (Method method : agentClass.getDeclaredMethods()) {
            if (method.isAnnotationPresent(Action.class)) {
                actionMethods.add(method);
            }
        }

        // Sort action methods by name to ensure stable, deterministic edge order
        actionMethods.sort(Comparator.comparing(Method::getName));

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
}
