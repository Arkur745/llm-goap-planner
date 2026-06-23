import type { PropsWithChildren, ReactNode } from "react";
import { Suspense } from "react";

import { LoadingScreen } from "@shared/ui/loading-screen";

interface LoadingBoundaryProps extends PropsWithChildren {
  fallback?: ReactNode;
}

export function LoadingBoundary({ children, fallback }: LoadingBoundaryProps) {
  return <Suspense fallback={fallback ?? <LoadingScreen />}>{children}</Suspense>;
}
