import requests
import os

GATEWAY_URL = os.environ.get("GATEWAY_URL", "http://localhost:8080")

def generate_plan(goal: str, provider: str = "auto", tools: list = None) -> dict:
    """
    Calls the Spring Boot planning gateway endpoint /api/plans.
    """
    if tools is None:
        tools = []
        
    url = f"{GATEWAY_URL}/api/plans"
    payload = {
        "goal": goal,
        "tools": tools,
        "provider": provider
    }
    
    try:
        response = requests.post(url, json=payload, timeout=60)
        # We don't raise immediately so we can inspect error response JSON if available
        return response
    except Exception as e:
        # Wrap connection/network errors
        class SimulatedResponse:
            def __init__(self, err_msg):
                self.status_code = 500
                self.err_msg = err_msg
                self.text = err_msg
            def json(self):
                return {"error": self.err_msg}
        return SimulatedResponse(f"Failed to connect to gateway service at {url}: {str(e)}")
