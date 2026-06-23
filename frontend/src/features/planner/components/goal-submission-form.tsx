import {
  Checkbox,
  Chip,
  FormControl,
  FormHelperText,
  InputLabel,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import type { FormEventHandler } from "react";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";
import { Controller } from "react-hook-form";

import { AppButton } from "@shared/ui/components/button";
import { AppSelect } from "@shared/ui/components/select";
import { AppTextField } from "@shared/ui/components/text-field";
import type {
  PlannerProviderOption,
  PlannerToolOption,
} from "@features/planner/model/planner.models";
import type { PlannerGoalFormValues } from "@features/planner/model/planner.schema";

interface GoalSubmissionFormProps {
  control: Control<PlannerGoalFormValues>;
  register: UseFormRegister<PlannerGoalFormValues>;
  errors: FieldErrors<PlannerGoalFormValues>;
  isSubmitting: boolean;
  toolOptions: PlannerToolOption[];
  providerOptions: PlannerProviderOption[];
  onSubmit: FormEventHandler<HTMLFormElement>;
}

export function GoalSubmissionForm({
  control,
  register,
  errors,
  isSubmitting,
  toolOptions,
  providerOptions,
  onSubmit,
}: GoalSubmissionFormProps) {
  return (
    <Paper component="form" onSubmit={onSubmit} variant="outlined" sx={{ p: { xs: 2.5, md: 4 } }}>
      <Stack spacing={3}>
        <div>
          <Typography variant="h5" component="h2" fontWeight={700} gutterBottom>
            Describe the goal
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The backend remains the source of truth. This form only validates and forwards your
            request.
          </Typography>
        </div>

        <AppTextField
          label="Goal"
          placeholder="Plan a multi-agent launch workflow"
          multiline
          minRows={6}
          maxRows={12}
          error={Boolean(errors.goal)}
          helperText={errors.goal?.message ?? "Enter a clear goal for the planner."}
          {...register("goal")}
        />

        <Controller
          control={control}
          name="provider"
          render={({ field }) => (
            <AppSelect
              label="Provider"
              id="planner-provider"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              inputRef={field.ref}
              error={Boolean(errors.provider)}
              helperText={errors.provider?.message ?? "Choose the backend provider preference."}
            >
              {providerOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <ListItemText primary={option.label} secondary={option.description} />
                </MenuItem>
              ))}
            </AppSelect>
          )}
        />

        <Controller
          control={control}
          name="tools"
          render={({ field }) => (
            <FormControl fullWidth error={Boolean(errors.tools)}>
              <InputLabel id="planner-tools-label">Agents</InputLabel>
              <Select
                labelId="planner-tools-label"
                id="planner-tools"
                multiple
                label="Agents"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                renderValue={(selected) => (
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {selected.map((tool) => {
                      const matched = toolOptions.find((option) => option.value === tool);
                      return <Chip key={tool} label={matched?.label ?? tool} size="small" />;
                    })}
                  </Stack>
                )}
              >
                {toolOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Checkbox checked={field.value.includes(option.value)} />
                    <ListItemText primary={option.label} secondary={option.description} />
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {errors.tools?.message ?? "Select at least one agent to execute the plan."}
              </FormHelperText>
            </FormControl>
          )}
        />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="flex-end">
          <AppButton type="submit" variant="contained" size="large" disabled={isSubmitting}>
            {isSubmitting ? "Planning..." : "Generate plan"}
          </AppButton>
        </Stack>
      </Stack>
    </Paper>
  );
}
