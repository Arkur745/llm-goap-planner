import streamlit as st
import re

def render_report(plan_data: dict):
    """
    Renders the plan outputs, checking for travel report structures and fallback steps.
    """
    st.subheader("📋 Final Plan Report")
    
    # 1. Look for steps/tasks that have outputs
    steps = plan_data.get("steps", [])
    
    # Find any step with output
    final_output = None
    for step in reversed(steps):
        if step.get("output"):
            final_output = step.get("output")
            break
            
    # If no output in steps, check summary or tasks
    if not final_output:
        final_output = plan_data.get("summary")
        
    if not final_output:
        st.info("No execution output returned by the planner.")
        return

    # Check if the output follows the TravelPlanReport section format
    has_travel_sections = any(
        h in final_output for h in ["[1] Travel Summary", "[2] Search Highlights", "[3] Budget Estimate", "[4] Weather Forecast"]
    )
    
    if has_travel_sections:
        # Parse sections using regex
        sections = {
            "Travel Summary": "",
            "Search Highlights": "",
            "Budget Estimate": "",
            "Weather Forecast": ""
        }
        
        # Regex to split sections
        pattern = r"\[1\] Travel Summary\n-*\n(.*?)(?=\[2\]|$)|\[2\] Search Highlights\n-*\n(.*?)(?=\[3\]|$)|\[3\] Budget Estimate\n-*\n(.*?)(?=\[4\]|$)|\[4\] Weather Forecast\n-*\n(.*?)(?=$)"
        matches = re.findall(pattern, final_output, re.DOTALL)
        
        # Mapping matches back to section dictionary
        sections_list = ["Travel Summary", "Search Highlights", "Budget Estimate", "Weather Forecast"]
        for match in matches:
            for idx, content in enumerate(match):
                if content.strip():
                    sections[sections_list[idx]] = content.strip()
                    
        # Render tabs for travel sections
        tabs = st.tabs(sections_list)
        for i, tab_name in enumerate(sections_list):
            with tabs[i]:
                content = sections[tab_name]
                if content:
                    st.markdown(f"```text\n{content}\n```" if "Breakdown" in content or "cost" in content else content)
                else:
                    st.write("*No details available for this section.*")
    else:
        # Render generic output
        st.markdown("### Execution Summary")
        st.info(final_output)
        
    # Always display a summary of steps below the report
    with st.expander("📝 Planned Steps Sequence Details", expanded=False):
        for idx, step in enumerate(steps):
            order = step.get("order", idx + 1)
            title = step.get("title", f"Step {order}")
            details = step.get("details", "")
            agent = step.get("agent", "UnknownAgent")
            output = step.get("output")
            
            st.markdown(f"**Step {order}: {title}** (Executed by: `{agent}`)")
            if details:
                st.caption(details)
            if output:
                st.text_area(f"Output of Step {order}", output, height=100, disabled=True)
            st.divider()
