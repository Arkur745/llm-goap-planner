import Card, { type CardProps } from "@mui/material/Card";
import CardContent, { type CardContentProps } from "@mui/material/CardContent";
import CardHeader, { type CardHeaderProps } from "@mui/material/CardHeader";
import type { PropsWithChildren } from "react";

export type AppCardProps = CardProps;
export type AppCardContentProps = CardContentProps;
export type AppCardHeaderProps = CardHeaderProps;

export function AppCard(props: AppCardProps) {
  return <Card {...props} />;
}

export function AppCardHeader(props: AppCardHeaderProps) {
  return <CardHeader {...props} />;
}

export function AppCardContent({ children, ...props }: PropsWithChildren<AppCardContentProps>) {
  return <CardContent {...props}>{children}</CardContent>;
}
