package com.cps.mcp.embabel_mcp;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.embabel.agent.api.common.autonomy.Autonomy;
import com.embabel.agent.api.common.autonomy.AgentProcessExecution;
import com.embabel.agent.core.ProcessOptions;
import com.cps.mcp.agent.TravelPlannerAgent;

/**
 * Capability boundary validation tests.
 * Assures that travel plans produced by the Embabel runtime do not hallucinate
 * completion of transactional capabilities (booking flights, reserving
 * hotels/venues,
 * making payments, or scheduling invitations) that the platform cannot perform.
 */
@SpringBootTest(properties = {
        "embabel.llm.provider=openai",
        "embabel.models.default-llm=gpt-4.1-mini",
        "embabel.search.provider=mock"
})
public class CapabilityBoundaryTests {

    @org.springframework.boot.test.context.TestConfiguration
    static class TestConfig implements org.springframework.beans.factory.support.BeanDefinitionRegistryPostProcessor {
        @Override
        public void postProcessBeanDefinitionRegistry(
                org.springframework.beans.factory.support.BeanDefinitionRegistry registry) {
            if (registry.containsBeanDefinition("llmService")) {
                registry.removeBeanDefinition("llmService");
            }
        }

        @Override
        public void postProcessBeanFactory(
                org.springframework.beans.factory.config.ConfigurableListableBeanFactory beanFactory) {
        }
    }

    @Autowired
    private Autonomy autonomy;

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
                    com.cps.mcp.weather.model.WeatherReport.WeatherSeverity.GOOD);
        });
    }

    @Test
    public void verifyNoTransactionHallucinations() throws Exception {
        String[] testGoals = {
                "Plan a weekend in Rome",
                "Plan a 5 day trip to Tokyo",
                "Travel to Berlin next month",
                "Plan a budget trip in Vienna"
        };

        for (String goal : testGoals) {
            AgentProcessExecution execution = autonomy.chooseAndRunAgent(goal, new ProcessOptions());
            assertNotNull(execution, "Execution should succeed");

            TravelPlannerAgent.TravelPlanReport report = (TravelPlannerAgent.TravelPlanReport) execution.getOutput();
            assertNotNull(report, "Plan report should be generated");
            String output = report.content().toLowerCase();

            // Assert that Capability Boundaries are strictly respected:
            // Prohibited terms of external transaction completions:
            assertFalse(output.contains("booked flight"), "Should not claim booking flights: " + goal);
            assertFalse(output.contains("reserved hotel"), "Should not claim reserving hotels: " + goal);
            assertFalse(output.contains("payment completed"), "Should not claim payment completed: " + goal);
            assertFalse(output.contains("ticket purchased"), "Should not claim tickets purchased: " + goal);
            assertFalse(output.contains("calendar booked"), "Should not claim calendar booked: " + goal);
            assertFalse(output.contains("invitation sent"), "Should not claim invitations sent: " + goal);
            assertFalse(output.contains("venue reserved"), "Should not claim venue reserved: " + goal);
        }
    }
}
