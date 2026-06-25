# Streamlit Developer Console

An interactive debug and monitoring console for the LLM-GOAP Planner. Built with Python + Streamlit, it provides real-time visibility into agent execution, blackboard state transitions, and planning traces.

## Running

```powershell
cd streamlit-ui

# Create a virtual environment (recommended, first time only)
python -m venv venv
.\venv\Scripts\activate

# Install dependencies (first time only)
pip install -r requirements.txt

# Start the console
streamlit run app.py
```

Opens at **http://localhost:8501**

> The Gateway (**port 8080**) must be running for the console to fetch data.

## Features

- Submit planning goals and inspect the full GOAP execution trace
- View blackboard state transitions for each action step
- Browse action dependency graphs (Mermaid diagrams)
- Monitor execution timing and performance metrics

## Dependencies

```
streamlit
requests
```

See [requirements.txt](requirements.txt) for the full list.
