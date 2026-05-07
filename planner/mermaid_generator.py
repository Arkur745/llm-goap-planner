def generate_flowchart(plan: dict) -> str:
    lines = ["graph TD"]

    tasks = plan["tasks"]

    # START / END nodes
    lines.append('START(("Start"))')
    lines.append('END(("End"))')

    # collect ids
    task_ids = {t["id"] for t in tasks}

    # track which nodes are depended upon (to find leaves)
    depended_on = set()

    for task in tasks:
        tid = task["id"]
        label = task["description"].replace('"', '')

        # node
        lines.append(f'{tid}["{label}"]')

        if not task["dependencies"]:
            # root tasks connect from START
            lines.append(f"START --> {tid}")

        for dep in task["dependencies"]:
            lines.append(f"{dep} --> {tid}")
            depended_on.add(dep)

    # leaf nodes (no one depends on them)
    leaf_nodes = task_ids - depended_on
    for leaf in leaf_nodes:
        lines.append(f"{leaf} --> END")

    # optional: nicer spacing
    lines.append("classDef default fill:#eef,stroke:#88a,stroke-width:1px;")

    return "\n".join(lines)


def generate_gantt(plan: dict) -> str:
    from datetime import date
    from collections import OrderedDict

    lines = [
        "gantt",
        "    title Execution Timeline",
        "    dateFormat YYYY-MM-DD",
        "    axisFormat %b %d",
        "    tickInterval 1day",
        "    excludes weekends",
    ]

    # Group tasks by agent for section headers
    grouped: OrderedDict = OrderedDict()
    for task in plan["tasks"]:
        agent = task.get("agent", "General")
        grouped.setdefault(agent, []).append(task)

    prev_id = None
    base = date(2024, 1, 1)

    for agent, tasks in grouped.items():
        safe_agent = agent.replace(":", "").replace(";", "")
        lines.append(f"    section {safe_agent}")
        for task in tasks:
            tid = task["id"]
            desc = task["description"].replace(":", "").replace(";", "").replace("#", "")
            if len(desc) > 40:
                desc = desc[:37] + "..."

            if prev_id is None:
                lines.append(f"    {desc} : {tid}, {base}, 3d")
            else:
                lines.append(f"    {desc} : {tid}, after {prev_id}, 3d")
            prev_id = tid

    return "\n".join(lines)
