import { Grid, Stack, Typography } from "@mui/material";

import { EmptyState } from "@shared/ui/feedback/empty-state";
import { PageContainer } from "@shared/ui/layout/page-container";
import { SectionContainer } from "@shared/ui/layout/section-container";
import { PlanCard } from "@features/planner/components/plan-card";
import { PlanMetadata } from "@features/planner/components/plan-metadata";
import { PlanSteps } from "@features/planner/components/plan-steps";
import { PlannerErrorState } from "@features/planner/components/planner-error-state";
import { PlannerLoadingState } from "@features/planner/components/planner-loading-state";
import { usePlanResultPageController } from "@features/planner/hooks/use-plan-result-page-controller";
import { APP_NAME } from "@shared/constants/app";

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function PlanResultPage() {
  const { result, status, errorMessage, isLoading, hasResult, handleRetry, handleStartOver } =
    usePlanResultPageController();

  return (
    <PageContainer maxWidth="xl">
      <SectionContainer sx={{ py: { xs: 3, md: 6 } }}>
        <Stack spacing={2} sx={{ mb: 4 }}>
          <Typography variant="overline" color="text.secondary">
            Planner
          </Typography>
          <Typography variant="h3" component="h1" fontWeight={800}>
            Plan result
          </Typography>
          <Typography variant="body1" color="text.secondary" maxWidth={760}>
            Results are read from the backend response and rendered without unsafe HTML.
          </Typography>
        </Stack>

        {isLoading ? <PlannerLoadingState /> : null}

        {!isLoading && status === "error" ? (
          <PlannerErrorState
            title={`${APP_NAME} could not generate a plan`}
            description={
              errorMessage ?? "A network or backend failure occurred while generating the plan."
            }
            onRetry={handleRetry}
            onStartOver={handleStartOver}
          />
        ) : null}

        {!isLoading && status === "idle" ? (
          <EmptyState
            title="No plan available yet"
            description="Submit a goal from the input page to generate a plan result."
          />
        ) : null}

        {!isLoading && status === "success" && result && hasResult ? (
          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <Stack spacing={3}>
                <PlanCard title="Summary" subtitle={result.goal}>
                  <Typography variant="body1" color="text.secondary">
                    {result.summary}
                  </Typography>
                </PlanCard>

                <PlanCard
                  title="Action steps"
                  subtitle={`${result.steps.length} steps returned by the backend`}
                >
                  <PlanSteps steps={result.steps} />
                </PlanCard>
              </Stack>
            </Grid>

            <Grid item xs={12} lg={4}>
              <Stack spacing={3}>
                <PlanMetadata
                  items={[
                    { label: "Status", value: result.status },
                    { label: "Source", value: result.source },
                    { label: "Generated", value: formatDateTime(result.generatedAt) },
                    { label: "Classification", value: result.classification ?? "N/A" },
                  ]}
                />

                <PlanCard title="Execution details" subtitle="Backend response fields kept intact">
                  <Typography variant="body2" color="text.secondary">
                    The planner API returned the expected response shape and the frontend renders it
                    directly.
                  </Typography>
                </PlanCard>
              </Stack>
            </Grid>
          </Grid>
        ) : null}
      </SectionContainer>
    </PageContainer>
  );
}
