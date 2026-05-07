package com.cps.mcp.util;

import java.util.*;

public class MermaidVisualizer {

    public static String generateFlowchart(List<Map<String, Object>> tasks) {
        if (tasks == null || tasks.isEmpty()) return "";
        
        StringBuilder sb = new StringBuilder("graph TD\n");
        sb.append("START((\"Start\"))\n");
        sb.append("END((\"End\"))\n");

        Set<String> allIds = new HashSet<>();
        Set<String> dependedOn = new HashSet<>();

        for (Map<String, Object> task : tasks) {
            String id = (String) task.get("id");
            String desc = ((String) task.get("description")).replace("\"", "");
            allIds.add(id);
            sb.append(String.format("%s[\"%s\"]\n", id, desc));

            List<String> deps = (List<String>) task.get("dependencies");
            if (deps == null || deps.isEmpty()) {
                sb.append(String.format("START --> %s\n", id));
            } else {
                for (String dep : deps) {
                    sb.append(String.format("%s --> %s\n", dep, id));
                    dependedOn.add(dep);
                }
            }
        }

        for (String id : allIds) {
            if (!dependedOn.contains(id)) {
                sb.append(String.format("%s --> END\n", id));
            }
        }

        sb.append("classDef default fill:#eef,stroke:#88a,stroke-width:1px;");
        return sb.toString();
    }

    public static String generateGantt(List<Map<String, Object>> tasks) {
        if (tasks == null || tasks.isEmpty()) return "";

        StringBuilder sb = new StringBuilder("gantt\n");
        sb.append("    title Execution Timeline\n");
        sb.append("    dateFormat YYYY-MM-DD\n");
        sb.append("    axisFormat %b %d\n");
        sb.append("    tickInterval 1day\n");
        sb.append("    excludes weekends\n");

        // Group tasks by agent for section headers
        java.util.LinkedHashMap<String, java.util.List<Map<String, Object>>> grouped = new java.util.LinkedHashMap<>();
        for (Map<String, Object> task : tasks) {
            String agent = task.containsKey("agent") ? task.get("agent").toString() : "General";
            grouped.computeIfAbsent(agent, k -> new java.util.ArrayList<>()).add(task);
        }

        String prevId = null;
        for (var entry : grouped.entrySet()) {
            sb.append("    section ").append(sanitizeLabel(entry.getKey())).append("\n");
            for (Map<String, Object> task : entry.getValue()) {
                String id = (String) task.get("id");
                String desc = sanitizeLabel((String) task.get("description"));
                // Truncate long labels to 40 chars
                if (desc.length() > 40) desc = desc.substring(0, 37) + "...";

                if (prevId == null) {
                    java.time.LocalDate start = java.time.LocalDate.of(2024, 1, 1);
                    sb.append(String.format("    %s : %s, %s, 3d\n", desc, id, start));
                } else {
                    sb.append(String.format("    %s : %s, after %s, 3d\n", desc, id, prevId));
                }
                prevId = id;
            }
        }

        return sb.toString();
    }

    private static String sanitizeLabel(String value) {
        if (value == null) return "Task";
        return value.replace(":", "").replace(";", "").replace("#", "").replace("\"", "'");
    }
}
