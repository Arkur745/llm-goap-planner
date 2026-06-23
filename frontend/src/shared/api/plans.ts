import { API_PATHS } from "@shared/constants/api";
import { httpClient } from "@shared/api/http-client";
import type { PlanGenerationRequest, PlanResponse } from "@shared/types/api";

export async function generatePlan(request: PlanGenerationRequest): Promise<PlanResponse> {
  const response = await httpClient.post<PlanResponse>(API_PATHS.plans, request);
  return response.data;
}
