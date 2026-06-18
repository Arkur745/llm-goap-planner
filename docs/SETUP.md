# System Setup & Deployment Guide

This document outlines the setup, build, configuration, and execution instructions for the Embabel MCP project.

---

## 1. Prerequisites

Before starting, ensure your system meets the following requirements:
* **Java 21 JDK**: Installed and configured on your system path.
* **Maven 3.8+**: (Optional, as Maven Wrapper `.mvnw.cmd` and `mvnw` scripts are included in the workspace).
* **Python 3.10+**: Required to run the Streamlit frontend.
* **Ollama (Optional)**: If you plan to run local inference models (e.g. `llama3`).

---

## 2. Configuration & Environment Variables

Create or configure your environment variables or properties files before booting the servers:

### A. Environment Variables
Set the following keys on your host system or in your terminal session:
```powershell
# Windows PowerShell
$env:TAVILY_API_KEY="tvly-..."
$env:GROQ_API_KEY="gsk_..."
```

### B. Spring Application Properties
Configurations can be declared in `embabel-mcp/src/main/resources/application.properties` (or `application-local.properties` for local overrides):
* **Tavily search provider properties**:
  ```properties
  embabel.search.provider=tavily
  tavily.api.key=${TAVILY_API_KEY}
  ```
* **LLM configurations**:
  ```properties
  embabel.llm.provider=openai
  embabel.models.default-llm=gpt-4.1-mini
  # If using Groq in legacy fallback modes:
  groq.api.key=${GROQ_API_KEY}
  groq.model=llama-3.1-8b-instant
  ```
* **Ollama configuration (Optional)**:
  Make sure the Ollama application is running and the model is pulled (`ollama pull llama3`), and configure:
  ```properties
  ollama.url=http://localhost:11434/api/generate
  ollama.model=llama3
  ```

---

## 3. Service Startup Sequence

To launch the full stack, open three terminals and run the following startup commands in sequence:

### Step 1: Start the Backend MCP Server (Port 9090)
This hosts the Embabel runtime and MCP tool endpoints.
```powershell
cd embabel-mcp
.\mvnw.cmd spring-boot:run
```

### Step 2: Start the Gateway Service (Port 8080)
This acts as the client orchestrator proxying UI calls.
```powershell
# Run from the root directory
.\mvnw.cmd spring-boot:run
```

### Step 3: Start the Streamlit Debug Console (Port 8501)
This opens the user dashboard interface.
```powershell
cd streamlit-ui

# Setup Python Virtual Environment (recommended)
python -m venv venv
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the frontend
streamlit run app.py
```

The console will automatically open at `http://localhost:8501`.

---

## 4. Troubleshooting & Verification

### A. Verify Backend Status
Verify the backend is active by sending a test routing request:
```powershell
Invoke-RestMethod -Uri "http://localhost:9090/plan" -Method Post -ContentType "application/json" -Body '{"goal":"Plan a weekend in Prague"}'
```
On success, you will receive a JSON response with `"classification": "embabel_runtime"`.

### B. Weather API Geocoding Failures
If geocoding calls to `open-meteo` fail with network timeouts:
1. Ensure your machine has active internet access.
2. If geocoding remains unreachable, check that `OpenMeteoWeatherProvider` logs geocoding coordinate lookups correctly.

### C. Port Conflicts
If you encounter `java.net.BindException: Address already in use`:
* Ensure no stale Java processes are running on port `8080` or `9090`.
* Kill active processes using:
  ```powershell
  # Find PID on Port 9090
  Get-NetTCPConnection -LocalPort 9090 | Select-Object OwningProcess
  # Stop the process
  Stop-Process -Id <PID> -Force
  ```
