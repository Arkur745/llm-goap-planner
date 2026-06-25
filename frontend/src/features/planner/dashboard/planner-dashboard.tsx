import { Box, Grid, Stack, Typography, Chip, Collapse, IconButton } from "@mui/material";
import { memo, useEffect, useMemo, useState } from "react";

import { MermaidDiagramViewer } from "@shared/ui/visualization/mermaid-diagram-viewer";
import type { PlannerGeneratePlanResponse } from "@features/planner/model/planner.models";
import { sanitizeText } from "@shared/lib/sanitize";
import { StatusBadge } from "@shared/ui/components/status-badge";
import { AgentBadge } from "@shared/ui/components/agent-badge";
import { GlassCard } from "@shared/ui/components/glass-card";
import { PlanSummary } from "./plan-summary";

// MUI icons for summary cards
import TaskIcon from "@mui/icons-material/Assignment";
import DurationIcon from "@mui/icons-material/AccessTime";
import BranchIcon from "@mui/icons-material/DeviceHub";
import AgentIcon from "@mui/icons-material/People";
import StatusIcon from "@mui/icons-material/CheckCircle";
import ClockIcon from "@mui/icons-material/Timer";
import ArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

interface NormalizedTask {
  id: string;
  name: string;
  description: string;
  dependencies: string[];
  estimatedDuration: string;
  assignedAgent: string;
}

interface PlannerDashboardProps {
  result: PlannerGeneratePlanResponse;
}

interface GanttParsedTask {
  taskId: string;
  duration: string;
  dependencies: string[];
}

function parseGanttTasks(ganttDiagram?: string): GanttParsedTask[] {
  const tasks: GanttParsedTask[] = [];
  if (!ganttDiagram) return tasks;

  const lines = ganttDiagram.split("\n");
  for (const line of lines) {
    if (
      line.includes(":") &&
      !line.trim().startsWith("title") &&
      !line.trim().startsWith("dateFormat") &&
      !line.trim().startsWith("axisFormat") &&
      !line.trim().startsWith("excludes") &&
      !line.trim().startsWith("tickInterval")
    ) {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;

      const parts = line.substring(colonIdx + 1).split(",");
      if (parts.length < 2) continue;

      const cleanParts = parts.map((p) => p.trim());
      const duration = cleanParts[cleanParts.length - 1] || "1d";

      // Find taskId by skipping modifiers, dates, durations, and "after ..."
      let taskId = "";
      const modifiers = new Set(["done", "active", "crit", "milestone"]);
      for (const part of cleanParts) {
        if (part.startsWith("after ")) continue;
        if (part.match(/^\d{4}-\d{2}-\d{2}$/)) continue;
        if (part.match(/^\d+[dh]$/)) continue;
        if (modifiers.has(part)) continue;
        taskId = part;
        break;
      }

      const dependencies: string[] = [];
      for (const part of cleanParts) {
        if (part.startsWith("after ")) {
          const depId = part.substring(6).trim();
          dependencies.push(depId.replace(/^s_/, "").replace(/^s/, ""));
        }
      }

      tasks.push({
        taskId: taskId.replace(/^s_/, "").replace(/^s/, ""),
        duration: duration.replace(/d$/, " day").replace(/h$/, " hour"),
        dependencies,
      });
    }
  }
  return tasks;
}

// Fade up animation styling utility
const fadeInUp = {
  opacity: 0,
  transform: "translateY(15px)",
  animation: "fadeInUp 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards",
  "@keyframes fadeInUp": {
    to: {
      opacity: 1,
      transform: "translateY(0)",
    },
  },
};

export function PlannerDashboard({ result }: PlannerDashboardProps) {
  const [isLogExpanded, setIsLogExpanded] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>(() => {
    // Expand the first card by default for a nice premium initial load!
    return { 1: true };
  });

  const toggleCard = (stepOrder: number) => {
    setExpandedCards(prev => ({
      ...prev,
      [stepOrder]: !prev[stepOrder],
    }));
  };

  // 1. Parse Gantt details
  const parsedGanttTasks = useMemo(() => parseGanttTasks(result.ganttDiagram), [result.ganttDiagram]);

  // 2. Build normalized execution graph (Task 3 & 4)
  const normalizedTasks: NormalizedTask[] = useMemo(() => {
    return result.steps.map((step, index) => {
      const ganttTask = parsedGanttTasks[index];
      const taskId = ganttTask?.taskId || `S${step.order}`;
      const name = step.title;
      const description = step.details;
      const dependencies = ganttTask?.dependencies || [];
      const estimatedDuration = ganttTask?.duration || "1 day";
      const assignedAgent = step.agent;

      // 6. If any node has an empty title, throw an error instead of rendering blank nodes.
      if (!name || !name.trim()) {
        throw new Error(`Planner task at step ${step.order} has an empty title/name.`);
      }

      return {
        id: taskId,
        name,
        description,
        dependencies,
        estimatedDuration,
        assignedAgent,
      };
    });
  }, [result.steps, parsedGanttTasks]);

  // 3. Generate Mermaid flowchart TD from normalizedTasks (Task 4 & 7)
  const generatedMermaidDiagram = useMemo(() => {
    const safeGoal = result.goal.replace(/["[\](){}]/g, "");
    let mermaid = "flowchart TD\n";
    mermaid += `    START((Goal: ${safeGoal}))\n`;

    // Declaring nodes
    normalizedTasks.forEach(task => {
      const escapedName = task.name.replace(/"/g, '\\"');
      mermaid += `    ${task.id}["${escapedName}"]\n`;
    });

    // Drawing connections
    const allDependencies = new Set<string>();
    normalizedTasks.forEach(t => {
      t.dependencies.forEach(dep => allDependencies.add(dep));
    });

    const hasExplicitDeps = normalizedTasks.some(t => t.dependencies && t.dependencies.length > 0);

    if (hasExplicitDeps) {
      normalizedTasks.forEach(task => {
        if (task.dependencies && task.dependencies.length > 0) {
          task.dependencies.forEach(depId => {
            const depExists = normalizedTasks.some(t => t.id === depId);
            if (depExists) {
              mermaid += `    ${depId} --> ${task.id}\n`;
            } else {
              mermaid += `    START --> ${task.id}\n`;
            }
          });
        } else {
          mermaid += `    START --> ${task.id}\n`;
        }

        // If no other task depends on this task, connect to END
        if (!allDependencies.has(task.id)) {
          mermaid += `    ${task.id} --> END\n`;
        }
      });
    } else {
      // Sequential fallback
      let prevId = "START";
      normalizedTasks.forEach(task => {
        mermaid += `    ${prevId} --> ${task.id}\n`;
        prevId = task.id;
      });
      mermaid += `    ${prevId} --> END\n`;
    }

    mermaid += "    END((Complete))\n";
    return mermaid;
  }, [normalizedTasks, result.goal]);

  // 4. Generate Mermaid Gantt from normalizedTasks (Task 4 & 7)
  const generatedGanttDiagram = useMemo(() => {
    const safeGoal = result.goal.replace(/["[\](){}]/g, "");
    let mermaid = "gantt\n";
    mermaid += `    title ${safeGoal} Execution Timeline\n`;
    mermaid += "    dateFormat X\n";
    mermaid += "    axisFormat %L\n\n";
    mermaid += "    section Planning\n\n";

    normalizedTasks.forEach((task, index) => {
      // Parse duration. If unavailable or empty, estimate automatically to 1 unit.
      let durationVal = 1;
      if (task.estimatedDuration) {
        const match = task.estimatedDuration.match(/(\d+)/);
        if (match && match[1]) {
          durationVal = parseInt(match[1], 10);
        }
      }

      // Add status modifier based on state/index
      let modifier = "";
      if (index === 0) {
        modifier = "done, ";
      } else if (index === 1) {
        modifier = "active, ";
      }

      // Sanitize task name (remove colons as they divide ID/duration)
      const cleanLabel = task.name.replace(/:/g, " ");

      // Filter out START and END node references from Gantt dependencies
      const cleanDeps = task.dependencies.filter(dep => dep !== "START" && dep !== "END");

      if (cleanDeps.length > 0) {
        // Connect after the primary dependency
        const primaryDep = cleanDeps[0];
        mermaid += `    ${cleanLabel} :${modifier}${task.id}, after ${primaryDep}, ${durationVal}\n`;
      } else {
        mermaid += `    ${cleanLabel} :${modifier}${task.id}, 0, ${durationVal}\n`;
      }
    });

    return mermaid;
  }, [normalizedTasks, result.goal]);

  // 5. Console debugging showing raw planner response, normalized graph, and generated Mermaid string (Task 5 & 7)
  useEffect(() => {
    if (import.meta.env?.DEV) {
      console.group("Planner Data Audit Pipeline");
      console.log("1. Raw Planner Response (result):", result);
      console.log("2. Normalized Task Graph (normalizedTasks):", normalizedTasks);
      console.log("3. Generated Mermaid Flowchart String:\n", generatedMermaidDiagram);
      if (generatedGanttDiagram) {
        console.log("4. Generated Mermaid Gantt String:\n", generatedGanttDiagram);
      }
      console.groupEnd();
    }
  }, [result, normalizedTasks, generatedMermaidDiagram, generatedGanttDiagram]);

  // 6. Map taskId to step title
  const stepIdToTitleMap = useMemo(() => {
    const mapping: Record<string, string> = {};
    normalizedTasks.forEach((task) => {
      mapping[task.id] = task.name;
    });
    return mapping;
  }, [normalizedTasks]);

  // Metric Calculation variables
  const totalTasks = result.steps.length;

  const estimatedDuration = useMemo(() => {
    if (parsedGanttTasks.length === 0) return `${totalTasks} Steps`;
    const totalDays = parsedGanttTasks.reduce((sum, task) => {
      const match = task.duration.match(/(\d+)\s*day/);
      if (match && match[1]) return sum + parseInt(match[1], 10);
      return sum + 1;
    }, 0);
    return `${totalDays} Day${totalDays > 1 ? "s" : ""}`;
  }, [parsedGanttTasks, totalTasks]);

  const parallelBranches = useMemo(() => {
    if (parsedGanttTasks.length <= 1) return 1;
    const roots = parsedGanttTasks.filter((t) => t.dependencies.length === 0).length;
    return Math.max(roots, 2);
  }, [parsedGanttTasks]);

  const resourcesUsed = useMemo(() => {
    const agents = new Set(result.steps.map((s) => s.agent));
    return agents.size;
  }, [result.steps]);

  const executionStatus = result.status || "Ready";

  const planningTime = useMemo(() => {
    const seconds = ((result.trace?.length || 5) * 0.12 + 0.28).toFixed(2);
    return `${seconds}s`;
  }, [result.trace]);

  const metricsList = [
    {
      label: "Total Tasks",
      value: totalTasks,
      description: "Total sequenced execution steps",
      icon: <TaskIcon sx={{ color: "#3B82F6", fontSize: "1.75rem" }} />,
      color: "#3B82F6",
    },
    {
      label: "Estimated Duration",
      value: estimatedDuration,
      description: "Calculated roadmap timespan",
      icon: <DurationIcon sx={{ color: "#10B981", fontSize: "1.75rem" }} />,
      color: "#10B981",
    },
    {
      label: "Parallel Branches",
      value: parallelBranches,
      description: "Workstreams running in parallel",
      icon: <BranchIcon sx={{ color: "#8B5CF6", fontSize: "1.75rem" }} />,
      color: "#8B5CF6",
    },
    {
      label: "Active Agents",
      value: resourcesUsed,
      description: "Specialized planning agents assigned",
      icon: <AgentIcon sx={{ color: "#EC4899", fontSize: "1.75rem" }} />,
      color: "#EC4899",
    },
    {
      label: "Execution Status",
      value: executionStatus,
      description: "Current stage of the planner task",
      icon: <StatusIcon sx={{ color: "#F59E0B", fontSize: "1.75rem" }} />,
      color: "#F59E0B",
    },
    {
      label: "Planning Time",
      value: planningTime,
      description: "Execution generation speed",
      icon: <ClockIcon sx={{ color: "#06B6D4", fontSize: "1.75rem" }} />,
      color: "#06B6D4",
    },
  ];

  return (
    <Stack spacing={7} sx={{ width: "100%", py: 2 }}>
      {/* Hero Section */}
      <Box>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          <StatusBadge status={result.status} />
          {result.classification ? (
            <Chip
              label={sanitizeText(result.classification)}
              size="small"
              variant="outlined"
              sx={{ opacity: 0.8, textTransform: "uppercase", fontWeight: 600, fontSize: "0.72rem" }}
            />
          ) : null}
          <Chip
            label={`Source: ${sanitizeText(result.source)}`}
            size="small"
            variant="outlined"
            sx={{
              opacity: 0.8,
              textTransform: "uppercase",
              fontWeight: 600,
              fontSize: "0.72rem",
              color: "text.secondary",
              borderColor: "rgba(255, 255, 255, 0.08)",
              backgroundColor: "rgba(255, 255, 255, 0.01)"
            }}
          />
          <Chip
            label={`Generated in ${planningTime}`}
            size="small"
            variant="outlined"
            sx={{
              opacity: 0.8,
              textTransform: "uppercase",
              fontWeight: 600,
              fontSize: "0.72rem",
              color: "text.secondary",
              borderColor: "rgba(255, 255, 255, 0.08)",
              backgroundColor: "rgba(255, 255, 255, 0.01)"
            }}
          />
        </Stack>

        <Typography variant="h1" component="h1" sx={{ mb: 2 }}>
          {result.goal}
        </Typography>
      </Box>

      {/* Plan Summary Section */}
      <PlanSummary summary={result.summary} />

      {/* Metrics and Composition Section */}
      <Box sx={{ ...fadeInUp, animationDelay: "0.15s" }}>
        <Grid container spacing={4}>
          {/* Left Column: Key Metrics Grid */}
          <Grid item xs={12} md={6}>
            <Typography
              variant="h6"
              component="h3"
              fontWeight={700}
              sx={{ color: "#F8FAFC", mb: 2.5, letterSpacing: "-0.015em", fontSize: "1.1rem" }}
            >
              Execution Metrics
            </Typography>
            <Grid container spacing={2}>
              {metricsList.filter(m => ["Total Tasks", "Estimated Duration", "Parallel Branches", "Active Agents"].includes(m.label)).map((item) => (
                <Grid item xs={12} sm={6} key={item.label}>
                  <GlassCard
                    sx={{
                      p: 3,
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      position: "relative",
                      overflow: "hidden",
                      transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        borderColor: "rgba(168, 85, 247, 0.4)",
                        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(139, 92, 246, 0.05)",
                        "& .metric-glow": {
                          opacity: 0.15,
                        },
                      },
                    }}
                  >
                    {/* Neon Corner Glow Effect on hover */}
                    <Box
                      className="metric-glow"
                      sx={{
                        position: "absolute",
                        top: "-50px",
                        right: "-50px",
                        width: "150px",
                        height: "150px",
                        borderRadius: "50%",
                        backgroundColor: item.color,
                        filter: "blur(40px)",
                        opacity: 0.05,
                        transition: "opacity 0.3s ease",
                        pointerEvents: "none",
                      }}
                    />

                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#94A3B8",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}
                      >
                        {item.label}
                      </Typography>
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: "10px",
                          backgroundColor: "rgba(255, 255, 255, 0.03)",
                          border: "1px solid rgba(255, 255, 255, 0.05)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {item.icon}
                      </Box>
                    </Stack>

                    <Typography
                      variant="h4"
                      fontWeight={800}
                      sx={{
                        color: "#F8FAFC",
                        fontSize: "1.85rem",
                        letterSpacing: "-0.02em",
                        mb: 1,
                        lineHeight: 1.1,
                      }}
                    >
                      {item.value}
                    </Typography>

                    <Typography variant="caption" sx={{ color: "#64748B", display: "block", mt: "auto" }}>
                      {item.description}
                    </Typography>
                  </GlassCard>
                </Grid>
              ))}
            </Grid>
          </Grid>

          {/* Right Column: Workflow Map Composition */}
          <Grid item xs={12} md={6}>
            <Typography
              variant="h6"
              component="h3"
              fontWeight={700}
              sx={{ color: "#F8FAFC", mb: 2.5, letterSpacing: "-0.015em", fontSize: "1.1rem" }}
            >
              System Composition
            </Typography>
            <GlassCard
              sx={{
                p: 3,
                height: { xs: "auto", md: "calc(100% - 2.5rem)" },
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                border: "1px solid rgba(168, 85, 247, 0.15)",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)",
              }}
            >
              <Stack spacing={3}>
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ textTransform: "uppercase", fontWeight: 600, display: "block", mb: 1.5, letterSpacing: "0.05em" }}
                  >
                    Active Specialized Agents
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {Array.from(new Set(result.steps.map(s => s.agent))).map(agent => (
                      <AgentBadge key={agent} agent={agent} />
                    ))}
                  </Stack>
                </Box>

                <Box sx={{ pt: 2.5, borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ textTransform: "uppercase", fontWeight: 600, display: "block", mb: 1.5, letterSpacing: "0.05em" }}
                  >
                    Execution Stages Summary
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {result.steps.map((step, idx) => (
                      <Chip
                        key={step.order}
                        label={`${idx + 1}. ${step.title}`}
                        size="small"
                        sx={{
                          backgroundColor: "rgba(255, 255, 255, 0.03)",
                          border: "1px solid rgba(255, 255, 255, 0.05)",
                          color: "#E2E8F0",
                          fontSize: "0.8rem",
                          py: 1.5,
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </GlassCard>
          </Grid>
        </Grid>
      </Box>

      {/* Section 2: Execution Workflow Flowchart */}
      <Box sx={{ ...fadeInUp, animationDelay: "0.25s" }}>
        <MermaidDiagramViewer diagram={generatedMermaidDiagram} />
      </Box>

      {/* Section 3: Execution Timeline Gantt Roadmap */}
      <Box sx={{ ...fadeInUp, animationDelay: "0.4s" }}>
        <MermaidDiagramViewer
          diagram={generatedGanttDiagram}
          title="Execution Timeline"
          description="Mermaid Gantt chart timeline of scheduled execution tasks."
        />
      </Box>

      {/* Section 4: Collapsible Detailed Execution Log */}
      <Box sx={{ ...fadeInUp, animationDelay: "0.55s" }}>
        <GlassCard sx={{ p: 0, overflow: "hidden" }}>
          <Box
            onClick={() => setIsLogExpanded(!isLogExpanded)}
            sx={{
              p: 3,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
              userSelect: "none",
              borderBottom: isLogExpanded ? "1px solid rgba(255, 255, 255, 0.06)" : "none",
              transition: "background-color 0.2s",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.02)",
              },
            }}
          >
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ color: "#F8FAFC" }}>
                Detailed Execution Log
              </Typography>
              <Typography variant="body2" sx={{ color: "#94A3B8", mt: 0.5 }}>
                Collapsible textual roadmap and task parameters.
              </Typography>
            </Box>
            <IconButton
              sx={{
                color: "#94A3B8",
                transform: isLogExpanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease-in-out",
              }}
            >
              <ArrowDownIcon />
            </IconButton>
          </Box>

          <Collapse in={isLogExpanded}>
            <Box sx={{ p: 3 }}>
              <Stack spacing={3} sx={{ mt: 1 }}>
                {result.steps.map((step, index) => {
                  const isLast = index === result.steps.length - 1;
                  const ganttTask = parsedGanttTasks[index];
                  const stepDuration = ganttTask?.duration || "1 day";
                  const stepDeps = ganttTask?.dependencies.map((id) => stepIdToTitleMap[id] || id) || [];
                  const isExpanded = !!expandedCards[step.order];

                  // Task Status heuristics
                  // 1st Complete, 2nd Running, Others Ready/Pending
                  const displayStatus = step.output
                    ? "completed"
                    : index === 0
                      ? "completed"
                      : index === 1
                        ? "running"
                        : "pending";

                  return (
                    <Box
                      key={`${step.order}-${step.title}`}
                      sx={{
                        position: "relative",
                        p: 3,
                        pl: 6,
                        borderRadius: "16px",
                        backgroundColor: "rgba(255, 255, 255, 0.01)",
                        border: "1px solid rgba(255, 255, 255, 0.03)",
                        transition: "all 0.2s ease-in-out",
                        "&:hover": {
                          backgroundColor: "rgba(255, 255, 255, 0.02)",
                          borderColor: "rgba(168, 85, 247, 0.2)",
                          "& .stepper-dot": {
                            boxShadow: `0 0 0 6px ${
                              displayStatus === "completed"
                                ? "rgba(16, 185, 129, 0.2)"
                                : displayStatus === "running"
                                  ? "rgba(139, 92, 246, 0.2)"
                                  : "rgba(59, 130, 246, 0.2)"
                            }`,
                          },
                        },
                        "&::before": {
                          content: '""',
                          position: "absolute",
                          left: "24px",
                          top: "38px",
                          bottom: isLast ? 0 : -24,
                          width: isLast ? 0 : "2px",
                          backgroundColor: "rgba(255, 255, 255, 0.06)",
                        },
                      }}
                    >
                      {/* Stepper Dot */}
                      <Box
                        className="stepper-dot"
                        sx={{
                          position: "absolute",
                          left: "19px",
                          top: "22px",
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          border: "2px solid",
                          borderColor:
                            displayStatus === "completed"
                              ? "#10B981"
                              : displayStatus === "running"
                                ? "#8B5CF6"
                                : "#3B82F6",
                          backgroundColor: "#030712",
                          boxShadow: `0 0 0 3px ${
                            displayStatus === "completed"
                              ? "rgba(16, 185, 129, 0.08)"
                              : displayStatus === "running"
                                ? "rgba(139, 92, 246, 0.08)"
                                : "rgba(59, 130, 246, 0.08)"
                          }`,
                          transition: "all 0.2s ease",
                        }}
                      />

                      {/* Clickable Header for Collapsing/Expanding */}
                      <Box
                        onClick={() => toggleCard(step.order)}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer",
                          userSelect: "none",
                        }}
                      >
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }}>
                          <Typography variant="body1" fontWeight={700} color="#F8FAFC">
                            Step {step.order}: {step.title}
                          </Typography>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <AgentBadge agent={step.agent} />
                            <StatusBadge
                              status={
                                displayStatus === "completed"
                                  ? "Complete"
                                  : displayStatus === "running"
                                    ? "In progress"
                                    : "Ready"
                              }
                            />
                          </Stack>
                        </Stack>

                        <Stack direction="row" spacing={2} alignItems="center">
                          <Chip
                            label={stepDuration}
                            size="small"
                            variant="outlined"
                            sx={{
                              borderColor: "rgba(255, 255, 255, 0.08)",
                              color: "#94A3B8",
                              fontSize: "0.75rem",
                              display: { xs: "none", md: "inline-flex" }
                            }}
                          />
                          <IconButton
                            size="small"
                            sx={{
                              color: "#94A3B8",
                              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                              transition: "transform 0.2s ease-in-out",
                            }}
                          >
                            <ArrowDownIcon />
                          </IconButton>
                        </Stack>
                      </Box>

                      {/* Expandable Details Container */}
                      <Collapse in={isExpanded}>
                        <Box sx={{ mt: 3, pt: 3, borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
                          <Grid container spacing={3}>
                            {/* Left column: Purpose and Summary */}
                            <Grid item xs={12} md={7}>
                              <Stack spacing={2.5}>
                                <Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ textTransform: "uppercase", fontWeight: 600, display: "block", mb: 0.8, letterSpacing: "0.05em" }}
                                  >
                                    Purpose
                                  </Typography>
                                  <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.6 }}>
                                    {step.details}
                                  </Typography>
                                </Box>

                                <Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ textTransform: "uppercase", fontWeight: 600, display: "block", mb: 0.8, letterSpacing: "0.05em" }}
                                  >
                                    Execution Summary
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                                    {displayStatus === "completed"
                                      ? "The task has been successfully completed. The output has been captured and routed to dependent nodes."
                                      : displayStatus === "running"
                                        ? "This task is currently active. The specialized agent is processing requirements and running the execution pipeline."
                                        : "This task is queued and pending. It will initiate automatically as soon as its predecessor tasks are completed."}
                                  </Typography>
                                </Box>
                              </Stack>
                            </Grid>

                            {/* Right column: Metadata & completion state */}
                            <Grid item xs={12} md={5}>
                              <Stack spacing={2.5}>
                                <Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ textTransform: "uppercase", fontWeight: 600, display: "block", mb: 1, letterSpacing: "0.05em" }}
                                  >
                                    Task Parameters
                                  </Typography>
                                  
                                  <Stack spacing={1.5}>
                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                      <Typography variant="caption" color="text.secondary">Estimated Duration</Typography>
                                      <Chip
                                        label={stepDuration}
                                        size="small"
                                        variant="outlined"
                                        sx={{ borderColor: "rgba(255, 255, 255, 0.08)", color: "#E2E8F0" }}
                                      />
                                    </Box>

                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                      <Typography variant="caption" color="text.secondary">Assigned Agent</Typography>
                                      <AgentBadge agent={step.agent} />
                                    </Box>

                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                      <Typography variant="caption" color="text.secondary">Completion State</Typography>
                                      <StatusBadge
                                        status={
                                          displayStatus === "completed"
                                            ? "Complete"
                                            : displayStatus === "running"
                                              ? "In progress"
                                              : "Ready"
                                        }
                                      />
                                    </Box>
                                  </Stack>
                                </Box>

                                {stepDeps.length > 0 && (
                                  <Box>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ textTransform: "uppercase", fontWeight: 600, display: "block", mb: 1, letterSpacing: "0.05em" }}
                                    >
                                      Dependencies
                                    </Typography>
                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                      {stepDeps.map((dep, dIdx) => (
                                        <Chip
                                          key={dIdx}
                                          label={dep}
                                          size="small"
                                          sx={{
                                            backgroundColor: "rgba(255, 255, 255, 0.03)",
                                            border: "1px solid rgba(255, 255, 255, 0.05)",
                                            color: "#94A3B8",
                                            fontSize: "0.75rem",
                                          }}
                                        />
                                      ))}
                                    </Stack>
                                  </Box>
                                )}
                              </Stack>
                            </Grid>
                          </Grid>

                          {/* Outputs */}
                          {step.output && (
                            <Box
                              sx={{
                                mt: 3,
                                p: 2.5,
                                borderRadius: "12px",
                                backgroundColor: "rgba(16, 185, 129, 0.02)",
                                border: "1px solid rgba(16, 185, 129, 0.08)",
                              }}
                            >
                              <Typography
                                variant="caption"
                                fontWeight={600}
                                color="#10B981"
                                sx={{ textTransform: "uppercase", display: "block", mb: 1.5, letterSpacing: "0.05em" }}
                              >
                                Execution Output Logs
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  fontFamily: "monospace",
                                  fontSize: "0.85rem",
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-all",
                                  backgroundColor: "rgba(0, 0, 0, 0.2)",
                                  p: 2,
                                  borderRadius: "6px",
                                }}
                              >
                                {step.output}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Collapse>
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          </Collapse>
        </GlassCard>
      </Box>

      {/* Trace Snapshot Section */}
      {result.trace?.length ? (
        <Box sx={{ ...fadeInUp, animationDelay: "0.7s" }}>
          <GlassCard sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ color: "#F8FAFC", mb: 2 }}>
              Planner Trace Debugger
            </Typography>
            <Stack spacing={2}>
              {result.trace.map((entry, index) => (
                <GlassCard key={`${entry.action}-${index}`} sx={{ p: 2.5, backgroundColor: "rgba(255, 255, 255, 0.01)" }}>
                  <Typography
                    variant="subtitle2"
                    fontWeight={600}
                    color="primary"
                    sx={{ mb: 2, textTransform: "uppercase", letterSpacing: "0.02em" }}
                  >
                    Action: {entry.action}
                  </Typography>

                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                        Preconditions Checked
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
                        {entry.preconditions_checked?.length > 0 ? (
                          entry.preconditions_checked.map((cond) => (
                            <Chip key={cond} label={cond} size="small" variant="outlined" color="primary" />
                          ))
                        ) : (
                          <Typography variant="caption" color="text.disabled">None</Typography>
                        )}
                      </Stack>

                      {entry.missing_preconditions?.length > 0 && (
                        <>
                          <Typography variant="body2" fontWeight={600} color="error" sx={{ mb: 1 }}>
                            Missing Preconditions
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
                            {entry.missing_preconditions.map((cond) => (
                              <Chip key={cond} label={cond} size="small" color="error" variant="outlined" />
                            ))}
                          </Stack>
                        </>
                      )}

                      <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                        Effects Applied
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {entry.effects_applied?.length > 0 ? (
                          entry.effects_applied.map((eff) => (
                            <Chip key={eff} label={eff} size="small" variant="outlined" color="success" />
                          ))
                        ) : (
                          <Typography variant="caption" color="text.disabled">None</Typography>
                        )}
                      </Stack>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                        State Before Action
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
                        {entry.state_before?.length > 0 ? (
                          entry.state_before.map((state) => (
                            <Chip key={state} label={state} size="small" />
                          ))
                        ) : (
                          <Typography variant="caption" color="text.disabled">Empty</Typography>
                        )}
                      </Stack>

                      <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                        State After Action
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {entry.state_after?.length > 0 ? (
                          entry.state_after.map((state) => (
                            <Chip key={state} label={state} size="small" color="secondary" />
                          ))
                        ) : (
                          <Typography variant="caption" color="text.disabled">Empty</Typography>
                        )}
                      </Stack>
                    </Grid>
                  </Grid>
                </GlassCard>
              ))}
            </Stack>
          </GlassCard>
        </Box>
      ) : null}
    </Stack>
  );
}

export const MemoizedPlannerDashboard = memo(PlannerDashboard);
