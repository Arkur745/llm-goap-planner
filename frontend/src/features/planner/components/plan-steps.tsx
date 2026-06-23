import { List, ListItem, ListItemText } from "@mui/material";

import type { PlanStep } from "@shared/types/api";

interface PlanStepsProps {
  steps: PlanStep[];
}

export function PlanSteps({ steps }: PlanStepsProps) {
  return (
    <List disablePadding>
      {steps.map((step) => (
        <ListItem
          key={`${step.order}-${step.title}`}
          divider
          alignItems="flex-start"
          sx={{ px: 0 }}
        >
          <ListItemText
            primary={`${step.order}. ${step.title}`}
            secondary={step.details || step.agent}
            secondaryTypographyProps={{ component: "div" }}
          />
        </ListItem>
      ))}
    </List>
  );
}
