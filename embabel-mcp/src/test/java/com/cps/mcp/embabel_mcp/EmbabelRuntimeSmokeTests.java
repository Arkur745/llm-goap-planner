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
public class EmbabelRuntimeSmokeTests {

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
    public void testEmbabelRuntimeEndpoint() throws Exception {
        Map<String, String> request = Map.of("goal", "Plan a weekend in Prague");

        MvcResult result = mockMvc.perform(post("/plan")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn();

        String json = result.getResponse().getContentAsString();
        System.out.println("--- Raw Response from POST /plan ---");
        System.out.println(json);

        Map<?, ?> response = objectMapper.readValue(json, Map.class);
        assertEquals("Plan a weekend in Prague", response.get("goal"));
        assertEquals("embabel_runtime", response.get("classification"));
        assertEquals("COMPLETED", response.get("status"));
        assertEquals("EMBABEL", response.get("source"));

        assertNotNull(response.get("summary"), "Summary should not be null");
        assertTrue(response.get("summary").toString().contains("TRIP PLAN: Prague"), "Summary should contain Prague travel report content");

        // Verify exactly the 8 stable response contract keys are returned
        assertEquals(8, response.size(), "Response map should contain exactly 8 keys");
        assertTrue(response.containsKey("goal"));
        assertTrue(response.containsKey("classification"));
        assertTrue(response.containsKey("status"));
        assertTrue(response.containsKey("steps"));
        assertTrue(response.containsKey("trace"));
        assertTrue(response.containsKey("mermaidDiagram"));
        assertTrue(response.containsKey("summary"));
        assertTrue(response.containsKey("source"));
    }
}
