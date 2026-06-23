import Skeleton, { type SkeletonProps } from "@mui/material/Skeleton";

export type AppSkeletonProps = SkeletonProps;

export function AppSkeleton(props: AppSkeletonProps) {
  return <Skeleton {...props} />;
}
