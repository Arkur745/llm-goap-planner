import { z } from "zod";

import type { PlannerGeneratePlanRequest } from "@features/planner/model/planner.models";

export const plannerGoalSchema = z.object({
  mode: z.enum(["text", "form"]),
  goal: z.string().trim().max(2000).optional(),
  destination: z.string().trim().max(200).optional(),
  origin: z.string().trim().max(200).optional(),
  people: z.string().trim().max(100).optional(),
  budget: z.string().trim().max(100).optional(),
}).superRefine((data, ctx) => {
  if (data.mode === "text") {
    if (!data.goal || data.goal.trim().length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a goal with at least 3 characters.",
        path: ["goal"],
      });
    }
  } else {
    if (!data.destination || data.destination.trim().length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a destination with at least 3 characters.",
        path: ["destination"],
      });
    }
  }
});

export type PlannerGoalFormValues = z.infer<typeof plannerGoalSchema>;

export const plannerGoalDefaults: PlannerGoalFormValues = {
  mode: "text",
  goal: "",
  destination: "",
  origin: "",
  people: "",
  budget: "",
};

export function compileGoal(values: PlannerGoalFormValues): string {
  if (values.mode === "text") {
    return (values.goal || "").trim();
  }

  const dest = (values.destination || "").trim();
  const orig = (values.origin || "").trim();
  const ppl = (values.people || "").trim();
  const bud = (values.budget || "").trim();

  let compiled = `Plan a trip to ${dest}`;
  if (orig) {
    compiled += ` from ${orig}`;
  }
  if (ppl) {
    const pplNum = parseInt(ppl, 10);
    if (!isNaN(pplNum)) {
      compiled += ` for ${pplNum} people`;
    } else {
      compiled += ` for ${ppl} people`;
    }
  }
  if (bud) {
    compiled += ` with a budget of ${bud}`;
  }
  return compiled;
}

export function toPlannerRequest(values: PlannerGoalFormValues): PlannerGeneratePlanRequest {
  return {
    goal: compileGoal(values),
  };
}


