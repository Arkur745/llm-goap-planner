import type {
  PlannerGeneratePlanResponse,
  PlannerMetadataItem,
} from "@features/planner/model/planner.models";

export interface PlannerTimelineItem {
  id: string;
  title: string;
  agent: string;
  details: string;
  status: string;
}

export interface PlannerMetrics {
  totalSteps: number;
  totalAssignments: number;
  activeAgents: number;
  completedSteps: number;
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function buildPlannerMetadata(result: PlannerGeneratePlanResponse): PlannerMetadataItem[] {
  return [
    { label: "Status", value: result.status },
    { label: "Source", value: result.source },
    { label: "Generated", value: formatDateTime(result.generatedAt) },
    { label: "Classification", value: result.classification ?? "N/A" },
  ];
}

export function buildPlannerMetrics(result: PlannerGeneratePlanResponse): PlannerMetrics {
  const activeAgents = new Set(result.assignments.map((assignment) => assignment.agent)).size;
  const completedSteps = result.steps.filter((step) => Boolean(step.output)).length;

  return {
    totalSteps: result.steps.length,
    totalAssignments: result.assignments.length,
    activeAgents,
    completedSteps,
  };
}

export function buildPlannerTimeline(result: PlannerGeneratePlanResponse): PlannerTimelineItem[] {
  return result.steps.map((step) => {
    const matchingAssignment = result.assignments.find(
      (assignment) => assignment.stepTitle === step.title,
    );

    return {
      id: `${step.order}-${step.title}`,
      title: step.title,
      agent: matchingAssignment?.agent ?? step.agent,
      details: step.details || matchingAssignment?.capability || "No additional details available.",
      status: matchingAssignment?.status ?? (step.output ? "Complete" : "Ready"),
    };
  });
}
