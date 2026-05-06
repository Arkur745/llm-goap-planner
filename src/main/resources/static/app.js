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

document.addEventListener("DOMContentLoaded", () => {
  const goalForm = document.getElementById("goalForm");
  const goalInput = document.getElementById("goalInput");
  const copyDiagramBtn = document.getElementById("copyDiagramBtn");
  const copyGanttBtn = document.getElementById("copyGanttBtn");
  const copyAssignmentsBtn = document.getElementById("copyAssignmentsBtn");

  if (window.mermaid) {
    window.mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: "base",
      flowchart: {
        nodeSpacing: 50,
        rankSpacing: 40,
        padding: "10",
        htmlLabels: true,
      },
      gantt: {
        fontSize: 12,
        gridLineStartPadding: 350,
      },
      themeVariables: {
        primaryColor: "#e8eefc",
        primaryBorderColor: "#6b7fd7",
        primaryTextColor: "#18243a",
        primaryBorderWidth: "2px",
        lineColor: "#64748b",
        fontSize: "13px",
        fontFamily: "system-ui, sans-serif",
      },
    });
  }

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
});

async function generatePlan() {
  const goalInput = document.getElementById("goalInput");
  const goal = goalInput.value.trim();

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
      body: JSON.stringify({ goal }),
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
    console.debug("X-Plan-Source header:", sourceHeader);
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
    // Make the source more visible in the status banner
    const src =
      payload && payload.source
        ? (payload.source || "UNKNOWN").toUpperCase()
        : "UNKNOWN";
    const srcLabel =
      src === "LLM"
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
    friendly === "LLM"
      ? "LLM (Llama)"
      : friendly === "BLUEPRINT"
        ? "Blueprint (fallback)"
        : friendly;
  console.debug("Displaying plan source:", friendlyLabel, plan);
  if (planSourceEl) planSourceEl.textContent = friendlyLabel;

  planSteps.innerHTML = "";
  (plan.steps || []).forEach((step) => {
    const item = document.createElement("li");
    item.className = "step-item";
    item.innerHTML = `
      <div class="step-index">${escapeHtml(String(step.order))}</div>
      <div class="step-copy">
        <h4>${escapeHtml(step.title || "Step")}</h4>
        <p>${escapeHtml(step.details || "")}</p>
      </div>
    `;
    planSteps.appendChild(item);
  });

  latestAssignments = plan.assignments || [];
  renderAssignments(assignmentRows, latestAssignments);

  // Update metrics
  updateMetrics(plan);

  latestDiagram = plan.mermaidDiagram || "";
  renderDiagram(diagramContainer, latestDiagram);

  latestGantt = plan.ganttDiagram || "";
  renderDiagram(ganttContainer, latestGantt);
}

function renderAssignments(container, assignments) {
  container.innerHTML = "";

  if (!assignments.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="2" class="empty-cell">No assignments returned.</td>`;
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

  // Add loading state
  container.innerHTML =
    '<div class="diagram-loading"><div class="spinner"></div><p>Rendering diagram...</p></div>';

  try {
    // Use a unique ID for each diagram
    const diagramId = `diagram-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Render with timeout to prevent hangs
    const renderPromise = window.mermaid.render(diagramId, diagramCode);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Diagram render timeout")), 10000),
    );

    const { svg } = await Promise.race([renderPromise, timeoutPromise]);

    // Add wrapper for better styling
    container.innerHTML = `<div class="diagram-wrapper">${svg}</div>`;

    // Add zoom/pan functionality hint
    const wrapper = container.querySelector(".diagram-wrapper");
    if (wrapper && wrapper.querySelector("svg")) {
      wrapper.setAttribute(
        "title",
        "SVG diagram - use browser zoom to adjust size",
      );
    }
  } catch (error) {
    console.error("Mermaid rendering error:", error);
    // Fall back to code display
    container.innerHTML = `<div class="diagram-error">
      <p><strong>Diagram rendering failed:</strong></p>
      <pre class="diagram-fallback">${escapeHtml(diagramCode)}</pre>
      <p class="diagram-error-hint">You can copy the Mermaid code above and render it at <a href="https://mermaid.live" target="_blank" rel="noopener">mermaid.live</a></p>
    </div>`;
  }
}

function clearStates() {
  const emptyState = document.getElementById("emptyState");
  const errorState = document.getElementById("errorState");
  const loadingState = document.getElementById("loadingState");

  if (loadingInterval) clearInterval(loadingInterval);

  // Remove all error type classes
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

  // Update step indicators
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

  // Set error title based on type
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

  // Bind retry handler
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
  if (!value) {
    return "Just now";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Just now";
  }

  return parsed.toLocaleString();
}

function toSlug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ============= VISUALIZATION DASHBOARD FUNCTIONS =============

function setupTabButtons() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabName = btn.getAttribute("data-tab");

      // Remove active class from all buttons and panes
      tabButtons.forEach((b) => b.classList.remove("active"));
      tabPanes.forEach((p) => p.classList.remove("active"));

      // Add active class to clicked button and corresponding pane
      btn.classList.add("active");
      const pane = document.getElementById(`tab-${tabName}`);
      if (pane) {
        pane.classList.add("active");

        // Trigger diagram re-render if needed
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
              renderDiagram(container, latestGantt);
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
  const inProgressCount = assignments.filter(
    (a) => a.status && a.status.toLowerCase() === "in progress",
  ).length;

  if (metricSteps) metricSteps.textContent = steps.length;
  if (metricAgents) {
    const uniqueAgents = new Set((assignments || []).map((a) => a.agent));
    metricAgents.textContent = uniqueAgents.size;
  }
  if (metricProgress) metricProgress.textContent = inProgressCount;
}
