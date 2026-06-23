import { useMutation } from "@tanstack/react-query";

import { useAppStore } from "@app/store/app-store";
import { submitPlannerGoal } from "@features/planner/api/planner.api";
import type { PlannerGeneratePlanRequest } from "@features/planner/model/planner.models";
import { usePlannerStore } from "@features/planner/store/planner.store";
import { getErrorMessage } from "@shared/lib/error";

export function useGeneratePlanMutation() {
  const beginExecution = usePlannerStore((state) => state.beginExecution);
  const completeExecution = usePlannerStore((state) => state.completeExecution);
  const failExecution = usePlannerStore((state) => state.failExecution);
  const showSnackbar = useAppStore((state) => state.showSnackbar);

  return useMutation({
    mutationFn: (request: PlannerGeneratePlanRequest) => submitPlannerGoal(request),
    onMutate: (request) => {
      beginExecution(request);
    },
    onSuccess: (result) => {
      completeExecution(result);
      showSnackbar({
        severity: "success",
        message: "Plan generated successfully.",
        title: "Planner",
      });
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      failExecution(message);
      showSnackbar({
        severity: "error",
        message,
        title: "Planner failed",
      });
    },
  });
}
