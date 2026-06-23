package com.cps.mcp.agent;

public class TravelConstraints {
    private final TripDuration duration;
    private final BudgetPreference budgetPreference;
    private final TravelStyle travelStyle;

    public TravelConstraints(TripDuration duration, BudgetPreference budgetPreference, TravelStyle travelStyle) {
        this.duration = duration;
        this.budgetPreference = budgetPreference;
        this.travelStyle = travelStyle;
    }

    public TripDuration duration() {
        return duration;
    }

    public BudgetPreference budgetPreference() {
        return budgetPreference;
    }

    public TravelStyle travelStyle() {
        return travelStyle;
    }

    @Override
    public String toString() {
        return String.format("Duration: %s days, Budget: %s, Style: %s", duration, budgetPreference, travelStyle);
    }
}
