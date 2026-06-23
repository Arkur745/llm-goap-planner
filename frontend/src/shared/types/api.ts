export type ApiStatus = "success" | "error";

export interface ApiErrorResponse {
  message?: string;
  error?: string;
  code?: string;
}

export interface PlanGenerationRequest {
  goal: string;
  tools: string[];
  provider?: string;
}

export interface PlanStep {
  order: number;
  title: string;
  details: string;
  agent: string;
  output: string | null;
}

export interface PlanAssignment {
  stepTitle: string;
  agent: string;
  capability: string;
  status: string;
  handoffTo: string;
  rationale?: string;
}

export interface PlanTraceEntry {
  action?: string;
  state_before?: unknown;
  state_after?: unknown;
}

export interface PlanResponse {
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
