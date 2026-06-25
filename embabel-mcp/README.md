# Embabel MCP Backend

The core intelligence layer of LLM-GOAP Planner. This Spring Boot service runs the **Embabel GOAP (Goal-Oriented Action Planning)** runtime, orchestrating multiple AI agents to fulfill complex travel planning goals.

## What it does

When it receives a goal like `"Plan a 5-day trip to Paris"`, the GOAP solver:
1. Parses the destination and constraints from natural language
2. In parallel: fetches search results, weather forecasts, accommodation listings, and route info
3. Uses an LLM (Groq/Ollama) to synthesize everything into a rich travel report
4. Returns structured JSON with the report, execution trace, and a Mermaid action graph

## Running

```powershell
cd embabel-mcp
.\mvnw.cmd spring-boot:run
```

Starts on **http://localhost:9090**

## Configuration

Edit `src/main/resources/application-local.properties` with your keys:

```properties
groq.api.key=gsk_YOUR_KEY
spring.ai.openai.api-key=gsk_YOUR_KEY
embabel.search.tavily.api-key=tvly-YOUR_KEY
google.maps.api-key=YOUR_KEY   # optional
```

See the main [application.properties](src/main/resources/application.properties) for all available settings.

## Key Endpoint

```
POST http://localhost:9090/plan
Content-Type: application/json

{"goal": "Plan a weekend in Prague"}
```

See [docs/API_REFERENCE.md](../docs/API_REFERENCE.md) for the full request/response schema.

## Package Structure

| Package | Description |
|---------|-------------|
| `agent/` | `TravelPlannerAgent` — The main GOAP agent with all `@Action` methods |
| `controller/` | `PlanController` (GOAP API), `MCPController` (tool introspection) |
| `budget/` | `BudgetService` — LLM-enhanced budget calculation |
| `weather/` | `OpenMeteoWeatherProvider` — Free weather API integration |
| `search/` | `TavilySearchProvider` — Tavily search integration |
| `maps/` | `GoogleMapsService` — Route and directions planning |
| `airbnb/` | `AirbnbService` — Accommodation listing simulation |
| `config/` | `EmbabelLlmConfig` — LLM bean configuration |
| `util/` | `EmbabelTraceMapper`, `EmbabelGraphBuilder` — Response formatting |

## Dependencies

- **Spring Boot 3.3** — Application framework
- **Embabel Agent 0.4.0** — GOAP planning runtime
- **Spring AI 1.1.5** — LLM abstraction (OpenAI-compatible / Ollama)
- **Java 21** — Minimum required JDK version
