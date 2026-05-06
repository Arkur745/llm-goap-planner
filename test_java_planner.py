import requests
import time

url = "http://localhost:9090/plan"
payload = {
    "goal": "Build a presentation",
    "tools": ["SearchAgent", "CalendarAgent"]
}

print(f"Sending request to {url}...")
start = time.time()
try:
    response = requests.post(url, json=payload, timeout=20)
    end = time.time()
    print(f"Status Code: {response.status_code}")
    print(f"Time taken: {end - start:.2f} seconds")
    print("Response JSON:")
    print(response.json())
except Exception as e:
    end = time.time()
    print(f"Error after {end - start:.2f} seconds: {e}")
