# LLM-GOAP Planner

## Project Overview

GOAP Planner is a premium AI orchestration dashboard that demonstrates Goal-Oriented Action Planning (GOAP) integrated with Large Language Models (LLMs). The project bridges traditional AI planning algorithms with modern Llama3-driven reasoning to generate, visualize, and execute complex agent-based plans.

This platform features a high-performance, **black-dominant dark mode** designed for production-grade AI monitoring and orchestration.

## Goals

- **Bridge AI Paradigms**: Integrate traditional GOAP solvers with semantic LLM goal decomposition.
- **High-Fidelity Visualization**: Provide professional orchestration graphs and execution timelines.
- **Production-Grade UX**: Deliver a sophisticated, high-contrast dashboard with persistent state.
- **Agent Orchestration**: Prototype complex multi-agent handoffs and capability-based assignments.

## Features

### Dashboard & UI ✅

- **Premium Dark Mode** - Sophisticated black-dominant theme (`#050505`) with charcoal surfaces and high-contrast typography.
- **Theme Persistence** - Persistent light/dark mode selection via `localStorage` with system preference detection.
- **Custom SVG Graph Engine** - A proprietary orchestration graph renderer supporting:
  - Dynamic branching and parallel execution paths.
  - Interactive node highlighting and edge tracing.
  - Theme-aware SVG styling (no hardcoded colors).
- **High-Performance Gantt Timeline** - Custom timeline visualization with:
  - Dynamic width/height scaling to prevent task clipping.
  - Center-aligned date labels and high-visibility agent lanes.
  - Zoom-aware date markers and status indicators.
- **Execution Trace Console** - Professional "mint-on-black" console for real-time monitoring of state transitions and action outcomes.
- **Agent Orchestration Panel** - Compact "orchestration tiles" for agent selection with real-time status feedback.

### Intelligence & Orchestration 🔄

- **Llama3 Integration** - Backend support for Llama3-driven plan generation and semantic goal analysis.
- **Hybrid Planning** - Dynamic fallback to keyword-based blueprints when LLM services are initializing.
- **Structured Trace Logic** - Step-by-step state comparison (Before/After) for every planned action.

## Tech Stack

| Component         | Technology                           |
| ----------------- | ------------------------------------ |
| Backend Framework | Spring Boot 3.x                      |
| AI Orchestration  | Python (FastAPI Bridge)              |
| LLM Engine        | Llama3 / Ollama                      |
| Visualization     | Custom SVG Rendering (Theme-Aware)   |
| Frontend          | Vanilla JS / CSS3 (Design Tokens)    |
| Build Tool        | Maven 3.8+                           |

## Architecture Overview

```
GOAP Planner
├── src/main/java/...       # Spring Boot Orchestration Layer
├── src/main/resources/
│   ├── static/             # High-Fidelity Frontend
│   │   ├── app.js          # SVG Engine & Theme Logic
│   │   ├── style.css       # Design System & Dark Theme
│   │   └── index.html      # Dashboard Structure
├── planner/                # Python-based LLM Bridge
└── pom.xml                 # Maven Configuration
```

## Current Progress

### Completed ✅

- ✅ **Black-Dominant Design System**: Implementation of a cohesive, high-contrast dark theme.
- ✅ **Custom SVG Visualization Suite**: Proprietary rendering of Orchestration Graphs and Gantt Timelines.
- ✅ **Execution Trace Console**: High-visibility logging of state transitions and action results.
- ✅ **Theme Management**: Robust light/dark toggle with persistence and system-level integration.
- ✅ **Responsive Dashboard**: Fluid layout optimized for both large monitors and laptop screens.
- ✅ **Width/Height Scaling**: Dynamic SVG canvas resizing to prevent task and label clipping.

### In Progress 🔄

- 🔄 **Real-Time Log Streaming**: Transitioning trace console to WebSocket-based live updates.
- 🔄 **CUDA Optimization**: Stabilizing Llama3 local inference for high-performance planning.

## Setup Instructions

### Prerequisites

- **Java 17+**
- **Maven 3.8+**
- **Python 3.10+** (for LLM bridge)
- **Ollama** (running Llama3)

### Quick Start

1. **Clone and Initialize**
   ```bash
   git clone <repository-url>
   .\mvnw.cmd clean install
   ```

2. **Start the Platform**
   ```bash
   .\mvnw.cmd spring-boot:run
   ```

3. **Access the Dashboard**
   Open `http://localhost:8080` in your browser.

---

**Last Updated**: May 7, 2026 | **Version**: 2.1.0-PREMIUM
