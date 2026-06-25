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
          pt: { xs: 1, md: 1.5 }, // shifted up to reduce top whitespace
          pb: { xs: 6, md: 8 },
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
        }}
      >
        {/* Centered Premium Hero Section */}
        <Stack
          alignItems="center"
          sx={{
            position: "relative",
            mb: 5, // generous spacing above the goal input card
            width: "100%",
            textAlign: "center",
          }}
          spacing={3} // spacious rhythm between header items
        >
          {/* Subtle backglow behind heading */}
          <Box
            sx={{
              position: "absolute",
              top: "55%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "480px",
              height: "220px",
              borderRadius: "50%",
              background: (theme) =>
                theme.palette.mode === "dark"
                  ? "radial-gradient(circle, rgba(124, 92, 255, 0.08) 0%, rgba(124, 92, 255, 0) 70%)"
                  : "radial-gradient(circle, rgba(124, 92, 255, 0.03) 0%, rgba(124, 92, 255, 0) 70%)",
              filter: "blur(60px)",
              zIndex: -1,
              pointerEvents: "none",
            }}
          />

          {/* Badge */}
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 1,
              px: 2,
              py: 0.6,
              borderRadius: "99px",
              border: "1px solid var(--color-border)",
              backgroundColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
              backdropFilter: "blur(8px)",
              transition: "border-color var(--transition-fast)",
              mb: 1,
              "&:hover": {
                borderColor: "var(--color-border-hover)",
              },
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--color-accent)",
                display: "flex",
                alignItems: "center",
                gap: 0.8,
                fontSize: "0.72rem",
              }}
            >
              <span style={{ fontSize: "0.9rem", lineHeight: 0, position: "relative", top: "-1px" }}>✦</span> AI Planner
            </Typography>
          </Box>

          {/* Split Heading with subtle animated word gradient */}
          <Typography
            component="h1"
            sx={{
              fontSize: { xs: "2.35rem", sm: "3.25rem", md: "4rem" },
              fontWeight: 800,
              lineHeight: 1.12,
              letterSpacing: "-0.04em",
              color: "text.primary",
              maxWidth: "800px",
            }}
          >
            What would you like<br />
            to <span className="animated-gradient-text">accomplish</span>?
          </Typography>

          {/* Subtitle */}
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              maxWidth: "640px",
              mt: 1.5,
              lineHeight: 1.6,
              fontWeight: 400,
              fontSize: { xs: "1rem", sm: "1.05rem" },
            }}
          >
            Describe your objective in natural language or use the form wizard. The planner will decompose it into an executable multi-agent workflow.
          </Typography>
        </Stack>

        {/* Center Prompt Box */}
        <Box sx={{ width: "100%", maxWidth: "720px", mt: 1 }}>
          <GoalSubmissionForm
            control={form.control}
            register={form.register}
            setValue={form.setValue}
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
              mt: 3.5,
              opacity: 0.65,
            }}
          >
            <InfoIcon />
            <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: "-0.01em" }}>
              Your goal is parsed securely before plan generation.
            </Typography>
          </Box>
        </Box>
      </SectionContainer>
    </PageContainer>
  );
}
