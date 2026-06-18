import streamlit as st
import time
from api_client import generate_plan
from components.report_viewer import render_report
from components.trace_viewer import render_trace
from components.graph_viewer import render_graph

# Page configuration
st.set_page_config(
    page_title="Embabel GOAP Planner Debug Dashboard",
    page_icon="🌌",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Theme / Mint-on-Black Style CSS Injection
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=Inter:wght@400;600;700&display=swap');

/* Main font styling */
html, body, [class*="css"] {
    font-family: 'Inter', sans-serif;
}

/* Gradient Header */
.title-gradient {
    background: linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-family: 'Outfit', sans-serif;
    font-weight: 800;
    font-size: 2.8rem;
    margin-bottom: 0.1rem;
    padding-top: 10px;
}

.subtitle-mint {
    color: #10B981;
    font-weight: 600;
    font-size: 1.05rem;
    margin-bottom: 25px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
}

/* Metadata Metric Container */
.metric-card {
    background-color: #1e293b;
    border: 1px solid #334155;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 12px;
}

.metric-label {
    font-size: 11px;
    color: #94a3b8;
    text-transform: uppercase;
    font-weight: bold;
    letter-spacing: 0.5px;
}

.metric-value {
    font-size: 14px;
    color: #f8fafc;
    font-family: monospace;
    font-weight: bold;
    margin-top: 4px;
}
</style>
""", unsafe_allow_html=True)

# Main Title Headers
st.markdown('<div class="title-gradient">🌌 Embabel Planner</div>', unsafe_allow_html=True)
st.markdown('<div class="subtitle-mint">GOAP Orchestrator & Agent Debug Console</div>', unsafe_allow_html=True)

# Preset Goals / Demo Mode
presets = {
    "Prague 🇨🇿": "Plan a weekend in Prague",
    "Tokyo 🇯🇵": "Plan a budget trip to Tokyo",
    "Jaipur 🇮🇳": "Plan a 3-day trip to Jaipur",
    "Vienna 🇦🇹": "Plan a trip to Vienna"
}

if "goal_val" not in st.session_state:
    st.session_state.goal_val = "Plan a weekend in Prague"

st.caption("💡 Select a demo preset to autofill the goal prompt:")
cols = st.columns(len(presets))
for idx, (label, val) in enumerate(presets.items()):
    if cols[idx].button(label, key=f"btn_preset_{idx}", use_container_width=True):
        st.session_state.goal_val = val

# Goal Input
goal_input = st.text_input("🎯 Target Goal / User Input:", value=st.session_state.goal_val, key="goal_input_field")

# Sidebar Configuration
with st.sidebar:
    st.image("https://img.icons8.com/nolan/96/artificial-intelligence.png", width=64)
    st.markdown("### ⚙️ Orchestration Config")
    
    provider_selection = st.selectbox(
        "LLM Planning Provider:",
        options=["auto", "groq", "ollama"],
        index=0,
        help="Sets the LLM provider bean used by the gateway to decompose goals into tasks."
    )
    
    st.divider()
    st.markdown("### 📊 Planner Metadata")
    
    # Placeholder fields if no plan has run yet
    meta_provider = "None"
    meta_type = "None"
    meta_agents = "None"
    meta_actions_count = "0"
    meta_goal_status = "Inactive"
    meta_total_time = "0.0 ms"
    
    if "last_plan" in st.session_state:
        plan = st.session_state.last_plan
        meta_provider = plan.get("source", "PLANNER")
        meta_type = plan.get("classification", "dynamic_plan")
        
        # Extract unique agents
        agents = set()
        for step in plan.get("steps", []):
            if step.get("agent"):
                agents.add(step.get("agent"))
        meta_agents = ", ".join(agents) if agents else "SearchAgent"
        
        meta_actions_count = str(len(plan.get("steps", [])))
        meta_goal_status = "Achieved (Success)" if plan.get("status") == "Ready" else "Failed"
        if "elapsed_ms" in st.session_state:
            meta_total_time = f"{st.session_state.elapsed_ms:.1f} ms"

    # Render metadata cards
    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-label">Goal Description</div>
        <div class="metric-value" style="color: #10B981; font-family: sans-serif;">{goal_input}</div>
    </div>
    <div class="metric-card">
        <div class="metric-label">Resolved Provider / Source</div>
        <div class="metric-value">{meta_provider}</div>
    </div>
    <div class="metric-card">
        <div class="metric-label">Planner Type</div>
        <div class="metric-value">{meta_type}</div>
    </div>
    <div class="metric-card">
        <div class="metric-label">Agents Selected</div>
        <div class="metric-value">{meta_agents}</div>
    </div>
    <div class="metric-card">
        <div class="metric-label">Actions Executed</div>
        <div class="metric-value">{meta_actions_count}</div>
    </div>
    <div class="metric-card">
        <div class="metric-label">Goal Achieved Status</div>
        <div class="metric-value" style="color: {'#10B981' if 'Achieved' in meta_goal_status else '#94a3b8'};">{meta_goal_status}</div>
    </div>
    <div class="metric-card">
        <div class="metric-label">Gateway Roundtrip Time</div>
        <div class="metric-value">{meta_total_time}</div>
    </div>
    """, unsafe_allow_html=True)

# Trigger planning action
if st.button("🚀 Execute Goal", type="primary", use_container_width=True):
    if not goal_input.strip():
        st.error("Please enter a valid goal prompt before executing.")
    else:
        with st.spinner("Embabel GOAP Solver: Formulating optimal action graph and executing tools..."):
            start_time = time.time()
            response = generate_plan(goal_input, provider=provider_selection)
            end_time = time.time()
            
            elapsed_ms = (end_time - start_time) * 1000
            st.session_state.elapsed_ms = elapsed_ms
            
            if response.status_code == 200:
                plan_json = response.json()
                
                # Check if backend returned an error field inside 200 OK
                if "error" in plan_json:
                    st.session_state.last_error = plan_json["error"]
                    if "last_plan" in st.session_state:
                        del st.session_state.last_plan
                else:
                    st.session_state.last_plan = plan_json
                    st.session_state.raw_json = plan_json
                    if "last_error" in st.session_state:
                        del st.session_state.last_error
            else:
                status_code = getattr(response, 'status_code', 500)
                try:
                    err_details = response.json().get("error", getattr(response, 'text', str(response)))
                except Exception:
                    err_details = getattr(response, 'text', str(response))
                st.session_state.last_error = f"HTTP {status_code} Error: {err_details}"
                if "last_plan" in st.session_state:
                    del st.session_state.last_plan

# Render Error Viewer
if "last_error" in st.session_state:
    st.error(st.session_state.last_error)

# Render Dashboard Contents
if "last_plan" in st.session_state:
    plan_data = st.session_state.last_plan
    
    # Columns for side-by-side components
    col_left, col_right = st.columns([1.1, 0.9])
    
    with col_left:
        # Render the formatted travel/generic report viewer
        render_report(plan_data)
        
    with col_right:
        # Render the dynamic Graphviz action dependency graph
        render_graph(plan_data)
        
        # Render the execution trace metrics & Blackboard Inspector
        render_trace(plan_data, st.session_state.get("elapsed_ms"))

    # Collapsible Raw JSON Inspector
    st.divider()
    with st.expander("🔍 Raw Planner JSON Response Inspector", expanded=False):
        st.caption("Complete HTTP payload returned by the Gateway Service `/api/plans` endpoint:")
        st.json(st.session_state.get("raw_json", {}))
