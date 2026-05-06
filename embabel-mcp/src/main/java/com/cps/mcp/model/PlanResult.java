package com.cps.mcp.model;

import java.util.List;
import java.util.Map;

public class PlanResult {
    private List<Action> plan;
    private List<Map<String, Object>> trace;

    public PlanResult(List<Action> plan, List<Map<String, Object>> trace) {
        this.plan = plan;
        this.trace = trace;
    }

    public List<Action> getPlan() {
        return plan;
    }

    public List<Map<String, Object>> getTrace() {
        return trace;
    }
}
