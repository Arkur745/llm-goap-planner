from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
import requests
from agents.agent_manager import execute_plan
from planner.mermaid_generator import generate_flowchart, generate_gantt

app = FastAPI()

JAVA_PLANNER_URL = "http://localhost:9090/plan"


class PlanRequest(BaseModel):
    goal: str
    tools: List[str] = []


@app.post("/plan")
def create_plan(request: PlanRequest):
    try:
        # 1. Call Java Embabel planner
        payload = {
            "goal": request.goal,
            "tools": request.tools
        }
        response = requests.post(JAVA_PLANNER_URL, json=payload, timeout=60)
        response.raise_for_status()

        # 2. Parse Java response
        data = response.json()
        tasks = data.get("tasks", [])
        trace = data.get("trace")
        classification = data.get("classification", "unknown")

        # Create plan object for the pipeline
        plan = {
            "goal": request.goal,
            "tasks": tasks
        }

        # 3. Continue existing pipeline
        # Execution (MCP calls)
        execution_results = execute_plan(plan)

        # Flowchart generation
        flowchart = generate_flowchart(plan)

        # Gantt generation
        gantt = generate_gantt(plan)

        # 4. Return combined response
        return {
            "goal": request.goal,
            "classification": classification,
            "tasks": tasks,
            "execution": execution_results,
            "flowchart": flowchart,
            "gantt": gantt,
            "trace": trace
        }

    except requests.exceptions.ConnectionError:
        return {
            "error": "Java planner not reachable at " + JAVA_PLANNER_URL,
            "goal": request.goal,
            "classification": "none",
            "tasks": [],
            "execution": [],
            "flowchart": "",
            "gantt": ""
        }
    except requests.exceptions.Timeout:
        return {
            "error": "Java planner request timed out",
            "goal": request.goal,
            "classification": "none",
            "tasks": [],
            "execution": [],
            "flowchart": "",
            "gantt": ""
        }
    except Exception as e:
        return {
            "error": f"Java planner error: {str(e)}",
            "goal": request.goal,
            "classification": "none",
            "tasks": [],
            "execution": [],
            "flowchart": "",
            "gantt": ""
        }
