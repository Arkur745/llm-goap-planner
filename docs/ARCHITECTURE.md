# System Architecture

This document provides a developer-facing overview of the Embabel MCP backend and gateway project architecture.

---

## 1. High-Level System Architecture

The project consists of three primary components that orchestrate planning and tool execution:

```mermaid
graph LR
    User([User]) <--> Streamlit[Streamlit UI\nPort 8501]
    Streamlit <--> Gateway[Gateway Service\nPort 8080]
    Gateway <--> Backend[Embabel MCP Backend\nPort 9090]
```

1. **Streamlit UI (Port 8501)**: An interactive frontend dashboard for executing goals, inspecting blackboard state transitions, viewing execution timelines, and displaying dependency graphs.
2. **Gateway Service (Port 8080)**: Acts as an orchestrator, proxying requests to the backend planner and providing fallback planning mechanisms using LLM generators or static blueprint templates.
3. **Backend / Embabel MCP Service (Port 9090)**: Hosts the Embabel runtime, executing Goal-Oriented Action Planning (GOAP) agents and exposing MCP tools (weather, search, etc.).

---

## 2. Request Handoff and Routing Flow

When a goal is submitted via the UI, the request traverses the services as follows:

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as Streamlit UI
    participant GW as Gateway Service (8080)
    participant BE as Embabel MCP Backend (9090)

    User->>UI: Submit Goal ("Plan a weekend in Prague")
    UI->>GW: POST /api/plans
    GW->>BE: POST /plan (Default: Embabel Runtime)
    Note over BE: Embabel chooses and runs TravelPlannerAgent
    BE-->>GW: Adapted Compatibility Response (Steps, Trace, Mermaid)
    GW-->>UI: PlanResponse JSON
    UI->>User: Display Travel Report, Timeline, and Dependency Graph
```

---

## 3. Embabel Agent Runtime Architecture

The backend utilizes the **Embabel Agent Runtime**, which decouples manual step orchestration into declarative, type-based conditions.

```mermaid
graph TD
    Goal([Goal: Plan Travel Itinerary]) --> Solver[Embabel GOAP Solver]
    Solver --> Discover[Scan @Agent @Action methods]
    Discover --> Solve[Resolve Type Dependencies]
    Solve --> Plan[ConditionPlan: Scheduled Action Sequence]
    Plan --> Exec[Execute Actions on Blackboard]
```

* **Autonomy**: Injected via Spring's `Autonomy` bean, orchestrating the discovery of agents capable of fulfilling goals.
* **AgentProcess**: Represents a single execution session containing action invocation history, timing, status, and the data blackboard.
* **Blackboard**: A shared memory space where executing actions query preconditions and bind outputs.

---

## 4. Blackboard Lifecycle & Type Resolution

The planner operates entirely on **type preconditions and effects**. Rather than tracking abstract string flags, the world state is defined by the presence of strongly-typed DTOs on the process blackboard:

```mermaid
stateDiagram-v2
    [*] --> UserInput : Process Init (Goal string bound)
    UserInput --> Destination : extractDestination()
    Destination --> SearchResponse : executeSearch()
    Destination --> WeatherReport : getWeather()
    Destination --> BudgetEstimate : calculateBudget()
    SearchResponse --> TravelPlanReport : composeTravelPlan()
    WeatherReport --> TravelPlanReport : composeTravelPlan()
    BudgetEstimate --> TravelPlanReport : composeTravelPlan()
    TravelPlanReport --> [*] : Goal Achieved
```

1. **`UserInput`**: Bound to the blackboard upon process initialization (contains the raw goal prompt).
2. **`Destination`**: Produced by `extractDestination(UserInput)`. Holds the parsed destination name.
3. **`SearchResponse`**, `WeatherReport`, `BudgetEstimate`: Independently triggered by actions requiring `Destination` as a parameter. They are bound to the blackboard as their respective executions complete.
4. **`TravelPlanReport`**: Triggered by `composeTravelPlan(SearchResponse, BudgetEstimate, WeatherReport)`. Fulfills the ultimate agent goal `@AchievesGoal(description = "Plan Travel Itinerary")`.

---

## 5. MCP Tool Architecture

MCP tools are grouped under declarative **Tool Groups** extending Spring-managed components:
* **Tool Group Registration**: Declared using the `@Component` annotation. Contains `@Tool` mappings exposing capabilities to LLMs or planners.
* **Separation of Concerns**: Tool groups act as controllers that route execution to underlying providers (e.g. `SearchToolGroup` routes to `TavilySearchProvider`; `WeatherToolGroup` routes to `OpenMeteoWeatherProvider`).

---

## 6. Runtime Selection & Fallback Routing

The `PlanController` provides high availability by wrapping the default Embabel execution path in a catch-all fallback block that drops back to the legacy planner if any exception is encountered.

```mermaid
graph TD
    Request[POST /plan] --> Validate{Valid runtime parameter?}
    Validate -- No --> HTTP400[Return HTTP 400 Bad Request]
    Validate -- Yes --> Check{runtime value?}
    
    Check -- legacy --> Legacy[Execute Legacy Planner]
    Check -- embabel / omitted --> TryEmbabel[Try Embabel Execution]
    
    TryEmbabel -- Success --> ReturnEmbabel[Return Embabel Payload]
    TryEmbabel -- Exception --> LogException[Log Exception]
    LogException --> Fallback[Execute Legacy Planner as Fallback]
    Fallback --> ReturnFallback[Return Payload with fallbackUsed=true]
```
