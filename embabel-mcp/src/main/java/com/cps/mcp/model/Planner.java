package com.cps.mcp.model;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Planner {

    public PlanResult plan(State initialState, Goal goal, List<Action> actions) {
        State currentState = new State();
        for (String fact : initialState.getFacts()) {
            currentState.add(fact);
        }

        List<Action> plan = new ArrayList<>();
        List<Map<String, Object>> trace = new ArrayList<>();
        int maxIterations = 10;

        for (int i = 0; i < maxIterations; i++) {
            if (isGoalSatisfied(currentState, goal)) {
                break;
            }

            Action nextAction = findAction(currentState, actions, goal);
            if (nextAction == null) {
                break; // No action found
            }

            // Capture state before
            List<String> stateBefore = new ArrayList<>(currentState.getFacts());

            nextAction.apply(currentState);
            plan.add(nextAction);

            // Capture state after
            List<String> stateAfter = new ArrayList<>(currentState.getFacts());

            // Add trace entry
            Map<String, Object> traceEntry = new HashMap<>();
            traceEntry.put("action", nextAction.getName());
            traceEntry.put("state_before", stateBefore);
            traceEntry.put("state_after", stateAfter);
            trace.add(traceEntry);
        }

        return new PlanResult(plan, trace);
    }

    private boolean isGoalSatisfied(State state, Goal goal) {
        for (String condition : goal.getRequiredConditions()) {
            if (!state.has(condition)) {
                return false;
            }
        }
        return true;
    }

    private Action findAction(State state, List<Action> actions, Goal goal) {
        Action bestAction = null;
        int bestScore = -1;
        Action fallbackAction = null;

        for (Action action : actions) {
            if (!action.canExecute(state)) {
                continue;
            }

            // Check if action produces any new state
            // If it doesn't change the state, it's a redundant step
            boolean hasNewEffect = false;
            for (String effect : action.getEffects()) {
                if (!state.has(effect)) {
                    hasNewEffect = true;
                    break;
                }
            }
            if (!hasNewEffect) continue;

            // Score: number of action effects that match goal requirements
            int score = 0;
            for (String effect : action.getEffects()) {
                if (goal.getRequiredConditions().contains(effect)) {
                    score++;
                }
            }

            // Prefer actions that directly contribute to goal
            if (score > bestScore) {
                bestScore = score;
                bestAction = action;
            }

            // Store first action with new effects as fallback
            if (fallbackAction == null && hasNewEffect) {
                fallbackAction = action;
            }
        }

        // If no action directly helps goal, use fallback
        if (bestAction == null && fallbackAction != null) {
            return fallbackAction;
        }

        return bestAction;
    }
}