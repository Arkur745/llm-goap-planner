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
    from datetime import date, timedelta

    lines = [
        "gantt",
        "    title Project Plan",
        "    dateFormat YYYY-MM-DD",
        "    axisFormat %b %d",
        "    section Tasks"
    ]

    base = date(2024, 1, 1)
    day_offset = 0

    for task in plan["tasks"]:
        tid = task["id"]
        desc = task["description"].replace(":", "")
        start = base + timedelta(days=day_offset)
        lines.append(f"    {desc} : {tid}, {start}, 2d")
        day_offset += 2

    return "\n".join(lines)
