package com.cps.mcp.agent;

public class TravelStyle {
    public enum TravelStyleValue {
        FAMILY, SOLO, ADVENTURE, BUSINESS, LEISURE
    }

    private final TravelStyleValue value;

    public TravelStyle(TravelStyleValue value) {
        this.value = value;
    }

    public TravelStyleValue value() {
        return value;
    }

    @Override
    public String toString() {
        return value.name();
    }
}
