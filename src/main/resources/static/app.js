const apiEndpoint = "/api/plans";
let latestDiagram = "";
let latestGantt = "";
let latestAssignments = [];
let loadingInterval = null;
let lastGoal = "";
const loadingSteps = [
  { step: "generating", text: "Generating plan..." },
  { step: "analyzing", text: "Analyzing goal..." },
  { step: "assigning", text: "Assigning agents..." },
];
let currentLoadingStep = 0;

const ErrorTypes = {
  VALIDATION: "validation",
  NETWORK: "network",
  SERVER: "server",
  PARSE: "parse",
  UNKNOWN: "unknown",
};

const GANTT_COLORS = [
  { bar: "#6366f1", bg: "#f5f3ff", text: "#4338ca" }, // Indigo
  { bar: "#0ea5e9", bg: "#f0f9ff", text: "#0369a1" }, // Sky
  { bar: "#10b981", bg: "#ecfdf5", text: "#047857" }, // Emerald
  { bar: "#f59e0b", bg: "#fffbeb", text: "#b45309" }, // Amber
  { bar: "#ec4899", bg: "#fdf2f8", text: "#be185d" }, // Pink
  { bar: "#8b5cf6", bg: "#f5f3ff", text: "#6d28d9" }, // Violet
];

let currentZoom = 1;
let hiddenAgents = new Set();

document.addEventListener("DOMContentLoaded", () => {
  const goalForm = document.getElementById("goalForm");
  const goalInput = document.getElementById("goalInput");
  const copyDiagramBtn = document.getElementById("copyDiagramBtn");
  const copyGanttBtn = document.getElementById("copyGanttBtn");
  const copyAssignmentsBtn = document.getElementById("copyAssignmentsBtn");
  const copyTraceBtn = document.getElementById("copyTraceBtn");

  if (window.mermaid) {
    window.mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: "base",
      flowchart: {
        nodeSpacing: 50,
        rankSpacing: 40,
        padding: 10,
        htmlLabels: true,
      },
      gantt: {
        barHeight: 28,
        barGap: 8,
        topPadding: 60,
        rightPadding: 40,
        leftPadding: 100,
        gridLineStartPadding: 40,
        fontSize: 13,
        sectionFontSize: 14,
        numberSectionStyles: 4,
        axisFormat: "%b %d",
        useWidth: 900,
      },
      themeVariables: {
        primaryColor: "#dbeafe",
        primaryBorderColor: "#3b82f6",
        primaryTextColor: "#1e293b",
        secondaryColor: "#e0e7ff",
        tertiaryColor: "#f0fdf4",
        primaryBorderWidth: "1.5px",
        lineColor: "#94a3b8",
        fontSize: "13px",
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        gantt0: "#3b82f6",
        gantt1: "#6366f1",
        gantt2: "#8b5cf6",
        gantt3: "#06b6d4",
        gantt4: "#10b981",
        gantt5: "#f59e0b",
      },
    });
  }

  // Handle tool options toggling
  const toolOptions = document.querySelectorAll(".tool-option");
  toolOptions.forEach(option => {
    const checkbox = option.querySelector("input");
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        option.classList.add("selected");
      } else {
        option.classList.remove("selected");
      }
    });
  });

  goalForm.addEventListener("submit", (event) => {
    event.preventDefault();
    generatePlan();
  });

  goalInput.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      generatePlan();
    }
  });

  copyDiagramBtn.addEventListener("click", async () => {
    if (!latestDiagram) {
      setStatus("No diagram is available to copy yet.");
      return;
    }

    try {
      await navigator.clipboard.writeText(latestDiagram);
      setStatus("Mermaid diagram copied to clipboard.");
    } catch (error) {
      setStatus("Copy failed. Your browser may block clipboard access.");
    }
  });

  copyGanttBtn.addEventListener("click", async () => {
    if (!latestGantt) {
      setStatus("No Gantt chart is available to copy yet.");
      return;
    }

    try {
      await navigator.clipboard.writeText(latestGantt);
      setStatus("Mermaid Gantt chart copied to clipboard.");
    } catch (error) {
      setStatus("Copy failed. Your browser may block clipboard access.");
    }
  });

  copyAssignmentsBtn.addEventListener("click", async () => {
    if (!latestAssignments.length) {
      setStatus("No agent table is available to copy yet.");
      return;
    }

    const lines = ["Step\tAgent\tCapability\tStatus\tHandoff"];
    latestAssignments.forEach((assignment) => {
      lines.push(
        `${assignment.stepTitle}\t${assignment.agent}\t${assignment.capability}\t${assignment.status}\t${assignment.handoffTo}`,
      );
    });

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setStatus("Agent assignment table copied to clipboard.");
    } catch (error) {
      setStatus("Copy failed. Your browser may block clipboard access.");
    }
  });

  if (copyTraceBtn) {
    copyTraceBtn.addEventListener("click", async () => {
        const traceLog = document.getElementById("traceLog");
        if (!traceLog || traceLog.innerText.includes("No trace data")) {
            setStatus("No trace data available to copy.");
            return;
        }
        try {
            await navigator.clipboard.writeText(traceLog.innerText);
            setStatus("Trace log copied to clipboard.");
        } catch (error) {
            setStatus("Copy failed.");
        }
    });
  }

  // Bind error action buttons
  const retryBtn = document.getElementById("retryBtn");
  const clearBtn = document.getElementById("clearBtn");
  if (retryBtn) retryBtn.addEventListener("click", generatePlan);
  if (clearBtn)
    clearBtn.addEventListener("click", () => {
      document.getElementById("goalInput").value = "";
      clearStates();
      document.getElementById("emptyState").classList.remove("hidden");
    });

  // Setup tab buttons
  setupTabButtons();

  // Timeline controls
  const zoomInBtn = document.getElementById("zoomInBtn");
  const zoomOutBtn = document.getElementById("zoomOutBtn");
  const filterBtn = document.getElementById("filterBtn");
  const zoomLabel = document.getElementById("zoomLabel");

  if (zoomInBtn) {
    zoomInBtn.onclick = () => {
      if (currentZoom < 2.5) {
        currentZoom += 0.25;
        zoomLabel.textContent = `${Math.round(currentZoom * 100)}%`;
        if (latestGantt) renderGantt(document.getElementById("ganttContainer"), latestGantt);
      }
    };
  }
  if (zoomOutBtn) {
    zoomOutBtn.onclick = () => {
      if (currentZoom > 0.4) {
        currentZoom -= 0.25;
        zoomLabel.textContent = `${Math.round(currentZoom * 100)}%`;
        if (latestGantt) renderGantt(document.getElementById("ganttContainer"), latestGantt);
      }
    };
  }
  if (filterBtn) {
    filterBtn.onclick = () => {
        const { agents } = parseGanttSyntax(latestGantt);
        if (!agents.length) return;
        const agent = prompt(`Toggle Agent visibility:\n${agents.join(", ")}\n\nCurrently hidden: ${Array.from(hiddenAgents).join(", ") || "None"}`);
        if (agent) {
            const found = agents.find(a => a.toLowerCase() === agent.toLowerCase());
            if (found) {
                if (hiddenAgents.has(found)) hiddenAgents.delete(found);
                else hiddenAgents.add(found);
                renderGantt(document.getElementById("ganttContainer"), latestGantt);
            }
        }
    };
  }
});

async function generatePlan() {
  const goalInput = document.getElementById("goalInput");
  const goal = goalInput.value.trim();

  // Gather selected tools
  const selectedTools = Array.from(document.querySelectorAll('input[name="tool"]:checked'))
    .map(cb => cb.value);

  if (!goal) {
    showError(
      "Please enter a goal before generating a plan.",
      ErrorTypes.VALIDATION,
      "VALIDATION_ERROR",
    );
    return;
  }

  lastGoal = goal;
  clearStates();
  setLoading(true);

  try {
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ goal, tools: selectedTools }),
    });

    const responseText = await response.text();
    let payload;
    try {
      payload = responseText ? JSON.parse(responseText) : null;
    } catch (parseError) {
      throw {
        type: ErrorTypes.PARSE,
        message: "Invalid server response format.",
      };
    }

    // Capture server-provided source header (LLM or BLUEPRINT)
    const sourceHeader = response.headers.get("X-Plan-Source");
    if (payload) payload.source = sourceHeader || "UNKNOWN";

    if (!response.ok) {
      const errorType =
        response.status >= 500 ? ErrorTypes.SERVER : ErrorTypes.NETWORK;
      throw {
        type: errorType,
        message:
          payload?.message ||
          payload?.error ||
          `Server error (${response.status})`,
        code: `HTTP_${response.status}`,
      };
    }

    renderPlan(payload);
    const src =
      payload && payload.source
        ? (payload.source || "UNKNOWN").toUpperCase()
        : "UNKNOWN";
    const srcLabel =
      src === "PLANNER"
        ? "Dynamic Planner"
        : src === "LLM"
          ? "LLM (Llama)"
          : src === "BLUEPRINT"
            ? "Blueprint (fallback)"
            : src;
    setStatus(`Plan generated successfully. (Generated by: ${srcLabel})`);
  } catch (error) {
    let errorType = ErrorTypes.UNKNOWN;
    let errorCode = "UNKNOWN_ERROR";
    let message = error.message || "An unexpected error occurred.";

    if (error.type) {
      errorType = error.type;
      errorCode = error.code || "ERROR";
    } else if (error instanceof TypeError) {
      errorType = ErrorTypes.NETWORK;
      errorCode = "NETWORK_ERROR";
      message = "Network connection failed. Check your internet connection.";
    }

    showError(message, errorType, errorCode);
  } finally {
    setLoading(false);
  }
}

function renderPlan(plan) {
  const emptyState = document.getElementById("emptyState");
  const planContent = document.getElementById("planContent");
  const visualizationDashboard = document.getElementById(
    "visualizationDashboard",
  );
  const planGoal = document.getElementById("planGoal");
  const planStatus = document.getElementById("planStatus");
  const planGeneratedAt = document.getElementById("planGeneratedAt");
  const planSummary = document.getElementById("planSummary");
  const planSteps = document.getElementById("planSteps");
  const assignmentRows = document.getElementById("assignmentRows");
  const diagramContainer = document.getElementById("diagramContainer");
  const ganttContainer = document.getElementById("ganttContainer");
  const dashboardSummary = document.getElementById("dashboardSummary");

  emptyState.classList.add("hidden");
  planContent.classList.remove("hidden");
  visualizationDashboard.classList.remove("hidden");

  planGoal.textContent = plan.goal || "Untitled goal";
  planStatus.textContent = plan.status || "Ready";
  planGeneratedAt.textContent = formatTimestamp(plan.generatedAt);
  planSummary.textContent =
    plan.summary || "No summary was returned by the backend.";
  dashboardSummary.textContent = plan.summary || "No summary available.";

  // Show plan source if available (friendly label)
  const planSourceEl = document.getElementById("planSource");
  const friendly = (plan.source || "UNKNOWN").toUpperCase();
  const friendlyLabel =
    friendly === "PLANNER"
      ? "Dynamic Planner"
      : friendly === "LLM"
        ? "LLM (Llama)"
        : friendly === "BLUEPRINT"
          ? "Blueprint (fallback)"
          : friendly;
  if (planSourceEl) planSourceEl.textContent = friendlyLabel;

  planSteps.innerHTML = "";
  (plan.steps || []).forEach((step) => {
    const item = document.createElement("li");
    item.className = "step-item";
    
    let outputHtml = "";
    if (step.output) {
        outputHtml = `
            <div class="step-output">
                <strong>Simulated Result (${escapeHtml(step.agent || "Agent")})</strong>
                ${escapeHtml(step.output)}
            </div>
        `;
    }

    item.innerHTML = `
      <div class="step-index">${escapeHtml(String(step.order))}</div>
      <div class="step-copy">
        <h4>${escapeHtml(step.title || "Step")}</h4>
        <p>${escapeHtml(step.details || "")}</p>
        ${outputHtml}
      </div>
    `;
    planSteps.appendChild(item);
  });

  latestAssignments = plan.assignments || [];
  // If assignments are empty but steps have agents, synthesize assignments
  if (!latestAssignments.length && plan.steps) {
      latestAssignments = plan.steps.map(s => ({
          stepTitle: s.title,
          agent: s.agent || "SearchAgent",
          capability: "Action Execution",
          status: s.output ? "Complete" : "Ready",
          handoffTo: "Next Task",
          rationale: "Assigned by dynamic planner"
      }));
  }
  renderAssignments(assignmentRows, latestAssignments);

  // Update metrics
  updateMetrics(plan);

  latestDiagram = plan.mermaidDiagram || "";
  renderDiagram(diagramContainer, latestDiagram);

  latestGantt = plan.ganttDiagram || "";
  renderGantt(ganttContainer, latestGantt, plan.steps ? plan.steps.length : 4);

  // Render trace if available
  renderTrace(plan.trace);
}

function renderTrace(trace) {
    const traceLog = document.getElementById("traceLog");
    if (!traceLog) return;

    if (!trace || !trace.length) {
        traceLog.innerHTML = '<div class="empty-cell">No trace data available for this plan type.</div>';
        return;
    }

    traceLog.innerHTML = "";
    trace.forEach(entry => {
        const item = document.createElement("div");
        item.className = "trace-entry";
        
        const stateBefore = entry.state_before ? JSON.stringify(entry.state_before, null, 2) : "[]";
        const stateAfter = entry.state_after ? JSON.stringify(entry.state_after, null, 2) : "[]";

        item.innerHTML = `
            <span class="trace-action">> ${escapeHtml(entry.action || "Execute Action")}</span>
            <div class="trace-states">
                <div>
                    <div class="trace-state-label">Before</div>
                    <pre class="trace-state-value">${escapeHtml(stateBefore)}</pre>
                </div>
                <div>
                    <div class="trace-state-label">After</div>
                    <pre class="trace-state-value">${escapeHtml(stateAfter)}</pre>
                </div>
            </div>
        `;
        traceLog.appendChild(item);
    });
}

function renderAssignments(container, assignments) {
  container.innerHTML = "";

  if (!assignments.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="5" class="empty-cell">No assignments returned.</td>`;
    container.appendChild(row);
    return;
  }

  assignments.forEach((assignment) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <span class="assignment-step">${escapeHtml(assignment.stepTitle || "Step")}</span>
        <p class="assignment-rationale">${escapeHtml(assignment.rationale || "")}</p>
      </td>
      <td><span class="assignment-agent">${escapeHtml(assignment.agent || "Agent")}</span></td>
      <td>${escapeHtml(assignment.capability || "-")}</td>
      <td><span class="assignment-status status-${toSlug(assignment.status || "unknown")}">${escapeHtml(assignment.status || "Unknown")}</span></td>
      <td>${escapeHtml(assignment.handoffTo || "-")}</td>
    `;
    container.appendChild(row);
  });
}

async function renderDiagram(container, diagramCode) {
  if (!diagramCode) {
    container.innerHTML =
      "<p class='diagram-fallback'>No diagram code was generated. Please try again.</p>";
    return;
  }

  if (!window.mermaid) {
    container.innerHTML = `<pre class="diagram-fallback">${escapeHtml(diagramCode)}</pre>`;
    return;
  }

  container.innerHTML =
    '<div class="diagram-loading"><div class="spinner"></div><p>Rendering diagram...</p></div>';

  try {
    const diagramId = `diagram-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const { svg } = await window.mermaid.render(diagramId, diagramCode);
    container.innerHTML = `<div class="diagram-wrapper">${svg}</div>`;
  } catch (error) {
    console.error("Mermaid rendering error:", error);
    container.innerHTML = `<div class="diagram-error">
      <p><strong>Diagram rendering failed:</strong></p>
      <pre class="diagram-fallback">${escapeHtml(diagramCode)}</pre>
    </div>`;
  }
}

// ─── Custom Timeline Renderer ────────────────────────────────────────────────
// Parses the Mermaid gantt syntax string and renders a premium custom SVG
// timeline. Mermaid syntax is still stored in latestGantt for copy button.

function parseGanttSyntax(mermaidCode) {
  const lines = (mermaidCode || "").split("\n").map(l => l.trim()).filter(Boolean);
  const BASE_DATE = new Date("2024-01-01");
  const tasks = [];
  const agentOrder = [];
  let currentAgent = "General";
  let dayCounter = 0;

  for (const line of lines) {
    if (!line || line.startsWith("gantt") || line.startsWith("title") ||
        line.startsWith("dateFormat") || line.startsWith("axisFormat") ||
        line.startsWith("tickInterval") || line.startsWith("excludes")) continue;

    if (line.startsWith("section ")) {
      currentAgent = line.replace("section ", "").trim();
      if (!agentOrder.includes(currentAgent)) agentOrder.push(currentAgent);
      continue;
    }

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    
    const label = line.substring(0, colonIdx).trim();
    const rest = line.substring(colonIdx + 1).trim();
    const parts = rest.split(",").map(p => p.trim());
    if (parts.length < 1) continue;

    // Handle status prefix if exists (e.g. "done id1")
    let idPart = parts[0];
    let status = "queued";
    if (idPart.includes(" ")) {
        const spaceIdx = idPart.indexOf(" ");
        const first = idPart.substring(0, spaceIdx);
        if (["done", "active", "crit"].includes(first)) {
            status = first;
            idPart = idPart.substring(spaceIdx + 1);
        }
    }

    const id = idPart;
    const durStr = parts[parts.length - 1];
    const duration = parseInt(durStr) || 3;
    let startDay = dayCounter;
    let dependsOn = null;

    if (parts.length >= 2) {
      for (let i = 1; i < parts.length - 1; i++) {
        const part = parts[i];
        if (part.startsWith("after ")) {
          dependsOn = part.replace("after ", "").trim();
          const refTask = tasks.find(t => t.id === dependsOn);
          if (refTask) startDay = refTask.startDay + refTask.duration;
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(part)) {
          const refDate = new Date(part);
          startDay = Math.round((refDate - BASE_DATE) / 86400000);
        }
      }
    }

    tasks.push({ id, label, agent: currentAgent, startDay, duration, dependsOn, status });
    dayCounter = Math.max(dayCounter, startDay + duration);
    if (!agentOrder.includes(currentAgent)) agentOrder.push(currentAgent);
  }

  return { tasks, agents: agentOrder };
}

async function renderGantt(container, diagramCode) {
  if (!diagramCode) {
    container.innerHTML = "<p class='diagram-fallback'>No timeline was generated.</p>";
    return;
  }

  const { tasks, agents } = parseGanttSyntax(diagramCode);
  const visibleAgents = agents.filter(a => !hiddenAgents.has(a));
  const visibleTasks = tasks.filter(t => !hiddenAgents.has(t.agent));
  
  if (!visibleTasks.length && !tasks.length) {
    container.innerHTML = `<pre class="diagram-fallback">${escapeHtml(diagramCode)}</pre>`;
    return;
  }

  // Layout Constants (scaled by currentZoom)
  const SIDEBAR_W = 200;
  const DAY_W = 48 * currentZoom;
  const ROW_H = 56;
  const BAR_H = 24;
  const BAR_Y_OFF = (ROW_H - BAR_H) / 2;
  const HEADER_H = 80;
  
  const maxDay = Math.max(...visibleTasks.map(t => t.startDay + t.duration), 0) + 2;
  const totalW = Math.max(800, SIDEBAR_W + (maxDay * DAY_W) + 300);

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", totalW);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Execution Timeline Gantt Chart");
  svg.style.userSelect = "none";
  
  let currentY = HEADER_H;
  const taskPositions = new Map();
  visibleAgents.forEach(agent => {
    const agentTasks = visibleTasks.filter(t => t.agent === agent);
    agentTasks.forEach((task, i) => {
      taskPositions.set(task.id, currentY + (i * ROW_H));
    });
    currentY += agentTasks.length * ROW_H;
  });

  const fullHeight = Math.max(400, currentY + 40);
  svg.setAttribute("height", fullHeight);

  const gridLayer = document.createElementNS(svgNS, "g");
  const connectionLayer = document.createElementNS(svgNS, "g");
  const barsLayer = document.createElementNS(svgNS, "g");
  const headerLayer = document.createElementNS(svgNS, "g");
  const sidebarLayer = document.createElementNS(svgNS, "g");

  // Grid & Axis
  const tickEvery = currentZoom < 0.7 ? 7 : maxDay > 20 ? 4 : maxDay > 10 ? 2 : 1;
  const baseDate = new Date("2024-01-01");
  for (let d = 0; d <= maxDay; d++) {
    const x = SIDEBAR_W + (d * DAY_W);
    if (d % tickEvery === 0) {
      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", x);
      line.setAttribute("y1", HEADER_H);
      line.setAttribute("x2", x);
      line.setAttribute("y2", fullHeight - 40);
      line.setAttribute("stroke", "#e2e8f0");
      gridLayer.appendChild(line);

      const date = new Date(baseDate);
      date.setDate(date.getDate() + d);
      const text = document.createElementNS(svgNS, "text");
      text.setAttribute("x", x);
      text.setAttribute("y", 50);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("font-size", "11");
      text.setAttribute("font-weight", "700");
      text.setAttribute("fill", "#64748b");
      text.textContent = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      headerLayer.appendChild(text);
    }
  }

  // Draw Connections
  visibleTasks.forEach(task => {
    if (task.dependsOn && taskPositions.has(task.id) && taskPositions.has(task.dependsOn)) {
      const parent = visibleTasks.find(t => t.id === task.dependsOn);
      if (parent) {
        const x1 = SIDEBAR_W + (parent.startDay + parent.duration) * DAY_W - 4;
        const y1 = taskPositions.get(parent.id) + ROW_H / 2;
        const x2 = SIDEBAR_W + task.startDay * DAY_W;
        const y2 = taskPositions.get(task.id) + ROW_H / 2;

        const path = document.createElementNS(svgNS, "path");
        const cp = Math.min(30, (x2 - x1) / 2);
        const d = `M ${x1} ${y1} C ${x1 + cp} ${y1}, ${x2 - cp} ${y2}, ${x2} ${y2}`;
        path.setAttribute("d", d);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "#cbd5e1");
        path.setAttribute("stroke-width", "1.5");
        path.setAttribute("class", `handoff-line conn-${task.id} conn-parent-${parent.id}`);
        connectionLayer.appendChild(path);
      }
    }
  });

  // Lanes & Tasks
  currentY = HEADER_H;
  visibleAgents.forEach((agent, ai) => {
    const color = GANTT_COLORS[ai % GANTT_COLORS.length];
    const agentTasks = visibleTasks.filter(t => t.agent === agent);
    const laneH = agentTasks.length * ROW_H;

    const sidebar = document.createElementNS(svgNS, "rect");
    sidebar.setAttribute("x", 0);
    sidebar.setAttribute("y", currentY);
    sidebar.setAttribute("width", SIDEBAR_W);
    sidebar.setAttribute("height", laneH);
    sidebar.setAttribute("fill", "#f8fafc");
    sidebarLayer.appendChild(sidebar);

    const agentText = document.createElementNS(svgNS, "text");
    agentText.setAttribute("x", 16);
    agentText.setAttribute("y", currentY + 32);
    agentText.setAttribute("font-weight", "800");
    agentText.setAttribute("font-size", "11");
    agentText.setAttribute("fill", color.text);
    agentText.setAttribute("text-transform", "uppercase");
    agentText.textContent = agent;
    sidebarLayer.appendChild(agentText);

    agentTasks.forEach((task, ti) => {
      const taskY = currentY + (ti * ROW_H);
      const barX = SIDEBAR_W + (task.startDay * DAY_W);
      const barW = Math.max(task.duration * DAY_W - 8, 12);

      const group = document.createElementNS(svgNS, "g");
      group.setAttribute("class", "task-group");
      group.setAttribute("tabindex", "0");
      group.setAttribute("role", "button");
      group.setAttribute("aria-label", `Task: ${task.label}, Status: ${task.status}`);
      
      const bar = document.createElementNS(svgNS, "rect");
      bar.setAttribute("x", barX);
      bar.setAttribute("y", taskY + BAR_Y_OFF);
      bar.setAttribute("width", barW);
      bar.setAttribute("height", BAR_H);
      bar.setAttribute("rx", "6");
      bar.setAttribute("fill", task.status === "done" ? "#10b981" : task.status === "active" ? color.bar : "#94a3b8");
      bar.setAttribute("opacity", task.status === "done" ? "0.8" : "1");
      group.appendChild(bar);

      // Status Icon (small circle or emoji)
      const statusIcon = document.createElementNS(svgNS, "text");
      statusIcon.setAttribute("x", barX + 6);
      statusIcon.setAttribute("y", taskY + BAR_Y_OFF + 16);
      statusIcon.setAttribute("font-size", "10");
      statusIcon.setAttribute("fill", "#fff");
      statusIcon.textContent = task.status === "done" ? "✓" : task.status === "active" ? "●" : "○";
      group.appendChild(statusIcon);

      const label = document.createElementNS(svgNS, "text");
      label.setAttribute("x", barX + barW + 12);
      label.setAttribute("y", taskY + ROW_H / 2 + 5);
      label.setAttribute("font-size", "13");
      label.setAttribute("font-weight", "600");
      label.setAttribute("fill", "#1e293b");
      label.textContent = task.label;
      group.appendChild(label);

      const title = document.createElementNS(svgNS, "title");
      title.textContent = `${task.label}\nStatus: ${task.status}\nAgent: ${task.agent}`;
      group.appendChild(title);

      // Hover Interaction
      group.onmouseenter = () => {
        bar.setAttribute("filter", "brightness(1.1)");
        const conns = connectionLayer.querySelectorAll(`.conn-${task.id}, .conn-parent-${task.id}`);
        conns.forEach(c => {
          c.setAttribute("stroke", color.bar);
          c.setAttribute("stroke-width", "2.5");
        });
      };
      group.onmouseleave = () => {
        bar.setAttribute("filter", "none");
        const conns = connectionLayer.querySelectorAll(`.conn-${task.id}, .conn-parent-${task.id}`);
        conns.forEach(c => {
          c.setAttribute("stroke", "#cbd5e1");
          c.setAttribute("stroke-width", "1.5");
        });
      };

      barsLayer.appendChild(group);
    });

    const sep = document.createElementNS(svgNS, "line");
    sep.setAttribute("x1", 0);
    sep.setAttribute("y1", currentY + laneH);
    sep.setAttribute("x2", totalW);
    sep.setAttribute("y2", currentY + laneH);
    sep.setAttribute("stroke", "#e2e8f0");
    gridLayer.appendChild(sep);

    currentY += laneH;
  });

  const vSep = document.createElementNS(svgNS, "line");
  vSep.setAttribute("x1", SIDEBAR_W);
  vSep.setAttribute("y1", 0);
  vSep.setAttribute("x2", SIDEBAR_W);
  vSep.setAttribute("y2", fullHeight);
  vSep.setAttribute("stroke", "#cbd5e1");
  vSep.setAttribute("stroke-width", "2");
  gridLayer.appendChild(vSep);

  svg.appendChild(gridLayer);
  svg.appendChild(connectionLayer);
  svg.appendChild(barsLayer);
  svg.appendChild(headerLayer);
  svg.appendChild(sidebarLayer);

  container.innerHTML = "";
  const wrapper = document.createElement("div");
  wrapper.className = "gantt-wrapper";
  wrapper.appendChild(svg);
  container.appendChild(wrapper);
}

function clearStates() {
  const emptyState = document.getElementById("emptyState");
  const errorState = document.getElementById("errorState");
  const loadingState = document.getElementById("loadingState");

  if (loadingInterval) clearInterval(loadingInterval);

  Object.values(ErrorTypes).forEach((type) => {
    errorState.classList.remove(`error-${type}`);
  });

  errorState.classList.add("hidden");
  loadingState.classList.add("hidden");
  emptyState.classList.add("hidden");
}

function setLoading(isLoading) {
  const loadingState = document.getElementById("loadingState");
  const generateBtn = document.getElementById("generateBtn");

  if (isLoading) {
    currentLoadingStep = 0;
    loadingState.classList.remove("hidden");
    updateLoadingStep();

    if (loadingInterval) clearInterval(loadingInterval);
    loadingInterval = setInterval(updateLoadingStep, 800);
  } else {
    if (loadingInterval) clearInterval(loadingInterval);
    loadingState.classList.add("hidden");
  }

  generateBtn.disabled = isLoading;
  generateBtn.textContent = isLoading ? "Generating..." : "Generate plan";
}

function updateLoadingStep() {
  const config = loadingSteps[currentLoadingStep % loadingSteps.length];
  const stepText = document.getElementById("loadingStepText");

  if (stepText) {
    stepText.textContent = config.text;
  }

  document.querySelectorAll(".loading-step").forEach((el, idx) => {
    el.classList.remove("active", "complete");
    if (idx < currentLoadingStep) {
      el.classList.add("complete");
    } else if (idx === currentLoadingStep) {
      el.classList.add("active");
    }
  });

  currentLoadingStep++;
}

function showError(
  message,
  errorType = ErrorTypes.UNKNOWN,
  errorCode = "ERROR",
) {
  const errorState = document.getElementById("errorState");
  const errorMessage = document.getElementById("errorMessage");
  const errorCodeEl = document.getElementById("errorCode");
  const errorTitle = document.getElementById("errorTitle");
  const emptyState = document.getElementById("emptyState");
  const planContent = document.getElementById("planContent");
  const retryBtn = document.getElementById("retryBtn");

  const titleMap = {
    [ErrorTypes.VALIDATION]: "Invalid input",
    [ErrorTypes.NETWORK]: "Connection error",
    [ErrorTypes.SERVER]: "Server error",
    [ErrorTypes.PARSE]: "Response error",
    [ErrorTypes.UNKNOWN]: "Generation failed",
  };
  errorTitle.textContent = titleMap[errorType] || "Generation failed";
  errorState.classList.add(`error-${errorType}`);

  emptyState.classList.add("hidden");
  planContent.classList.add("hidden");
  errorMessage.textContent = message;
  errorCodeEl.textContent = `Error code: ${errorCode}`;
  errorState.classList.remove("hidden");

  retryBtn.onclick = () => generatePlan();
  setStatus(`Error: ${message}`);
}

function setStatus(message) {
  const statusBanner = document.getElementById("statusBanner");
  statusBanner.textContent = message;
}

function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };

  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

function formatTimestamp(value) {
  if (!value) return "Just now";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Just now";
  return parsed.toLocaleString();
}

function toSlug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function setupTabButtons() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabName = btn.getAttribute("data-tab");

      tabButtons.forEach((b) => b.classList.remove("active"));
      tabPanes.forEach((p) => p.classList.remove("active"));

      btn.classList.add("active");
      const pane = document.getElementById(`tab-${tabName}`);
      if (pane) {
        pane.classList.add("active");

        if (tabName === "flowchart" || tabName === "timeline") {
          setTimeout(() => {
            if (window.mermaid && latestDiagram && tabName === "flowchart") {
              const container = document.getElementById("diagramContainer");
              renderDiagram(container, latestDiagram);
            } else if (
              window.mermaid &&
              latestGantt &&
              tabName === "timeline"
            ) {
              const container = document.getElementById("ganttContainer");
              renderGantt(container, latestGantt);
            }
          }, 100);
        }
      }
    });
  });
}

function updateMetrics(plan) {
  const metricSteps = document.getElementById("metricSteps");
  const metricAgents = document.getElementById("metricAgents");
  const metricProgress = document.getElementById("metricProgress");

  const steps = plan.steps || [];
  const assignments = plan.assignments || [];
  
  // If assignments were synthesized or provided
  const finalAssignments = assignments.length ? assignments : (plan.steps || []).map(s => ({ agent: s.agent }));
  
  const inProgressCount = finalAssignments.filter(
    (a) => a.status && a.status.toLowerCase() === "in progress",
  ).length;

  if (metricSteps) metricSteps.textContent = steps.length;
  if (metricAgents) {
    const uniqueAgents = new Set(finalAssignments.map((a) => a.agent).filter(Boolean));
    metricAgents.textContent = uniqueAgents.size || 0;
  }
  if (metricProgress) metricProgress.textContent = inProgressCount;
}
