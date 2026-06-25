import { Box, Stack, Typography, Grid } from "@mui/material";
import type { FormEventHandler } from "react";
import type { Control, FieldErrors, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { useWatch } from "react-hook-form";

import { AppButton } from "@shared/ui/components/button";
import { AppTextarea } from "@shared/ui/components/textarea";
import { AppTextField } from "@shared/ui/components/text-field";
import { AppTabs, AppTab } from "@shared/ui/components/tabs";
import { compileGoal, type PlannerGoalFormValues } from "@features/planner/model/planner.schema";

interface GoalSubmissionFormProps {
  control: Control<PlannerGoalFormValues>;
  register: UseFormRegister<PlannerGoalFormValues>;
  setValue: UseFormSetValue<PlannerGoalFormValues>;
  errors: FieldErrors<PlannerGoalFormValues>;
  isSubmitting: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
}

// Inline SVG icons to bypass context issues
const ArrowRightIcon = () => (
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
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const CompassIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ marginRight: "6px", verticalAlign: "middle" }}
  >
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
);

export function GoalSubmissionForm({
  control,
  register,
  setValue,
  errors,
  isSubmitting,
  onSubmit,
}: GoalSubmissionFormProps) {
  const mode = useWatch({ control, name: "mode" }) || "text";

  const destination = useWatch({ control, name: "destination" }) || "";
  const origin = useWatch({ control, name: "origin" }) || "";
  const people = useWatch({ control, name: "people" }) || "";
  const budget = useWatch({ control, name: "budget" }) || "";

  const compiledPrompt = compileGoal({
    mode: "form",
    destination,
    origin,
    people,
    budget,
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: "text" | "form") => {
    setValue("mode", newValue, { shouldValidate: true });
  };

  return (
    <Box component="form" onSubmit={onSubmit} sx={{ width: "100%" }}>
      {/* Premium Tab Selector */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          mb: 3,
        }}
      >
        <Box
          sx={{
            background: (theme) =>
              theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
            border: "1px solid var(--color-border)",
            borderRadius: "30px",
            p: "4px",
            backdropFilter: "blur(8px)",
          }}
        >
          <AppTabs
            value={mode}
            onChange={handleTabChange}
            sx={{
              minHeight: "36px",
              "& .MuiTabs-indicator": {
                backgroundColor: "var(--color-accent)",
                borderRadius: "30px",
                height: "100%",
                opacity: 0.15,
              },
            }}
          >
            <AppTab
              value="text"
              label="Natural Language"
              sx={{
                minHeight: "36px",
                borderRadius: "30px",
                px: 3,
                fontSize: "0.85rem",
                fontWeight: 600,
                textTransform: "none",
                color: mode === "text" ? "var(--color-accent)" : "text.secondary",
                "&.Mui-selected": {
                  color: "var(--color-accent)",
                },
                transition: "all var(--transition-fast)",
              }}
            />
            <AppTab
              value="form"
              label="Form Wizard"
              sx={{
                minHeight: "36px",
                borderRadius: "30px",
                px: 3,
                fontSize: "0.85rem",
                fontWeight: 600,
                textTransform: "none",
                color: mode === "form" ? "var(--color-accent)" : "text.secondary",
                "&.Mui-selected": {
                  color: "var(--color-accent)",
                },
                transition: "all var(--transition-fast)",
              }}
            />
          </AppTabs>
        </Box>
      </Box>

      {mode === "text" ? (
        /* Text Prompt Mode */
        <AppTextarea
          placeholder="E.g., Plan a 3-day weekend trip to Rome with historical sightseeing"
          error={Boolean(errors.goal)}
          {...register("goal")}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mt: 3 }}
          >
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
              loading={isSubmitting}
              loadingText="Planning..."
              endIcon={isSubmitting ? null : <ArrowRightIcon />}
              sx={{
                borderRadius: "6px",
                px: 3,
                py: 0.8,
                fontWeight: 600,
                fontSize: "0.875rem",
                background: "linear-gradient(135deg, #7C5CFF 0%, #633EF8 100%)",
                boxShadow: "0 4px 14px 0 rgba(124, 92, 255, 0.25)",
                border: "none",
                color: "#FFFFFF",
                transition: "all var(--transition-fast)",
                "&:hover": {
                  background: "linear-gradient(135deg, #8B6EFF 0%, #6F4EFF 100%)",
                  transform: "translateY(-1.5px)",
                  boxShadow: "0 6px 20px 0 rgba(124, 92, 255, 0.35)",
                },
                "&:active": {
                  transform: "translateY(0.5px)",
                  boxShadow: "0 2px 8px 0 rgba(124, 92, 255, 0.2)",
                },
              }}
            />
          </Stack>
        </AppTextarea>
      ) : (
        /* Structured Form Mode */
        <Stack spacing={3} sx={{ width: "100%" }}>
          <Box
            sx={{
              background: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.01)",
              border: "1px solid var(--color-border)",
              borderRadius: "12px",
              p: 3,
              boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.04)",
              backdropFilter: "blur(4px)",
            }}
          >
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <AppTextField
                  label="Destination *"
                  placeholder="e.g. Goa, Paris, Rome"
                  error={Boolean(errors.destination)}
                  helperText={errors.destination?.message ?? "Where are you heading?"}
                  {...register("destination")}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <AppTextField
                  label="Origin"
                  placeholder="e.g. Mumbai, New York, Delhi"
                  error={Boolean(errors.origin)}
                  helperText="Where are you starting from?"
                  {...register("origin")}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <AppTextField
                  label="Number of People"
                  placeholder="e.g. 4"
                  error={Boolean(errors.people)}
                  helperText="How many travelers expected?"
                  {...register("people")}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <AppTextField
                  label="Expected Budget"
                  placeholder="e.g. $1500, 50,000 INR"
                  error={Boolean(errors.budget)}
                  helperText="Maximum budget for the trip?"
                  {...register("budget")}
                />
              </Grid>
            </Grid>
          </Box>

          {/* Compiled Preview Section */}
          {destination.trim().length >= 3 && (
            <Box
              sx={{
                background: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(124, 92, 255, 0.05)"
                    : "rgba(124, 92, 255, 0.02)",
                border: "1px dashed var(--color-accent)",
                borderRadius: "8px",
                p: 2,
                display: "flex",
                alignItems: "flex-start",
                gap: 1.5,
                transition: "all var(--transition-fast)",
              }}
            >
              <Box sx={{ color: "var(--color-accent)", display: "flex", mt: 0.3 }}>
                <CompassIcon />
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--color-accent)",
                    display: "block",
                    mb: 0.5,
                  }}
                >
                  Compiled Agent prompt
                </Typography>
                <Typography variant="body2" color="text.primary" sx={{ fontStyle: "italic" }}>
                  "{compiledPrompt}"
                </Typography>
              </Box>
            </Box>
          )}

          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
            <AppButton
              type="submit"
              variant="contained"
              loading={isSubmitting}
              loadingText="Planning..."
              endIcon={isSubmitting ? null : <ArrowRightIcon />}
              sx={{
                borderRadius: "6px",
                px: 4,
                py: 1,
                fontWeight: 600,
                fontSize: "0.875rem",
                background: "linear-gradient(135deg, #7C5CFF 0%, #633EF8 100%)",
                boxShadow: "0 4px 14px 0 rgba(124, 92, 255, 0.25)",
                border: "none",
                color: "#FFFFFF",
                transition: "all var(--transition-fast)",
                "&:hover": {
                  background: "linear-gradient(135deg, #8B6EFF 0%, #6F4EFF 100%)",
                  transform: "translateY(-1.5px)",
                  boxShadow: "0 6px 20px 0 rgba(124, 92, 255, 0.35)",
                },
                "&:active": {
                  transform: "translateY(0.5px)",
                  boxShadow: "0 2px 8px 0 rgba(124, 92, 255, 0.2)",
                },
              }}
            />
          </Stack>
        </Stack>
      )}
    </Box>
  );
}
