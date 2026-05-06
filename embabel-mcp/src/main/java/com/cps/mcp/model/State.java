package com.cps.mcp.model;

import java.util.HashSet;
import java.util.Set;

public class State {
    private Set<String> facts = new HashSet<>();

    public void add(String fact) {
        facts.add(fact);
    }

    public boolean has(String fact) {
        return facts.contains(fact);
    }

    public String get(String prefix) {
        for (String fact : facts) {
            if (fact.startsWith(prefix)) {
                return fact.substring(prefix.length());
            }
        }
        return null;
    }

    public Set<String> getFacts() {
        return new HashSet<>(facts);
    }
}