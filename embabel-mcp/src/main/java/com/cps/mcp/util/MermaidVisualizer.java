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
        sb.append("    title Project Plan\n");
        sb.append("    dateFormat YYYY-MM-DD\n");
        sb.append("    axisFormat %b %d\n");
        sb.append("    section Tasks\n");

        int dayOffset = 0;
        for (Map<String, Object> task : tasks) {
            String id = (String) task.get("id");
            String desc = ((String) task.get("description")).replace(":", "");
            // Build a real date: 2024-01-01 + dayOffset
            java.time.LocalDate start = java.time.LocalDate.of(2024, 1, 1).plusDays(dayOffset);
            sb.append(String.format("    %s : %s, %s, 2d\n", desc, id, start));
            dayOffset += 2;
        }

        return sb.toString();
    }
}
