import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { ROUTE_PATHS } from "@shared/constants/routes";
import { useGeneratePlanMutation } from "@features/planner/hooks/use-generate-plan-mutation";
import { useGoalForm } from "@features/planner/hooks/use-goal-form";
import {
  PLANNER_PROVIDER_OPTIONS,
  PLANNER_TOOL_OPTIONS,
} from "@features/planner/model/planner.models";
import { toPlannerRequest } from "@features/planner/model/planner.schema";

export function useGoalInputPageController() {
  const navigate = useNavigate();
  const form = useGoalForm();
  const mutation = useGeneratePlanMutation();

  const toolOptions = useMemo(() => PLANNER_TOOL_OPTIONS, []);
  const providerOptions = useMemo(() => PLANNER_PROVIDER_OPTIONS, []);

  const submit = useCallback(
    form.handleSubmit((values) => {
      mutation.mutate(toPlannerRequest(values));
      navigate(ROUTE_PATHS.plannerResult);
    }),
    [form, mutation, navigate],
  );

  return {
    form,
    toolOptions,
    providerOptions,
    submit,
    isSubmitting: mutation.isPending,
  };
}
