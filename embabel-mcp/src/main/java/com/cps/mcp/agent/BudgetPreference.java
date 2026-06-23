package com.cps.mcp.agent;

public class BudgetPreference {
    public enum BudgetPrefValue {
        BUDGET, STANDARD, LUXURY
    }

    private final BudgetPrefValue value;

    public BudgetPreference(BudgetPrefValue value) {
        this.value = value;
    }

    public BudgetPrefValue value() {
        return value;
    }

    @Override
    public String toString() {
        return value.name();
    }
}
