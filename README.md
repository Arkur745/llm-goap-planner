# 🌌 LLM-GOAP: Premium AI Orchestration Platform

## 🚀 Project Overview

**LLM-GOAP** is a high-performance, production-grade AI orchestration dashboard designed to bridge the gap between traditional **Goal-Oriented Action Planning (GOAP)** and modern **Large Language Models (LLMs)**. 

Built with a **black-dominant, high-contrast aesthetic**, this platform enables developers to visualize complex agent-based workflows, monitor real-time execution traces, and manage multi-agent handoffs through a sophisticated, theme-persistent dashboard.

---

## 🎯 Strategic Goals

1.  **Semantic Goal Decomposition**: Utilize Llama3 to break high-level human intent into actionable, structured plans.
2.  **High-Fidelity Visual Intelligence**: Deliver professional-grade **SVG Orchestration Graphs** and **Gantt Timelines** with sub-pixel precision.
3.  **Agent Orchestration**: Prototype complex handoff chains where agents (Search, Calendar, Manager) collaborate based on specialized capabilities.
4.  **Production UX**: Provide a seamless, state-aware interface with persistent dark-mode and fluid animations.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Vanilla JS / CSS3 / HTML5 | Ultra-responsive, theme-aware dashboard with custom SVG engines. |
| **Orchestration** | Spring Boot 3.x (Java 17) | Core business logic, plan persistence, and API gateway. |
| **AI Intelligence** | Python / FastAPI Bridge | High-performance LLM integration layer for Llama3. |
| **Inference** | Ollama / Llama3 | Local, privacy-first semantic reasoning and plan generation. |
| **Visuals** | Proprietary SVG Engine | Dynamic, zoom-aware graph and timeline rendering. |

---

## 📋 Detailed Prerequisites

To ensure a foolproof deployment, verify your environment meets the following requirements:

### 1. Core Runtime
- **Java 17 (LTS)**: Required for the Spring Boot backend. [Download Here](https://www.oracle.com/java/technologies/downloads/).
- **Maven 3.8+**: Handles backend dependencies and build lifecycle.
- **Python 3.10+**: Powering the `planner/` AI bridge.

### 2. LLM Infrastructure (Ollama)
The platform is optimized for **Llama3**.
1.  Install Ollama from [ollama.com](https://ollama.com).
2.  Pull the required model:
    ```bash
    ollama pull llama3
    ```
3.  Ensure the Ollama service is running (usually on port 11434).

### 3. Python Environment
Navigate to the `planner/` directory and set up your environment:
```bash
cd planner
python -m venv venv
# Windows
.\venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
pip install -r requirements.txt
```

---

## 🚀 Foolproof Installation & Setup

### Step 1: Clone the Repository
```bash
git clone https://github.com/Aditya-Khetawat/llm-goap-planner
cd llm-goap-planner
```

### Step 2: Build the Spring Boot Backend
```bash
# Windows
.\mvnw.cmd clean install
# macOS/Linux
./mvnw clean install
```

### Step 3: Configure Environment
Edit `src/main/resources/application.properties` to ensure your ports are clear:
```properties
server.port=8080
llm.bridge.url=http://localhost:8000
```

### Step 4: Launch the AI Bridge
Open a separate terminal:
```bash
cd planner
# Activate venv as shown above
python app.py  # Launches FastAPI on port 8000
```

### Step 5: Start the Platform
```bash
# Windows
.\mvnw.cmd spring-boot:run
```

---

## 📊 Dashboard Visualizations

### 1. Orchestration Graph (SVG)
- **Dynamic Branching**: Supports parallel execution paths.
- **Interactive Nodes**: Hover to highlight execution paths.
- **Theme-Aware**: Colors automatically adjust for high contrast in dark mode.

### 2. Gantt Timeline (SVG)
- **Automatic Scaling**: Width and height adjust dynamically to prevent label clipping.
- **Agent Lanes**: Clearly separated rows for each autonomous agent.
- **Real-Time Progress**: Status icons (Ready, Active, Done) update based on execution state.

### 3. Execution Trace Console
- **State Handoffs**: View "Before" and "After" world states for every action.
- **Mint-on-Black Aesthetic**: Optimized for long-term monitoring without eye strain.

---

## 🔧 Troubleshooting & FAQ

### ❌ CUDA Initialization Failure
If your local LLM inference fails due to GPU issues, Ollama will automatically fallback to CPU. Ensure you have at least 16GB of RAM for a smooth Llama3 experience.

### ❌ Diagram Clipping
The dashboard uses a proprietary scaling engine. If you see clipped labels, refresh the tab or use the **Zoom Controls** (coming soon) to reset the canvas viewport.

### ❌ Port Conflicts
- **8080**: Spring Boot (Frontend/API)
- **8000**: Python AI Bridge
- **11434**: Ollama Service
Use `netstat -ano | findstr <port>` on Windows to identify conflicting processes.

---

## 🤝 Project Structure

```
.
├── src/main/java/             # Spring Boot (Gateway & Storage)
│   └── com/ip3b/goap_planner/
│       ├── controller/        # REST Endpoints
│       ├── service/           # Logic & AI Integration
│       └── visualization/     # SVG Metadata Factories
├── src/main/resources/
│   ├── static/                # Dashboard Frontend
│   │   ├── app.js             # SVG Rendering & UI Logic
│   │   └── style.css          # Design System (Tokens & Dark Mode)
├── planner/                   # AI Intelligence Bridge (Python)
│   ├── app.py                 # FastAPI Integration
│   └── mermaid_generator.py   # Semantic Layout Logic
└── pom.xml                    # Maven Project Definition
```

---

## 📜 License & Academic Context
This project is an advanced research prototype developed by **Aditya Khetawat** and **Aryan Thakur**. It is designed for educational exploration into hybrid AI planning systems.

**Current Version**: 2.1.0-PREMIUM | **Last Updated**: May 7, 2026
