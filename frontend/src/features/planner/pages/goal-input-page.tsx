import { Box, Grid, Stack, Typography } from "@mui/material";

import { PageContainer } from "@shared/ui/layout/page-container";
import { SectionContainer } from "@shared/ui/layout/section-container";
import { GoalSubmissionForm } from "@features/planner/components/goal-submission-form";
import { useGoalInputPageController } from "@features/planner/hooks/use-goal-input-page-controller";

export function GoalInputPage() {
  const { form, toolOptions, providerOptions, submit, isSubmitting } = useGoalInputPageController();

  return (
    <PageContainer maxWidth="lg">
      <SectionContainer sx={{ py: { xs: 3, md: 6 } }}>
        <Stack spacing={2} sx={{ mb: 4 }}>
          <Typography variant="overline" color="text.secondary">
            Planner
          </Typography>
          <Typography variant="h3" component="h1" fontWeight={800}>
            Goal input
          </Typography>
          <Typography variant="body1" color="text.secondary" maxWidth={760}>
            Enter a goal, choose the preferred provider, and select the agents that should be
            available for the backend planner.
          </Typography>
        </Stack>

        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <GoalSubmissionForm
              control={form.control}
              register={form.register}
              errors={form.formState.errors}
              isSubmitting={isSubmitting}
              toolOptions={toolOptions}
              providerOptions={providerOptions}
              onSubmit={submit}
            />
          </Grid>
          <Grid item xs={12} lg={4}>
            <Box
              component="aside"
              aria-label="Goal guidance"
              sx={{ p: 3, borderRadius: 3, border: 1, borderColor: "divider" }}
            >
              <Stack spacing={2}>
                <Typography variant="h6" component="h2" fontWeight={700}>
                  Validation rules
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  The form validates the goal, provider, and selected agents before any request
                  reaches the backend.
                </Typography>
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </SectionContainer>
    </PageContainer>
  );
}
