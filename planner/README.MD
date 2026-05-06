# IP3.b - Dynamic GOAP Planner with Embabel & Local LLM

> **Goal-Oriented Action Planning** (GOAP) powered by the **Embabel Java Framework**, a locally hosted **LLM (Ollama)**, and a modular **Python Orchestration layer**.

---

## 🏛️ System Architecture

This project is split into three main components to ensure modularity and high performance:

1.  **The Brain (Java Backend)**: 
    *   Located in `embabel-mcp/`.
    *   Handles the core **GOAP logic** and **dynamic step generation**.
    *   Communicates with **Ollama** (Llama3) to decompose natural language goals into sequential actions.
    *   **Port**: `9090`

2.  **The Orchestrator (Python API)**:
    *   Located in the root (`api.py`).
    *   Acts as the bridge between the Java Brain and the Frontend.
    *   Handles **Mermaid visualization** generation (Flowcharts & Gantt charts) and **MCP agent execution**.
    *   **Port**: `8000`

3.  **The Interface (Streamlit UI)**:
    *   Located in `planner/app.py`.
    *   Provides a user-friendly dashboard to define goals, select tools, and visualize the generated plan.
    *   **Port**: `8500` (default)

---

## 🚀 Getting Started

### 1. Prerequisites
*   [Ollama](https://ollama.com) (run `ollama run llama3`)
*   Java 17+ & Maven
*   Python 3.10+

### 2. Setup & Installation

**Clone the repository:**
```bash
git clone <your-repo-url>
cd llm-goap-planner
```

**Setup Python environment:**
```bash
python -m venv venv
# Windows: venv\Scripts\activate | Unix: source venv/bin/activate
pip install -r requirements.txt
```

---

## 🛠️ Running the System

To run the full system, you need to start **three** separate terminals:

### Step 1: Start the Java Planner (The Brain)
```bash
cd embabel-mcp
mvn spring-boot:run
```

### Step 2: Start the Python API (The Orchestrator)
```bash
# From the root directory
uvicorn api:app --port 8001 --reload
```

### Step 3: Start the Streamlit Dashboard (The Interface)
```bash
cd planner
streamlit run app.py
```

---

## 🔌 API Reference (Java Backend)

### `POST http://localhost:9090/plan`

The Java backend handles the heavy lifting. It takes a goal and returns the planned tasks with agent assignments.

**Request body:**
```json
{
  "goal": "Plan a startup presentation",
  "tools": ["SearchAgent", "CalendarAgent", "BudgetAgent"]
}
```

**Key Fields in Response:**
*   `tasks`: List of sequential tasks with descriptions and assigned agents.
*   `trace`: Step-by-step state transition logs from the GOAP solver.
*   `classification`: The plan type detected by the LLM.

---

## 🤖 Supported MCP Agents
The system dynamically assigns tasks to these agents based on LLM reasoning:

| Agent | Responsibility |
|---|---|
| `SearchAgent` | Research, reasoning, and analysis |
| `CalendarAgent` | Scheduling, timelines, and time planning |
| `BudgetAgent` | Cost estimation and financial planning |
| `InviteAgent` | Communication and guest coordination |
| `FoodAgent` | Catering and resource management |

---

## 📊 Visualizations
The system automatically generates **Mermaid.js** code for every plan:
*   **Flowchart**: Shows the logical dependency of tasks.
*   **Gantt Chart**: Shows the execution timeline and resource allocation.

---

## 📑 Project Notes
*   **Offline Mode**: This system is designed to run 100% offline using local LLMs.
*   **Dynamic Planning**: Unlike static planners, this system "thinks" about the goal first, builds a set of world-state actions, and then solves the sequence using the GOAP algorithm.