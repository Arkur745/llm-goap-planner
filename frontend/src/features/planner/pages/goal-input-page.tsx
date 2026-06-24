import { Box, Stack, Typography } from "@mui/material";

import { PageContainer } from "@shared/ui/layout/page-container";
import { SectionContainer } from "@shared/ui/layout/section-container";
import { GoalSubmissionForm } from "@features/planner/components/goal-submission-form";
import { useGoalInputPageController } from "@features/planner/hooks/use-goal-input-page-controller";

// Info Icon inline SVG to avoid React 19 / SvgIcon context bugs
const InfoIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

export function GoalInputPage() {
  const { form, submit, isSubmitting } = useGoalInputPageController();

  return (
    <PageContainer maxWidth="md">
      <SectionContainer
        sx={{
          py: { xs: 4, md: 8 },
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
        }}
      >
        {/* Centered Heading */}
        <Stack spacing={1.5} alignItems="center" sx={{ mb: 5, textAlign: "center" }}>
          <Typography
            variant="h3"
            component="h1"
            fontWeight="var(--font-weight-bold)"
            letterSpacing="-0.03em"
            sx={{ fontSize: { xs: "2rem", md: "2.5rem" } }}
          >
            What would you like to accomplish?
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            maxWidth={580}
            sx={{ fontSize: "1.05rem" }}
          >
            Describe your goal in natural language. The planner will decompose it into an executable workflow.
          </Typography>
        </Stack>

        {/* Center Prompt Box */}
        <Box sx={{ width: "100%", maxWidth: "720px" }}>
          <GoalSubmissionForm
            control={form.control}
            register={form.register}
            errors={form.formState.errors}
            isSubmitting={isSubmitting}
            onSubmit={submit}
          />

          {/* Validation small info panel */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              mt: 3,
              opacity: 0.6,
            }}
          >
            <InfoIcon />
            <Typography variant="caption" color="text.secondary">
              Requires a minimum of 3 characters. Your goal is parsed securely before plan generation.
            </Typography>
          </Box>
        </Box>
      </SectionContainer>
    </PageContainer>
  );
}

