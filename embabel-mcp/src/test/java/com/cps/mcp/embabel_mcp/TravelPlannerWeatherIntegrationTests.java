package com.cps.mcp.embabel_mcp;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

import com.embabel.agent.core.ProcessOptions;
import com.embabel.agent.api.common.autonomy.Autonomy;
import com.embabel.agent.api.common.autonomy.AgentProcessExecution;
import com.cps.mcp.agent.TravelPlannerAgent;
import com.cps.mcp.weather.model.WeatherReport;
import com.cps.mcp.weather.model.WeatherReport.WeatherSeverity;
import com.cps.mcp.weather.provider.WeatherProvider;

@SpringBootTest(properties = {
        "embabel.llm.provider=openai",
        "embabel.models.default-llm=gpt-4.1-mini",
        "embabel.search.provider=mock"
})
public class TravelPlannerWeatherIntegrationTests {

    private static final Logger logger = LoggerFactory.getLogger(TravelPlannerWeatherIntegrationTests.class);

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

    @MockBean
    private WeatherProvider weatherProvider;

    @Test
    public void testWeatherPlannerIntegrationFlow() throws Exception {
        String destination = "Prague";
        String goal = "Plan a weekend in Prague";

        when(weatherProvider.getName()).thenReturn("open-meteo");

        WeatherReport mockWeatherReport = new WeatherReport(
                destination, 15.5, "Partly Cloudy", 75.0, 18.2,
                System.currentTimeMillis(), "open-meteo", WeatherSeverity.GOOD);
        when(weatherProvider.getWeather(eq(destination))).thenReturn(mockWeatherReport);

        logger.info("Executing autonomy process for: {}", goal);
        AgentProcessExecution execution = autonomy.chooseAndRunAgent(goal, new ProcessOptions());
        assertNotNull(execution, "Execution should not be null");

        TravelPlannerAgent.TravelPlanReport report = (TravelPlannerAgent.TravelPlanReport) execution.getOutput();
        assertNotNull(report, "Plan report should not be null");
        String output = report.content();
        logger.info("Generated Travel Plan Output:\n{}", output);

        // Assert weather info in the final report
        assertTrue(output.contains("TRIP PLAN: Prague"), "Output should contain destination Prague");
        assertTrue(output.contains("[4] Weather Forecast"), "Output should contain weather forecast section");
        assertTrue(output.contains("Location: Prague"), "Output should contain weather location");
        assertTrue(output.contains("Condition: Partly Cloudy"), "Output should contain weather condition");
        assertTrue(output.contains("Temperature: 15.5°C"), "Output should contain weather temperature");
        assertTrue(output.contains("Severity: GOOD"), "Output should contain weather severity");

        verify(weatherProvider, times(1)).getWeather(eq(destination));
    }
}
