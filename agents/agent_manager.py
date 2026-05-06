import requests
from planner.mcp_config import MCP_ENDPOINTS


def execute_plan(plan):
    results = []

    for task in plan["tasks"]:
        agent = task.get("agent")

        # Check if agent has HTTP endpoint
        if agent in MCP_ENDPOINTS:
            endpoint = MCP_ENDPOINTS[agent]
            try:
                response = requests.post(
                    endpoint,
                    json={"task": task.get("description", "")},
                    timeout=5
                )

                if response.status_code != 200:
                    results.append({
                        "type": "MCP",
                        "agent": agent,
                        "task": task.get("description", ""),
                        "status": "failed",
                        "error": f"HTTP {response.status_code}: {response.text}"
                    })
                else:
                    results.append({
                        "type": "MCP",
                        "agent": agent,
                        "task": task.get("description", ""),
                        "response": response.json()
                    })
            except Exception as e:
                results.append({
                    "type": "MCP",
                    "agent": agent,
                    "task": task.get("description", ""),
                    "status": "failed",
                    "error": str(e)
                })
        else:
            # Fallback to LLM execution
            results.append({
                "type": "LLM",
                "agent": agent,
                "task": task.get("description", ""),
                "status": "handled_by_llm"
            })

    return results
