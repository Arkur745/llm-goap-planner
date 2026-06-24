import { Box, Stack, TextField, Typography } from "@mui/material";
import type { FormEventHandler } from "react";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";

import { AppButton } from "@shared/ui/components/button";
import type { PlannerGoalFormValues } from "@features/planner/model/planner.schema";

interface GoalSubmissionFormProps {
  control: Control<PlannerGoalFormValues>;
  register: UseFormRegister<PlannerGoalFormValues>;
  errors: FieldErrors<PlannerGoalFormValues>;
  isSubmitting: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
}

// Inline SVG for the button icon to bypass any React 19 / SvgIcon context issue
const ArrowUpIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </svg>
);

export function GoalSubmissionForm({
  register,
  errors,
  isSubmitting,
  onSubmit,
}: GoalSubmissionFormProps) {
  return (
    <Box component="form" onSubmit={onSubmit} sx={{ width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          backgroundColor: "var(--color-surface-elevated)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          p: 2,
          transition: "all var(--transition-fast)",
          "&:focus-within": {
            borderColor: "var(--color-accent)",
            boxShadow: "0 0 0 1px var(--color-accent)",
          },
        }}
      >
        <TextField
          fullWidth
          multiline
          minRows={4}
          maxRows={10}
          placeholder="E.g., Plan a 3-day weekend trip to Rome with historical sightseeing"
          error={Boolean(errors.goal)}
          {...register("goal")}
          sx={{
            "& .MuiOutlinedInput-root": {
              backgroundColor: "transparent",
              padding: 0,
              fontSize: "1rem",
              lineHeight: 1.5,
              "& .MuiOutlinedInput-notchedOutline": {
                border: "none",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                border: "none",
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                border: "none",
              },
            },
          }}
        />

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mt: 2 }}
        >
          {/* Helper or error message */}
          <Typography
            variant="caption"
            color={errors.goal ? "error" : "text.secondary"}
            sx={{ fontWeight: 500 }}
          >
            {errors.goal?.message ?? ""}
          </Typography>

          <AppButton
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            endIcon={isSubmitting ? null : <ArrowUpIcon />}
            sx={{
              borderRadius: "var(--radius-sm)",
              px: 2.5,
              py: 1,
              fontWeight: 600,
              transition: "transform var(--transition-fast), background-color var(--transition-fast)",
              "&:hover": {
                transform: "translateY(-1px)",
              },
              "&:active": {
                transform: "translateY(0)",
              },
            }}
          >
            {isSubmitting ? "Planning..." : "Generate Plan"}
          </AppButton>
        </Stack>
      </Box>
    </Box>
  );
}


