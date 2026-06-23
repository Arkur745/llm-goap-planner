import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  plannerGoalDefaults,
  plannerGoalSchema,
  type PlannerGoalFormValues,
} from "@features/planner/model/planner.schema";

export function useGoalForm() {
  return useForm<PlannerGoalFormValues>({
    resolver: zodResolver(plannerGoalSchema),
    defaultValues: plannerGoalDefaults,
    mode: "onSubmit",
  });
}
