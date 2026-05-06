# IP3.b - Dynamic GOAP Planner (Embabel Framework)

> **Overview**: This project implements a Goal-Oriented Action Planning (GOAP) system that combines the creative decomposition power of a **Local LLM** with the deterministic logic of the **Embabel Java Framework**. 

---

## 🏗️ System Architecture & Workflow

This prototype demonstrates a complete "Sense-Plan-Act" cycle, designed to be run **100% offline**.

### 1. The Thinking Phase (Local LLM)
When a goal is received (e.g., "Plan a startup pitch"), the system uses **Ollama (Llama3)** to:
*   Decompose the abstract goal into 4-6 atomic sub-tasks.
*   Dynamically assign each task to the most appropriate specialized agent (Search, Calendar, etc.).
*   Define the world-state requirements for each step.

### 2. The Logic Phase (Embabel GOAP)
The generated tasks are handed to the **Java GOAP Engine**. Unlike standard LLM agents that can hallucinate sequences, the GOAP engine:
*   Validates that the sequence is logically sound.
*   Ensures that every step has its preconditions met by previous actions.
*   Enforces tool constraints (it will only use the agents you have enabled in the frontend).

### 3. The Execution Phase (Agent Simulation)
To satisfy the requirement of "actually doing something," the backend iterates through the final plan and uses the LLM to **simulate the output** of each agent. This provides the frontend with realistic data (dates, search results, order confirmations) without needing external API keys.

---

## 🔌 API Documentation for Frontend Integration

**Target URL**: `POST http://localhost:9090/plan`

### Request Specification
The frontend must send a JSON object containing the user's intent and the selected toolset.

```json
{
  "goal": "Build a presentation for investors",
  "tools": ["SearchAgent", "CalendarAgent", "BudgetAgent"]
}
```

### Response Specification
The API returns a rich JSON object containing everything needed for a high-end visualization.

*   `tasks`: An array of objects. Use the `description` for the title and `output` for the "result" of the action.
*   `flowchart`: A Mermaid.js string. Use this to render a **Dependency Graph** showing how tasks connect.
*   `gantt`: A Mermaid.js string. Use this to render an **Execution Timeline**.
*   `trace`: A log of the GOAP solver's state transitions (useful for "Debug" or "Advanced" views).

---

## 🤖 Available Agents & Tools

The backend supports the following agent types. The frontend should allow users to toggle these to see how the plan changes based on available resources:

*   **SearchAgent**: (Core/Foundation) Handles research and general reasoning.
*   **CalendarAgent**: Handles scheduling, dates, and time management.
*   **BudgetAgent**: Handles cost estimation and financial planning.
*   **InviteAgent**: Handles communication and stakeholder coordination.
*   **FoodAgent**: Handles catering and resource procurement.

---

## 🚀 Execution Instructions

1.  **Start LLM Server**: `ollama run llama3`
2.  **Start Java Brain**: `cd embabel-mcp` -> `mvn spring-boot:run`
3.  **Reference Implementation**: (Optional) To see how the data should be displayed, run: `cd planner` -> `streamlit run app.py`.

---

## 📑 Design Notes
*   **Constraint Awareness**: If a specialized agent (like `FoodAgent`) is missing, the system will intelligently route those tasks to the `SearchAgent` as a fallback.
*   **Stateless Planning**: Currently, each request is a fresh planning cycle. Future versions could support incremental state updates.