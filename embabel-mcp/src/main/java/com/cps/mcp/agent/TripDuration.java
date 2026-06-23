package com.cps.mcp.agent;

public class TripDuration {
    private final int days;

    public TripDuration(int days) {
        this.days = days;
    }

    public int days() {
        return days;
    }

    @Override
    public String toString() {
        return String.valueOf(days);
    }
}
