import streamlit as st
import graphviz

def render_graph(plan_data: dict):
    """
    Renders the action dependency graph dynamically using Graphviz based on preconditions and effects.
    """
    st.subheader("🕸️ Planner Dependency Graph")
    
    trace = plan_data.get("trace", [])
    if not trace:
        st.info("No trace data available to generate dependency graph.")
        return
        
    dot = graphviz.Digraph(comment='Planner Dependencies')
    
    # Styled dark-theme properties matching the Mint-on-Black style
    dot.attr(bgcolor='transparent')
    dot.attr('node', shape='box', style='filled,rounded', color='#10B981', fontcolor='#000000', fontname='Courier', fontsize='10')
    dot.attr('edge', color='#10B981', fontcolor='#9CA3AF', fontname='Courier', fontsize='9', arrowhead='vee')

    nodes_added = set()
    actions_list = []
    
    # 1. Add nodes for each action step
    for idx, item in enumerate(trace):
        action_full = item.get("action", "")
        action_name = action_full.split(".")[-1]
        actions_list.append((action_name, item))
        
        # Styled action node
        dot.node(action_name, f"{action_name}\n(Step {idx + 1})")
        nodes_added.add(action_name)
        
    # 2. Add edges by matching preconditions of an action to preceding effects
    for i, (action_name, item) in enumerate(actions_list):
        preconditions = item.get("preconditions_checked", [])
        
        for pre in preconditions:
            edge_drawn = False
            # Search backward to find the action that satisfies this precondition
            for j in range(i - 1, -1, -1):
                prev_action_name, prev_item = actions_list[j]
                prev_effects = prev_item.get("effects_applied", [])
                
                if pre in prev_effects:
                    simple_pre = pre.split(".")[-1].split("$")[-1]
                    dot.edge(prev_action_name, action_name, label=f" {simple_pre} ")
                    edge_drawn = True
                    break
            
            # If it is an initial state variable (e.g. UserInput)
            if not edge_drawn:
                simple_pre = pre.split(".")[-1].split("$")[-1]
                init_node = f"Init_{simple_pre}"
                if init_node not in nodes_added:
                    dot.node(init_node, simple_pre, shape='ellipse', color='#4B5563', fontcolor='#10B981')
                    nodes_added.add(init_node)
                dot.edge(init_node, action_name)

    try:
        st.graphviz_chart(dot)
    except Exception as e:
        # Fallback in case Graphviz binary dependencies are missing on the host machine
        st.warning("Graphviz system binary not found. Rendering textual representation of the plan graph:")
        
        for action_name, item in actions_list:
            pre_list = [p.split(".")[-1].split("$")[-1] for p in item.get("preconditions_checked", [])]
            eff_list = [e.split(".")[-1].split("$")[-1] for e in item.get("effects_applied", [])]
            
            st.markdown(f"**Step: `{action_name}`**")
            st.markdown(f"  * 📥 Preconditions: `{', '.join(pre_list) if pre_list else 'None'}`")
            st.markdown(f"  * 📤 Effects: `{', '.join(eff_list) if eff_list else 'None'}`")
            st.divider()
