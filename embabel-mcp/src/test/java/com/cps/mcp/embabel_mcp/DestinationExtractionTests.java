package com.cps.mcp.embabel_mcp;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import com.cps.mcp.agent.TravelPlannerAgent;
import com.embabel.agent.domain.io.UserInput;

/**
 * Unit test suite specifically validating dynamic, deterministic
 * destination extraction from goal prompts.
 */
public class DestinationExtractionTests {

    private final TravelPlannerAgent agent = new TravelPlannerAgent(null, null, null);

    private String extract(String prompt) {
        UserInput input = new UserInput(prompt);
        TravelPlannerAgent.Destination dest = agent.extractDestination(input);
        return dest.name();
    }

    @Test
    public void testRomeExtraction() {
        assertEquals("Rome", extract("Plan a weekend in Rome"));
    }

    @Test
    public void testParisExtraction() {
        assertEquals("Paris", extract("Plan a trip to Paris"));
    }

    @Test
    public void testBerlinExtraction() {
        assertEquals("Berlin", extract("Travel to Berlin next month"));
    }

    @Test
    public void testViennaExtraction() {
        assertEquals("Vienna", extract("Plan a budget trip in Vienna"));
    }

    @Test
    public void testMultiWordExtraction() {
        assertEquals("New York", extract("Plan a trip to New York next week"));
        assertEquals("San Francisco", extract("Plan a weekend in San Francisco"));
        assertEquals("Rio de Janeiro", extract("Travel to Rio de Janeiro in winter"));
        assertEquals("Los Angeles", extract("Plan a 5 day trip to Los Angeles"));
    }

    @Test
    public void testDirectDestination() {
        assertEquals("Rome", extract("Rome"));
        assertEquals("San Francisco", extract("San Francisco"));
    }

    @Test
    public void testInvalidExtractionFails() {
        assertThrows(IllegalArgumentException.class, () -> {
            extract("Help me");
        });
        assertThrows(IllegalArgumentException.class, () -> {
            extract("Plan a trip");
        });
        assertThrows(IllegalArgumentException.class, () -> {
            extract("");
        });
        assertThrows(NullPointerException.class, () -> {
            extract(null);
        });
        assertThrows(NullPointerException.class, () -> {
            agent.extractDestination(null);
        });
    }
}
