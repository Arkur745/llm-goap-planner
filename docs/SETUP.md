# Setup & Deployment Guide

Complete guide to configuring and running the LLM-GOAP Planner on a local Windows machine.

---

## 1. System Prerequisites

| Tool | Version | How to Check | Download |
|------|---------|-------------|---------|
| **Java JDK** | 21+ (Backend), 17+ (Gateway) | `java -version` | [Adoptium](https://adoptium.net/) |
| **Node.js** | 18+ | `node --version` | [nodejs.org](https://nodejs.org/) |
| **npm** | 8+ | `npm --version` | Bundled with Node.js |
| **Python** | 3.10+ | `python --version` | [python.org](https://python.org/) |
| **Git** | Any | `git --version` | [git-scm.com](https://git-scm.com/) |

> **Java JDK 21 note**: The Embabel MCP backend (`embabel-mcp/`) requires Java **21**. The Spring Boot gateway (`src/`) uses Java **17**. Install JDK 21 and it satisfies both.

---

## 2. API Keys

### Required Keys

You must have **at least** these two keys to run the system:

#### A. Groq API Key (Free)
1. Sign up at [https://console.groq.com/](https://console.groq.com/)
2. Navigate to **API Keys** → **Create API Key**
3. Copy the key starting with `gsk_`

#### B. Tavily API Key (Free)
1. Sign up at [https://tavily.com/](https://tavily.com/)
2. Go to **Dashboard** → copy your API key
3. Free tier: 1,000 requests/month

### Optional Keys

#### C. Google Maps API Key (for route planning)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Directions API** and **Geocoding API**
3. Create credentials → API Key

---

## 3. Environment Configuration

### Option A — Properties File (Recommended for Development)

Edit the file at:
```
embabel-mcp/src/main/resources/application-local.properties
```

```properties
# LLM (Groq)
groq.api.key=gsk_YOUR_GROQ_KEY
spring.ai.openai.api-key=gsk_YOUR_GROQ_KEY

# Search
embabel.search.tavily.api-key=tvly-YOUR_TAVILY_KEY

# Maps (optional)
google.maps.api-key=YOUR_GOOGLE_MAPS_KEY
```

> ⚠️ This file is in `.gitignore` and will **not** be committed. Keep your keys safe.

### Option B — Environment Variables

Set these in your PowerShell session before starting services:

```powershell
$env:GROQ_API_KEY = "gsk_YOUR_KEY"
$env:TAVILY_API_KEY = "tvly-YOUR_KEY"
$env:GOOGLE_MAPS_API_KEY = "YOUR_KEY"
```

Or set them permanently via **System Properties → Environment Variables** in Windows.

---

## 4. Service Startup Sequence

Open **three separate terminal windows** and run the services in this order.

### Terminal 1 — Embabel MCP Backend (Port 9090)

```powershell
cd embabel-mcp
.\mvnw.cmd spring-boot:run
```

Wait for: `Started EmbabelMcpApplication in X.XXX seconds`

**First run** will download Maven dependencies (~200MB) — this may take a few minutes.

### Terminal 2 — Spring Boot Gateway (Port 8080)

From the project root:

```powershell
.\mvnw.cmd spring-boot:run
```

Wait for: `Started` confirmation in console output.

### Terminal 3 — React Frontend (Port 5173)

```powershell
cd frontend
npm install       # first time only
npm run dev
```

Open **http://localhost:5173** in your browser.

### Terminal 4 (Optional) — Streamlit Dev Console (Port 8501)

```powershell
cd streamlit-ui
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
streamlit run app.py
```

---

## 5. Verification

### Check Backend is Running
```powershell
Invoke-RestMethod `
  -Uri "http://localhost:9090/plan" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"goal":"Plan a weekend in Prague"}'
```

Expected: JSON response with `"classification": "embabel_runtime"` and `"status": "COMPLETED"`

### Check Gateway is Running
```powershell
Invoke-RestMethod `
  -Uri "http://localhost:8080/api/plans" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"goal":"Plan a trip to Tokyo"}'
```

### Check Frontend
Navigate to [http://localhost:5173](http://localhost:5173) — you should see the planning form.

---

## 6. Using Ollama (Local LLM — No API Key Required)

If you prefer running a local model instead of Groq:

1. **Install Ollama**: Download from [https://ollama.com/](https://ollama.com/)
2. **Pull a model**: `ollama pull llama3`
3. **Update config** in `application-local.properties`:

```properties
spring.ai.model.chat=ollama
spring.ai.ollama.chat.options.model=llama3
# Comment out the Groq keys or leave them empty
```

> Note: Local models are slower but completely free. Quality depends on the model size and your hardware.

---

## 7. Troubleshooting

### Port Already in Use

```powershell
# Find the process using port 9090
Get-NetTCPConnection -LocalPort 9090 | Select-Object OwningProcess

# Kill the process (replace <PID> with the number found above)
Stop-Process -Id <PID> -Force
```

Repeat for port `8080` if needed.

### `java.lang.UnsupportedClassVersionError`

The backend requires Java 21. Check your active version:
```powershell
java -version
```
If it's lower than 21, install JDK 21 and update `JAVA_HOME`.

### Maven Build Failures

Clear the Maven cache and retry:
```powershell
# From project root or embabel-mcp/
.\mvnw.cmd clean spring-boot:run
```

### `npm install` Fails

Ensure Node.js 18+ is installed:
```powershell
node --version
npm --version
```

If you see permission errors, try:
```powershell
npm install --legacy-peer-deps
```

### 429 Too Many Requests (Groq)

Groq free tier has rate limits. Wait 60 seconds before retrying. For higher limits, upgrade your Groq plan or switch to Ollama.

### Weather API Fails

The weather provider uses [Open-Meteo](https://open-meteo.com/) (free, no key required). If it fails, check your internet connection.

### No Search Results

- Verify your Tavily key is correct at [app.tavily.com](https://app.tavily.com)
- Check the backend logs for error messages:
  ```powershell
  # Look for "TavilySearch" in the running backend terminal output
  ```

---

## 8. Development Tips

### Run Only the Backend (API Testing)

If you only want to test the backend API without the frontend:

```powershell
cd embabel-mcp
.\mvnw.cmd spring-boot:run
# Then use curl or PowerShell to call http://localhost:9090/plan
```

### Frontend Hot Reload

The Vite dev server supports instant hot reload. Changes to TypeScript/React files are reflected immediately without restarting.

### Backend Restart

The backend uses Spring DevTools for automatic restart on file changes. For major config changes, stop and restart manually with `Ctrl+C` then re-run `.\mvnw.cmd spring-boot:run`.
