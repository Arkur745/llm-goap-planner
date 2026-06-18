# Testing Documentation and Strategy

This document details the test suites, verification strategies, and execution instructions for the Embabel MCP backend and Gateway Service.

---

## 1. Test Architecture Overview

The codebase is divided into two primary modules:
1. **Gateway Service (Root)**: Validated primarily via context loading smoke tests.
2. **Embabel MCP Backend (`embabel-mcp`)**: Features a comprehensive test suite of 63 tests covering unit tests, service integrations, and runtime REST controllers.

---

## 2. Unit Testing Structure

Unit tests execute in isolation, verifying specific domain logic, data models, or helper classes without loading the complete Spring Application Context.

* **GOAP Solver Tests (`GOAPPlannerTests.java`)**:
  Validates A* path resolution, precondition checks, state transition evaluations, and cycle detection.
* **Budget Logic Tests (`BudgetToolTests.java`)**:
  Validates deterministic calculations, day-to-day rate divisions, and object mappings.
* **Weather Tool Tests (`WeatherToolTests.java`)**:
  Validates coordinates geocoding parsers and WMO weather code normalizations.
* **Search Parsing Tests (`SearchToolTests.java`)**:
  Tests query parsing, formatting, and Tavily response data structures.

---

## 3. Integration Testing Structure

Integration tests use `@SpringBootTest` to load the Spring context, wiring real or mocked beans to verify subsystem interactions.

* **Smoke Tests (`EmbabelRuntimeSmokeTests.java`)**:
  Verifies that the Embabel runtime successfully plans and executes the full sequence of actions on the blackboard for `TravelPlannerAgent`.
* **REST API & Fallback Tests (`EmbabelDefaultRuntimeTests.java`)**:
  Uses `@AutoConfigureMockMvc` and `MockMvc` to test controller routing rules, invalid parameter rejections (HTTP 400), and automatic fallback mechanisms under simulated failures.
* **Adapter Utilities Tests (`EmbabelRuntimeAdapterTests.java`)**:
  Tests `EmbabelGraphBuilder` and `EmbabelTraceMapper` to ensure that raw runtime metrics are correctly converted to the Streamlit-compatible JSON schema.
* **External Provider Integrations**:
  * `TavilySearchPlannerIntegrationTests.java`: Integrates active search providers in the plan cycle.
  * `TravelPlannerWeatherIntegrationTests.java`: Integrates geocoding and forecast queries into the planning pipeline.

---

## 4. Provider Mocking Strategy

To keep testing suites fast, deterministic, and runnable offline, critical third-party dependencies are stubbed using mock frameworks:

### A. Weather API Mocking
The geocoding and weather lookup endpoints of the external Open-Meteo REST service are mocked to prevent HTTP timeouts:
```java
@MockBean
private WeatherProvider weatherProvider;

@BeforeEach
public void setupWeatherMock() throws Exception {
    Mockito.when(weatherProvider.getWeather(Mockito.anyString())).thenReturn(
        new WeatherReport(
            "Prague", 22.5, "Mostly Sunny", 55.0, 10.0,
            System.currentTimeMillis(), "open-meteo",
            WeatherSeverity.GOOD
        )
    );
}
```

### B. LLM Service Mocking (`DummyLlmService`)
During fallback execution tests, LLM planners are simulated using `DummyLlmService` to generate mock task dependencies without invoking live APIs. The `LLMServiceFactory` bean is stubbed to inject the dummy service.

### C. Autonomy Engine Mocking
In REST routing tests, the `Autonomy` bean is mocked to simulate runtime failures, verifying that `PlanController` automatically catches exceptions and falls back to the legacy engine.

---

## 5. Test Execution Commands

Run all tests from your terminal using the Maven Wrapper:

### Run All Workspace Tests (Root and Backend)
```powershell
# Run from the root directory
.\mvnw.cmd test
```

### Run Backend Tests Only
```powershell
cd embabel-mcp
..\mvnw.cmd test
```

### Run a Specific Test Class
```powershell
..\mvnw.cmd test -Dtest=EmbabelDefaultRuntimeTests
```

### Run a Single Test Method
```powershell
..\mvnw.cmd test -Dtest=EmbabelDefaultRuntimeTests#testFallbackMechanism
```

---

## 6. Coverage Overview

The current test suites achieve high coverage across critical runtime subsystems:
* **GOAP planning logic**: 100% path coverage.
* **Streamlit Compatibility Adapters**: 100% schema validation coverage.
* **Routing and Fallbacks**: Asserts default parameters, custom selectors, bad inputs, and try-catch safety paths.
* **WMO weather codes**: Asserts all severity levels (GOOD, MODERATE, POOR) are fully mapped.
