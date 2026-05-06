package com.cps.mcp.model;

import java.util.List;
import com.cps.mcp.util.LLMClient;
import com.cps.mcp.util.MCPClient;

public class Action {
    private String name;
    private List<String> preconditions;
    private List<String> effects;
    private String userGoal;
    private String agent;

    public Action(String name, List<String> preconditions, List<String> effects) {
        this(name, preconditions, effects, null, "SearchAgent");
    }

    public Action(String name, List<String> preconditions, List<String> effects, String userGoal) {
        this(name, preconditions, effects, userGoal, "SearchAgent");
    }

    public Action(String name, List<String> preconditions, List<String> effects, String userGoal, String agent) {
        this.name = name;
        this.preconditions = preconditions;
        this.effects = effects;
        this.userGoal = userGoal;
        this.agent = agent;
    }

    public boolean canExecute(State state) {
        for (String pre : preconditions) {
            if (!state.has(pre)) {
                return false;
            }
        }
        return true;
    }

    public void apply(State state) {
        for (String effect : effects) {
            state.add(effect);
        }
    }

    public String getName() {
        return name;
    }

    public List<String> getPreconditions() {
        return preconditions;
    }

    public List<String> getEffects() {
        return effects;
    }

    public String getAgent() {
        return agent;
    }
}