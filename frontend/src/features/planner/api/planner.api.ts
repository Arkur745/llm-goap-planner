import { generatePlan } from "@shared/api/plans";

import type {
  PlannerGeneratePlanRequest,
  PlannerGeneratePlanResponse,
} from "@features/planner/model/planner.models";

export async function submitPlannerGoal(
  request: PlannerGeneratePlanRequest,
): Promise<PlannerGeneratePlanResponse> {
  return generatePlan(request);
}
