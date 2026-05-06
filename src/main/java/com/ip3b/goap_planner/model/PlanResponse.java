package com.ip3b.goap_planner.model;

import java.time.Instant;
import java.util.List;

public record PlanResponse(
        String goal,
        String summary,
        String status,
        List<PlanStep> steps,
        List<PlanAssignment> assignments,
        String mermaidDiagram,
        String ganttDiagram,
        String source,
        Instant generatedAt) {
}