import type { PlanAssignment, PlanStep, PlanTraceEntry } from "@shared/types/api";

export const PLANNER_PROVIDER_VALUES = ["auto", "groq", "ollama"] as const;
export type PlannerProviderValue = (typeof PLANNER_PROVIDER_VALUES)[number];

export const PLANNER_TOOL_VALUES = [
  "SearchAgent",
  "CalendarAgent",
  "BudgetAgent",
  "InviteAgent",
  "FoodAgent",
] as const;
export type PlannerToolValue = (typeof PLANNER_TOOL_VALUES)[number];

export interface PlannerToolOption {
  value: PlannerToolValue;
  label: string;
  description: string;
}

export type PlannerProviderOption = {
  value: PlannerProviderValue;
  label: string;
  description: string;
};

export const PLANNER_TOOL_OPTIONS: PlannerToolOption[] = [
  { value: "SearchAgent", label: "Search Agent", description: "Research and discovery" },
  { value: "CalendarAgent", label: "Calendar Agent", description: "Scheduling and timing" },
  { value: "BudgetAgent", label: "Budget Agent", description: "Cost planning and estimation" },
  { value: "InviteAgent", label: "Invite Agent", description: "Coordination and outreach" },
  { value: "FoodAgent", label: "Food Agent", description: "Logistics and meals" },
];

export const PLANNER_PROVIDER_OPTIONS: PlannerProviderOption[] = [
  { value: "auto", label: "Auto", description: "Use the backend default provider" },
  { value: "groq", label: "Groq", description: "Use the Groq fallback provider" },
  { value: "ollama", label: "Ollama", description: "Use the local Ollama provider" },
];

export interface PlannerGeneratePlanRequest {
  goal: string;
  tools: PlannerToolValue[];
  provider: PlannerProviderValue;
}

export interface PlannerGeneratePlanResponse {
  goal: string;
  summary: string;
  status: string;
  steps: PlanStep[];
  assignments: PlanAssignment[];
  mermaidDiagram: string;
  ganttDiagram: string;
  source: string;
  classification?: string | null;
  trace?: PlanTraceEntry[];
  generatedAt: string;
}

export interface PlannerExecutionSnapshot {
  request: PlannerGeneratePlanRequest | null;
  result: PlannerGeneratePlanResponse | null;
  status: "idle" | "loading" | "success" | "error";
  errorMessage: string | null;
}

export interface PlannerMetadataItem {
  label: string;
  value: string;
}
