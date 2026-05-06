import streamlit as st
import requests

st.set_page_config(page_title="GOAP Planner", layout="wide")

st.title("🧠 GOAP Planner (Local LLM + MCP)")

# Input
goal = st.text_input("Enter your goal:",
                     placeholder="e.g. Plan a startup presentation")

# Select MCP agents
tools = st.multiselect(
    "Select available MCP agents:",
    ["SearchAgent", "CalendarAgent", "FoodAgent", "InviteAgent", "BudgetAgent"],
    default=["SearchAgent", "CalendarAgent"]
)

# Button
if st.button("Generate Plan"):

    if not goal:
        st.warning("Please enter a goal")
    else:
        try:
            with st.spinner("Generating plan..."):
                res = requests.post(
                    "http://localhost:8000/plan",
                    json={"goal": goal, "tools": tools}
                )

            st.write("Status:", res.status_code)

            data = res.json()

            if "error" in data:
                st.error(data["error"])
            else:
                # 1. Goal Interpretation
                st.subheader("🧠 Goal Interpretation")
                if "classification" in data:
                    st.success(f"Detected type: {data['classification']}")

                # 2. Tasks Breakdown
                st.subheader("📋 Tasks")
                for task in data["tasks"]:
                    st.markdown(f"### {task['id']} — {task['description']}")
                    st.write(f"Agent: {task['agent']}")
                    st.write(f"Dependencies: {task['dependencies']}")
                    if "output" in task:
                        st.success(task["output"])
                    st.markdown("---")

                # 3. Execution Trace
                st.subheader("🔍 Execution Trace")
                for step in data.get("trace", []):
                    st.markdown(f"**Action:** {step['action']}")
                    st.write(f"Before: {step['state_before']}")
                    st.write(f"After: {step['state_after']}")
                    st.markdown("---")

                st.subheader("⚙️ Execution")
                for step in data["execution"]:
                    if step.get("type") == "MCP":
                        st.write(f"**[MCP - {step.get('agent', 'Unknown')}]**")
                        st.write(f"Task: {step.get('task', '')}")
                        if "response" in step:
                            st.json(step["response"])
                        elif "error" in step:
                            st.error(f"Error: {step['error']}")
                    elif step.get("type") == "LLM":
                        st.write(f"**[LLM]**")
                        st.write(f"Task: {step.get('task', '')}")
                        if "status" in step:
                            st.info(f"Status: {step['status']}")

                st.subheader("🔄 Flowchart")
                st.components.v1.html(f"""
                <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
                <div class="mermaid">
                {data['flowchart']}
                </div>
                <script>mermaid.initialize({{startOnLoad:true}});</script>
                """, height=500)

                st.subheader("📊 Gantt Chart")
                st.components.v1.html(f"""
                <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
                <div class="mermaid">
                {data['gantt']}
                </div>
                <script>mermaid.initialize({{startOnLoad:true}});</script>
                """, height=500)

        except Exception as e:
            st.error(f"Error: {e}")
