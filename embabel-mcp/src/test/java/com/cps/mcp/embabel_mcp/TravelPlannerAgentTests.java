package com.cps.mcp.embabel_mcp;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.embabel.agent.core.AgentPlatform;
import com.embabel.agent.core.ProcessOptions;
import com.embabel.agent.api.common.autonomy.Autonomy;
import com.embabel.agent.api.common.autonomy.AgentProcessExecution;
import com.cps.mcp.agent.TravelPlannerAgent;

/**
 * Verification test suite for TravelPlannerAgent.
 * Overrides the active LLM provider properties to use the DummyLlmService test infrastructure.
 */
@SpringBootTest(properties = {
    "embabel.llm.provider=openai",
    "embabel.models.default-llm=gpt-4.1-mini",
    "embabel.search.provider=mock"
})
public class TravelPlannerAgentTests {

    private static final Logger logger = LoggerFactory.getLogger(TravelPlannerAgentTests.class);

    // Dynamic test context configuration to remove the production LlmService bean
    // so that the DummyLlmService bean (from test/java/.../EmbabelTestConfig) is resolved as primary.
    @org.springframework.boot.test.context.TestConfiguration
    static class TestConfig implements org.springframework.beans.factory.support.BeanDefinitionRegistryPostProcessor {
        @Override
        public void postProcessBeanDefinitionRegistry(org.springframework.beans.factory.support.BeanDefinitionRegistry registry) {
            if (registry.containsBeanDefinition("llmService")) {
                registry.removeBeanDefinition("llmService");
            }
        }
        @Override
        public void postProcessBeanFactory(org.springframework.beans.factory.config.ConfigurableListableBeanFactory beanFactory) {}
    }

    @Autowired
    private AgentPlatform agentPlatform;

    @Autowired
    private Autonomy autonomy;

    @Autowired
    private TravelPlannerAgent travelPlannerAgent;

    @org.springframework.boot.test.mock.mockito.MockBean
    private com.cps.mcp.weather.provider.WeatherProvider weatherProvider;

    @org.junit.jupiter.api.BeforeEach
    public void setupWeatherMock() throws Exception {
        org.mockito.Mockito.when(weatherProvider.getName()).thenReturn("open-meteo");
        org.mockito.Mockito.when(weatherProvider.getWeather(org.mockito.Mockito.anyString())).thenAnswer(invocation -> {
            String loc = invocation.getArgument(0);
            return new com.cps.mcp.weather.model.WeatherReport(
                    loc, 22.5, "Mostly Sunny", 55.0, 10.0,
                    System.currentTimeMillis(), "open-meteo",
                    com.cps.mcp.weather.model.WeatherReport.WeatherSeverity.GOOD
            );
        });
    }

    @Test
    public void testAgentRegistration() {
        // 1. Verify TravelPlannerAgent bean registration
        assertNotNull(travelPlannerAgent, "TravelPlannerAgent should be registered in the Spring Context");

        boolean agentRegistered = agentPlatform.agents().stream()
                .anyMatch(agent -> agent.getDescription().contains("Travel planner agent"));

        assertTrue(agentRegistered, "TravelPlannerAgent should be registered in the Embabel AgentPlatform");
    }

    @Test
    public void testJaipurTripPlanning() throws Exception {
        String goal = "Plan a 3-day trip to Jaipur";
        logger.info("Test starting: {}", goal);

        AgentProcessExecution execution = autonomy.chooseAndRunAgent(goal, new ProcessOptions());
        assertNotNull(execution, "Agent process execution should not be null");

        TravelPlannerAgent.TravelPlanReport report = (TravelPlannerAgent.TravelPlanReport) execution.getOutput();
        assertNotNull(report, "Plan report should not be null");
        String output = report.content();
        assertNotNull(output, "Plan output should not be null");

        // Assert structured segments are present in the composition
        assertTrue(output.contains("TRIP PLAN: Jaipur"), "Output should contain Jaipur title");
        assertTrue(output.contains("[1] Travel Summary"), "Output should contain travel summary section");
        assertTrue(output.contains("[2] Search Highlights"), "Output should contain search highlights section");
        assertTrue(output.contains("[3] Budget Estimate"), "Output should contain budget estimate section");
        assertTrue(output.contains("[4] Weather Forecast"), "Output should contain weather forecast section");

        // Verify cost calculation accuracy: 3 days * (100 + 40 + 30 + 15) = 3 * 185 = 555.00
        assertTrue(output.contains("555.00"), "Jaipur trip total budget calculation should equal 555.00");

        logger.info("Test completed successfully for: {}", goal);
    }

    @Test
    public void testPragueTripPlanning() throws Exception {
        String goal = "Plan a weekend in Prague";
        logger.info("Test starting: {}", goal);

        AgentProcessExecution execution = autonomy.chooseAndRunAgent(goal, new ProcessOptions());
        assertNotNull(execution, "Agent process execution should not be null");

        TravelPlannerAgent.TravelPlanReport report = (TravelPlannerAgent.TravelPlanReport) execution.getOutput();
        assertNotNull(report, "Plan report should not be null");
        String output = report.content();
        assertNotNull(output, "Plan output should not be null");

        assertTrue(output.contains("TRIP PLAN: Prague"), "Output should contain Prague title");
        // Verify cost calculation accuracy: 2 days * (150 + 50 + 40 + 20) = 2 * 260 = 520.00
        assertTrue(output.contains("520.00"), "Prague trip total budget calculation should equal 520.00");

        logger.info("Test completed successfully for: {}", goal);
    }

    @Test
    public void testTokyoTripPlanning() throws Exception {
        String goal = "Plan a budget trip to Tokyo";
        logger.info("Test starting: {}", goal);

        AgentProcessExecution execution = autonomy.chooseAndRunAgent(goal, new ProcessOptions());
        assertNotNull(execution, "Agent process execution should not be null");

        TravelPlannerAgent.TravelPlanReport report = (TravelPlannerAgent.TravelPlanReport) execution.getOutput();
        assertNotNull(report, "Plan report should not be null");
        String output = report.content();
        assertNotNull(output, "Plan output should not be null");

        assertTrue(output.contains("TRIP PLAN: Tokyo"), "Output should contain Tokyo title");
        // Verify cost calculation accuracy: 3 days * (120 + 60 + 50 + 25) * 0.8 = 3 * 204 = 612.00
        assertTrue(output.contains("612.00"), "Tokyo trip total budget calculation should equal 612.00");

        logger.info("Test completed successfully for: {}", goal);
    }

    @Test
    public void testRomeTripPlanning() throws Exception {
        String goal = "Plan a weekend in Rome";
        logger.info("Test starting: {}", goal);

        AgentProcessExecution execution = autonomy.chooseAndRunAgent(goal, new ProcessOptions());
        assertNotNull(execution, "Agent process execution should not be null");

        TravelPlannerAgent.TravelPlanReport report = (TravelPlannerAgent.TravelPlanReport) execution.getOutput();
        assertNotNull(report, "Plan report should not be null");
        String output = report.content();
        assertNotNull(output, "Plan output should not be null");

        assertTrue(output.contains("TRIP PLAN: Rome"), "Output should contain Rome title");
        // Verify default cost calculation: 2 days * (100 + 40 + 30 + 15) = 370.00
        assertTrue(output.contains("370.00"), "Rome trip total budget calculation should equal 370.00");

        logger.info("Test completed successfully for: {}", goal);
    }

    @Test
    public void testParisTripPlanning() throws Exception {
        String goal = "Plan a trip to Paris";
        logger.info("Test starting: {}", goal);

        AgentProcessExecution execution = autonomy.chooseAndRunAgent(goal, new ProcessOptions());
        assertNotNull(execution, "Agent process execution should not be null");

        TravelPlannerAgent.TravelPlanReport report = (TravelPlannerAgent.TravelPlanReport) execution.getOutput();
        assertNotNull(report, "Plan report should not be null");
        String output = report.content();
        assertNotNull(output, "Plan output should not be null");

        assertTrue(output.contains("TRIP PLAN: Paris"), "Output should contain Paris title");
        assertTrue(output.contains("555.00"), "Paris trip total budget calculation should equal 555.00");

        logger.info("Test completed successfully for: {}", goal);
    }

    @Test
    public void testBerlinTripPlanning() throws Exception {
        String goal = "Travel to Berlin next month";
        logger.info("Test starting: {}", goal);

        AgentProcessExecution execution = autonomy.chooseAndRunAgent(goal, new ProcessOptions());
        assertNotNull(execution, "Agent process execution should not be null");

        TravelPlannerAgent.TravelPlanReport report = (TravelPlannerAgent.TravelPlanReport) execution.getOutput();
        assertNotNull(report, "Plan report should not be null");
        String output = report.content();
        assertNotNull(output, "Plan output should not be null");

        assertTrue(output.contains("TRIP PLAN: Berlin"), "Output should contain Berlin title");
        assertTrue(output.contains("555.00"), "Berlin trip total budget calculation should equal 555.00");

        logger.info("Test completed successfully for: {}", goal);
    }

}
