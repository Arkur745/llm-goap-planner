import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type UseFormReturn } from "react-hook-form";

import {
  plannerGoalDefaults,
  plannerGoalSchema,
  type PlannerGoalFormValues,
} from "@features/planner/model/planner.schema";

export function useGoalForm(): UseFormReturn<PlannerGoalFormValues> {
  return useForm<PlannerGoalFormValues>({
    resolver: zodResolver(plannerGoalSchema),
    defaultValues: plannerGoalDefaults,
    mode: "onSubmit",
  });
}

