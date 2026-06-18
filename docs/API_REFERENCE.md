# API Reference Manual

This document details the REST API endpoints available in the Gateway Service and the Embabel MCP Backend.

---

## 1. Gateway Service API (Port 8080)

The Gateway Service acts as the main entrypoint for the Streamlit UI frontend, proxying requests to the backend planner.

### `POST /api/plans`
Generates a travel plan or general project plan.

* **Headers**: `Content-Type: application/json`
* **Request Payload Schema**:
  ```json
  {
    "goal": "string (Required. The goal prompt, e.g., 'Plan a weekend in Prague')",
    "tools": "array of strings (Optional. Filter list of tools/agents, e.g., ['SearchAgent', 'BudgetAgent'])",
    "provider": "string (Optional. LLM provider for legacy planner fallback, default: 'auto')"
  }
  ```

* **Response Headers**:
  * `X-Plan-Source`: Source label (`PLANNER`, `LLM`, or `BLUEPRINT`)

* **Response Payload Schema**:
  ```json
  {
    "goal": "string (The requested goal)",
    "summary": "string (The composed markdown final report or generated summary)",
    "status": "string (Current plan execution status, usually 'Ready')",
    "steps": [
      {
        "order": 1,
        "title": "string (Action name)",
        "details": "string (Action description)",
        "agent": "string (Agent responsible for this action)",
        "output": "string (Action execution result summary, or null)"
      }
    ],
    "assignments": "array (Reserved for legacy blueprint compatibility)",
    "mermaidDiagram": "string (Mermaid flowchart visualization string)",
    "ganttDiagram": "string (Mermaid Gantt chart visualization string, empty for Embabel)",
    "source": "string (PLANNER or LLM or BLUEPRINT)",
    "classification": "string (e.g., 'embabel_runtime' or 'dynamic_plan')",
    "trace": [
      {
        "action": "string (Name of action executed)",
        "state_before": ["string (Blackboard type names before action)"],
        "preconditions_checked": ["string (Precondition types checked)"],
        "missing_preconditions": ["string (Missing precondition types, if any)"],
        "effects_applied": ["string (Effect types added to blackboard)"],
        "state_after": ["string (Blackboard type names after action)"]
      }
    ],
    "generatedAt": "number (Epoch timestamp in milliseconds)"
  }
  ```

---

## 2. Embabel MCP Backend API (Port 9090)

The backend service directly executes the Goal-Oriented Action Planning (GOAP) runtime.

### `POST /plan`
Resolves and executes agent planning paths.

* **Query Parameters**:
  * `runtime`: Selects the execution engine. Supported values: `embabel`, `legacy`. Default: `embabel` if omitted.

* **Request Payload**:
  Supports passing the runtime flag inside the body or query params.
  ```json
  {
    "goal": "string (Required. Target plan goal)",
    "runtime": "string (Optional. Supported values: 'embabel', 'legacy')",
    "tools": "array of strings (Optional. Legacy tools override)",
    "provider": "string (Optional. LLM model provider, e.g. 'openai', 'groq')"
  }
  ```

---

## 3. Runtime Parameter Behavior & Validation

1. **Parameter Priority**: The backend checks the query parameter `?runtime=...` first. If absent, it checks the request body parameter `"runtime"`. If both are omitted or blank, it defaults to `"embabel"`.
2. **Validation Rules**: If `runtime` is specified but has a value other than `embabel` or `legacy`, the backend returns **HTTP 400 Bad Request** immediately:
   ```json
   {
     "timestamp": "2026-06-18T18:00:00.000+00:00",
     "status": 400,
     "error": "Bad Request",
     "path": "/plan"
   }
   ```

---

## 4. Response Schemas (Backend Port 9090)

### A. Embabel Runtime Success Schema (`runtime=embabel`)
Returned when the Embabel Agent Runtime successfully completes a plan execution.

```json
{
  "goal": "Plan a weekend in Prague",
  "classification": "embabel_runtime",
  "status": "Ready",
  "source": "EMBABEL",
  "summary": "Composed travel plan report content...",
  "steps": [
    {
      "order": 1,
      "title": "extractDestination",
      "details": "Extract destination from user prompt",
      "agent": "TravelPlannerAgent",
      "output": "Prague"
    }
  ],
  "trace": [
    {
      "action": "extractDestination",
      "state_before": ["UserInput"],
      "preconditions_checked": ["UserInput"],
      "missing_preconditions": [],
      "effects_applied": ["Destination"],
      "state_after": ["UserInput", "Destination"]
    }
  ],
  "mermaidDiagram": "flowchart TD\n  calculateBudget --> composeTravelPlan\n...",
  "flowchart": "flowchart TD\n  calculateBudget --> composeTravelPlan\n...",
  "embabel": {
    "actionsExecuted": [
      "com.cps.mcp.agent.TravelPlannerAgent.extractDestination",
      "com.cps.mcp.agent.TravelPlannerAgent.calculateBudget",
      "com.cps.mcp.agent.TravelPlannerAgent.executeSearch",
      "com.cps.mcp.agent.TravelPlannerAgent.getWeather",
      "com.cps.mcp.agent.TravelPlannerAgent.composeTravelPlan"
    ],
    "blackboardObjects": [
      "UserInput",
      "Destination",
      "BudgetEstimate",
      "SearchResponse",
      "WeatherReport",
      "TravelPlanReport"
    ],
    "processStatus": "COMPLETED",
    "durationMs": 71
  },
  "fallbackUsed": false
}
```

### B. Legacy Planner Success Schema (`runtime=legacy`)
Returned when explicitly selecting the legacy LLM-based planner.

```json
{
  "goal": "Plan a weekend in Prague",
  "classification": "dynamic_plan",
  "tasks": [
    {
      "id": "T1",
      "description": "Find Prague Info - Use SearchAgent to find info",
      "agent": "SearchAgent",
      "dependencies": [],
      "output": "Simulated search output..."
    }
  ],
  "execution": [
    {
      "type": "MCP",
      "agent": "SearchAgent",
      "task": "Find Prague Info",
      "response": {
        "content": "Simulated search output..."
      }
    }
  ],
  "trace": [
    {
      "action": "Find Prague Info",
      "state_before": [],
      "preconditions_checked": [],
      "missing_preconditions": [],
      "effects_applied": ["prague_searched"],
      "state_after": ["prague_searched"]
    }
  ],
  "flowchart": "flowchart TD\n  T1[Find Prague Info] --> T2[Calculate Budget]...",
  "gantt": "gantt\n  dateFormat  HH:mm\n  axisFormat %H:%M\n  section Planning\n...",
  "fallbackUsed": false
}
```

### C. Embabel Fallback Schema (Automatic Rollback to Legacy)
If execution fails under the Embabel runtime, the backend automatically falls back to the legacy planner.

```json
{
  "goal": "Plan a weekend in Prague",
  "classification": "legacy_runtime",
  "source": "LEGACY_FALLBACK",
  "fallbackUsed": true,
  "fallbackReason": "Exception message string (e.g. 'Unknown destination in user input: Plan a weekend in Vienna')",
  "tasks": [ ... ],
  "execution": [ ... ],
  "trace": [ ... ],
  "flowchart": "...",
  "gantt": "..."
}
```

---

## 5. Curl Execution Examples

### Execute with Default (Embabel Runtime)
```bash
curl -X POST http://localhost:9090/plan \
     -H "Content-Type: application/json" \
     -d '{"goal": "Plan a budget trip to Tokyo"}'
```

### Execute with Explicit Legacy Runtime
```bash
curl -X POST "http://localhost:9090/plan?runtime=legacy" \
     -H "Content-Type: application/json" \
     -d '{"goal": "Plan a budget trip to Tokyo"}'
```

### Call Gateway Service Endpoint
```bash
curl -X POST http://localhost:8080/api/plans \
     -H "Content-Type: application/json" \
     -d '{"goal": "Plan a weekend in Prague"}'
```
