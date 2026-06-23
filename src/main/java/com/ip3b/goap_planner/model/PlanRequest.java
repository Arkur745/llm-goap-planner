package com.ip3b.goap_planner.model;

import java.util.List;

public record PlanRequest(String goal, List<String> tools, String provider, String runtime) {
    public PlanRequest(String goal, List<String> tools, String provider) {
        this(goal, tools, provider, "embabel");
    }
    public PlanRequest(String goal, List<String> tools) {
        this(goal, tools, "auto", "embabel");
    }
}