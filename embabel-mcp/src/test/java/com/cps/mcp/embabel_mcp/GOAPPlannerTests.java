package com.cps.mcp.embabel_mcp;

import static org.junit.jupiter.api.Assertions.*;

import java.util.*;
import org.junit.jupiter.api.Test;

import com.embabel.plan.common.condition.ConditionAction;
import com.embabel.plan.common.condition.ConditionGoal;
import com.embabel.plan.common.condition.ConditionPlan;
import com.embabel.plan.common.condition.EmbabelPlanningFactory;
import com.embabel.plan.goap.astar.AStarGoapPlanner;

public class GOAPPlannerTests {

    @Test
    public void testSuccessfulGoalResolution() {
        Map<String, Boolean> initialState = new HashMap<>();

        ConditionAction action1 = EmbabelPlanningFactory.createAction("FindVenue", Map.of(), Map.of("venue_found", true));
        ConditionAction action2 = EmbabelPlanningFactory.createAction("BookVenue", Map.of("venue_found", true), Map.of("venue_booked", true));
        ConditionAction action3 = EmbabelPlanningFactory.createAction("PrepareEvent", Map.of("venue_booked", true), Map.of("event_ready", true));

        AStarGoapPlanner planner = new AStarGoapPlanner(EmbabelPlanningFactory.createDeterminer(initialState));
        ConditionGoal goal = EmbabelPlanningFactory.createGoal("Goal", Map.of("event_ready", true));
        ConditionPlan planResult = planner.planToGoal(List.of(action1, action2, action3), goal);
        List<com.embabel.plan.Action> plan = planResult.getActions();

        assertNotNull(plan);
        assertEquals(3, plan.size());
        assertEquals("FindVenue", plan.get(0).getName());
        assertEquals("BookVenue", plan.get(1).getName());
        assertEquals("PrepareEvent", plan.get(2).getName());
    }

    @Test
    public void testBranchingDependencies() {
        Map<String, Boolean> initialState = new HashMap<>();

        ConditionGoal goal = EmbabelPlanningFactory.createGoal("Goal", Map.of("venue_booked", true, "catering_ordered", true));

        ConditionAction action1 = EmbabelPlanningFactory.createAction("FindVenue", Map.of(), Map.of("venue_found", true));
        ConditionAction action2 = EmbabelPlanningFactory.createAction("BookVenue", Map.of("venue_found", true), Map.of("venue_booked", true));
        ConditionAction action3 = EmbabelPlanningFactory.createAction("OrderCatering", Map.of("venue_found", true), Map.of("catering_ordered", true));

        AStarGoapPlanner planner = new AStarGoapPlanner(EmbabelPlanningFactory.createDeterminer(initialState));
        ConditionPlan planResult = planner.planToGoal(List.of(action1, action2, action3), goal);
        List<com.embabel.plan.Action> plan = planResult.getActions();

        assertNotNull(plan);
        assertEquals(3, plan.size());
        assertEquals("FindVenue", plan.get(0).getName());
        
        Set<String> planNames = new HashSet<>(List.of(plan.get(1).getName(), plan.get(2).getName()));
        assertTrue(planNames.contains("BookVenue"));
        assertTrue(planNames.contains("OrderCatering"));
    }

    @Test
    public void testShortestRouteSelection() {
        Map<String, Boolean> initialState = new HashMap<>();

        ConditionGoal goal = EmbabelPlanningFactory.createGoal("Goal", Map.of("venue_booked", true));

        ConditionAction action1 = EmbabelPlanningFactory.createAction("FindVenue", Map.of(), Map.of("venue_found", true));
        ConditionAction action2 = EmbabelPlanningFactory.createAction("BookVenue", Map.of("venue_found", true), Map.of("venue_booked", true));
        ConditionAction action3 = EmbabelPlanningFactory.createAction("DirectBook", Map.of(), Map.of("venue_booked", true));

        AStarGoapPlanner planner = new AStarGoapPlanner(EmbabelPlanningFactory.createDeterminer(initialState));
        ConditionPlan planResult = planner.planToGoal(List.of(action1, action2, action3), goal);
        List<com.embabel.plan.Action> plan = planResult.getActions();

        assertNotNull(plan);
        assertEquals(1, plan.size());
        assertEquals("DirectBook", plan.get(0).getName());
    }

    @Test
    public void testUnsatisfiedPreconditions() {
        Map<String, Boolean> initialState = new HashMap<>();

        ConditionGoal goal = EmbabelPlanningFactory.createGoal("Goal", Map.of("venue_booked", true));
        ConditionAction action2 = EmbabelPlanningFactory.createAction("BookVenue", Map.of("venue_found", true), Map.of("venue_booked", true));

        AStarGoapPlanner planner = new AStarGoapPlanner(EmbabelPlanningFactory.createDeterminer(initialState));
        ConditionPlan planResult = planner.planToGoal(List.of(action2), goal);
        assertTrue(planResult == null || planResult.getActions().isEmpty());
    }

    @Test
    public void testUnreachableGoal() {
        Map<String, Boolean> initialState = new HashMap<>();

        ConditionGoal goal = EmbabelPlanningFactory.createGoal("Goal", Map.of("impossible_goal_fact", true));
        ConditionAction action1 = EmbabelPlanningFactory.createAction("FindVenue", Map.of(), Map.of("venue_found", true));

        AStarGoapPlanner planner = new AStarGoapPlanner(EmbabelPlanningFactory.createDeterminer(initialState));
        ConditionPlan planResult = planner.planToGoal(List.of(action1), goal);
        assertTrue(planResult == null || planResult.getActions().isEmpty());
    }
}

