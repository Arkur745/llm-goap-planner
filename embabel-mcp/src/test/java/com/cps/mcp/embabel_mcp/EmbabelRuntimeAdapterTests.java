package com.cps.mcp.embabel_mcp;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;

@SpringBootTest(properties = {
    "embabel.llm.provider=openai",
    "embabel.models.default-llm=gpt-4.1-mini",
    "embabel.search.provider=mock"
})
@AutoConfigureMockMvc
public class EmbabelRuntimeAdapterTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

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

    @Test
    @SuppressWarnings("unchecked")
    public void testEmbabelAdapterOutput() throws Exception {
        Map<String, String> request = Map.of("goal", "Plan a weekend in Prague");

        MvcResult result = mockMvc.perform(post("/plan")
                .param("runtime", "embabel")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn();

        String json = result.getResponse().getContentAsString();
        System.out.println("--- Adapted Response from POST /plan?runtime=embabel ---");
        System.out.println(json);

        Map<String, Object> response = objectMapper.readValue(json, Map.class);
        assertEquals("Plan a weekend in Prague", response.get("goal"));
        assertEquals("embabel_runtime", response.get("classification"));
        assertEquals("Ready", response.get("status"));
        assertEquals("EMBABEL", response.get("source"));

        // Retrieve steps
        List<Map<String, Object>> steps = (List<Map<String, Object>>) response.get("steps");
        assertNotNull(steps, "steps list should not be null");
        assertTrue(steps.size() > 0, "steps list should not be empty");

        // Retrieve trace
        List<Map<String, Object>> trace = (List<Map<String, Object>>) response.get("trace");
        assertNotNull(trace, "trace list should not be null");
        assertTrue(trace.size() > 0, "trace list should not be empty");

        // Retrieve embabel debug block
        Map<String, Object> embabelDebug = (Map<String, Object>) response.get("embabel");
        assertNotNull(embabelDebug, "embabel debug block should not be null");
        
        List<String> actionsExecuted = (List<String>) embabelDebug.get("actionsExecuted");
        assertNotNull(actionsExecuted, "actionsExecuted should not be null");
        
        // Assert: steps.size() == actionsExecuted.size()
        assertEquals(actionsExecuted.size(), steps.size(), "steps size should match actionsExecuted size");

        // Validate steps mapping
        for (int i = 0; i < steps.size(); i++) {
            Map<String, Object> step = steps.get(i);
            assertNotNull(step.get("order"));
            assertNotNull(step.get("title"));
            assertNotNull(step.get("details"));
            assertNotNull(step.get("agent"));
            assertNotNull(step.get("output"));
        }

        // Validate final state_after in trace contains TravelPlanReport
        Map<String, Object> lastTraceEntry = trace.get(trace.size() - 1);
        List<String> finalStateAfter = (List<String>) lastTraceEntry.get("state_after");
        assertNotNull(finalStateAfter, "final state_after should not be null");
        assertTrue(finalStateAfter.contains("TravelPlanReport"), "final state_after must contain TravelPlanReport");

        // Validate state progression classes
        boolean hasUserInput = false;
        boolean hasDestination = false;
        boolean hasSearchResponse = false;
        boolean hasWeatherReport = false;
        boolean hasBudgetEstimate = false;
        boolean hasTravelPlanReport = false;

        for (Map<String, Object> traceEntry : trace) {
            List<String> stateAfter = (List<String>) traceEntry.get("state_after");
            if (stateAfter.contains("UserInput")) hasUserInput = true;
            if (stateAfter.contains("Destination")) hasDestination = true;
            if (stateAfter.contains("SearchResponse")) hasSearchResponse = true;
            if (stateAfter.contains("WeatherReport")) hasWeatherReport = true;
            if (stateAfter.contains("BudgetEstimate")) hasBudgetEstimate = true;
            if (stateAfter.contains("TravelPlanReport")) hasTravelPlanReport = true;
        }

        assertTrue(hasUserInput, "State progression should contain UserInput");
        assertTrue(hasDestination, "State progression should contain Destination");
        assertTrue(hasSearchResponse, "State progression should contain SearchResponse");
        assertTrue(hasWeatherReport, "State progression should contain WeatherReport");
        assertTrue(hasBudgetEstimate, "State progression should contain BudgetEstimate");
        assertTrue(hasTravelPlanReport, "State progression should contain TravelPlanReport");

        // Validate Mermaid Diagram contents
        String mermaid = (String) response.get("mermaidDiagram");
        assertNotNull(mermaid, "mermaidDiagram should not be null");
        assertTrue(mermaid.contains("extractDestination"), "Mermaid should contain extractDestination");
        assertTrue(mermaid.contains("executeSearch"), "Mermaid should contain executeSearch");
        assertTrue(mermaid.contains("calculateBudget"), "Mermaid should contain calculateBudget");
        assertTrue(mermaid.contains("getWeather"), "Mermaid should contain getWeather");
        assertTrue(mermaid.contains("composeTravelPlan"), "Mermaid should contain composeTravelPlan");

        // Validate legacy flowchart key matches mermaidDiagram
        assertEquals(mermaid, response.get("flowchart"), "flowchart key should match mermaidDiagram");

        // Validate TravelPlanReport summary output is surfaced
        String summary = (String) response.get("summary");
        assertNotNull(summary, "summary should not be null");
        assertTrue(summary.contains("TRIP PLAN: Prague"), "summary should contain final travel plan content");
    }
}
