import { z } from "zod";

import {
  PLANNER_PROVIDER_VALUES,
  PLANNER_TOOL_VALUES,
  type PlannerGeneratePlanRequest,
} from "@features/planner/model/planner.models";

export const plannerGoalSchema = z.object({
  goal: z.string().trim().min(3, "Enter a goal with at least 3 characters.").max(2000),
  provider: z.enum(PLANNER_PROVIDER_VALUES),
  tools: z.array(z.enum(PLANNER_TOOL_VALUES)).min(1, "Select at least one agent."),
});

export type PlannerGoalFormValues = z.infer<typeof plannerGoalSchema>;

export const plannerGoalDefaults: PlannerGoalFormValues = {
  goal: "",
  provider: "auto",
  tools: ["SearchAgent"],
};

export function toPlannerRequest(values: PlannerGoalFormValues): PlannerGeneratePlanRequest {
  return {
    goal: values.goal.trim(),
    provider: values.provider,
    tools: values.tools,
  };
}
