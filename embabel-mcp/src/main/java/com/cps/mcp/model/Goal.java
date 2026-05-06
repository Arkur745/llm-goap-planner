package com.cps.mcp.model;

import java.util.List;

public class Goal {
    private List<String> requiredConditions;

    public Goal(List<String> requiredConditions) {
        this.requiredConditions = requiredConditions;
    }

    public List<String> getRequiredConditions() {
        return requiredConditions;
    }
}