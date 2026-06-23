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
public class EmbabelDefaultRuntimeTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @org.springframework.boot.test.mock.mockito.MockBean
    private com.embabel.agent.api.common.autonomy.Autonomy autonomy;

    @org.springframework.boot.test.mock.mockito.MockBean
    private com.cps.mcp.weather.provider.WeatherProvider weatherProvider;

    @org.junit.jupiter.api.BeforeEach
    public void setupMocks() throws Exception {
        // Weather Mock
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

    private void stubAutonomySuccess() throws Exception {
        com.embabel.agent.core.AgentProcess mockProcess = org.mockito.Mockito.mock(com.embabel.agent.core.AgentProcess.class);
        
        org.mockito.Mockito.when(mockProcess.getHistory()).thenReturn(List.of(
            new com.embabel.agent.core.ActionInvocation(
                "com.cps.mcp.agent.TravelPlannerAgent.extractDestination",
                java.time.Instant.now(),
                java.time.Duration.ofMillis(10)
            )
        ));

        com.cps.mcp.agent.TravelPlannerAgent.Destination mockDest = new com.cps.mcp.agent.TravelPlannerAgent.Destination("Prague");
        com.cps.mcp.agent.TravelPlannerAgent.TravelPlanReport mockReport = new com.cps.mcp.agent.TravelPlannerAgent.TravelPlanReport("Mock Trip Plan");

        org.mockito.Mockito.when(mockProcess.getObjects()).thenReturn(List.of(mockDest, mockReport));
        org.mockito.Mockito.when(mockProcess.last(org.mockito.Mockito.any(Class.class))).thenAnswer(inv -> {
            Class<?> clazz = inv.getArgument(0);
            if (clazz.getSimpleName().equals("Destination")) {
                return mockDest;
            }
            if (clazz.getSimpleName().equals("TravelPlanReport")) {
                return mockReport;
            }
            return null;
        });

        org.mockito.Mockito.when(mockProcess.getStatus()).thenReturn(null);
        org.mockito.Mockito.when(mockProcess.getRunningTime()).thenReturn(java.time.Duration.ofMillis(50));

        com.embabel.agent.api.common.autonomy.AgentProcessExecution mockExecution = org.mockito.Mockito.mock(com.embabel.agent.api.common.autonomy.AgentProcessExecution.class);
        org.mockito.Mockito.when(mockExecution.getAgentProcess()).thenReturn(mockProcess);
        org.mockito.Mockito.when(mockExecution.getOutput()).thenReturn("Mock Trip Plan");

        org.mockito.Mockito.when(autonomy.chooseAndRunAgent(org.mockito.Mockito.anyString(), org.mockito.Mockito.any()))
            .thenReturn(mockExecution);
    }

    private void stubAutonomyFailure() throws Exception {
        org.mockito.Mockito.when(autonomy.chooseAndRunAgent(org.mockito.Mockito.anyString(), org.mockito.Mockito.any()))
            .thenThrow(new RuntimeException("Simulated Embabel Runtime Failure"));
    }

    @Test
    @SuppressWarnings("unchecked")
    public void testEmbabelDefaultExecution() throws Exception {
        stubAutonomySuccess();
        Map<String, String> request = Map.of("goal", "Plan a weekend in Prague");

        MvcResult result = mockMvc.perform(post("/plan")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn();

        String json = result.getResponse().getContentAsString();
        Map<String, Object> response = objectMapper.readValue(json, Map.class);
        assertEquals("embabel_runtime", response.get("classification"));
        assertEquals("EMBABEL", response.get("source"));
        assertEquals("COMPLETED", response.get("status"));
    }

    @Test
    public void testFallbackMechanism() throws Exception {
        stubAutonomyFailure();
        Map<String, String> request = Map.of("goal", "Plan a weekend in Prague");

        mockMvc.perform(post("/plan")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isInternalServerError());
    }
}
