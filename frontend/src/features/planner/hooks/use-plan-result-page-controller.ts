import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { ROUTE_PATHS } from "@shared/constants/routes";
import { useGeneratePlanMutation } from "@features/planner/hooks/use-generate-plan-mutation";
import { usePlannerStore } from "@features/planner/store/planner.store";

export function usePlanResultPageController() {
  const navigate = useNavigate();
  const mutation = useGeneratePlanMutation();
  const request = usePlannerStore((state) => state.request);
  const result = usePlannerStore((state) => state.result);
  const status = usePlannerStore((state) => state.status);
  const errorMessage = usePlannerStore((state) => state.errorMessage);
  const resetExecution = usePlannerStore((state) => state.resetExecution);

  const handleRetry = useCallback(() => {
    if (!request) {
      navigate(ROUTE_PATHS.planner);
      return;
    }

    mutation.mutate(request);
  }, [mutation, navigate, request]);

  const handleStartOver = useCallback(() => {
    resetExecution();
    navigate(ROUTE_PATHS.planner);
  }, [navigate, resetExecution]);

  return {
    request,
    result,
    status,
    errorMessage,
    isLoading: status === "loading" || mutation.isPending,
    hasResult: Boolean(result),
    handleRetry,
    handleStartOver,
  };
}
