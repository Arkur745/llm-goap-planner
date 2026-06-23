import type { ErrorInfo, PropsWithChildren, ReactNode } from "react";
import { Component } from "react";

import { ErrorScreen } from "@shared/ui/error-screen";

interface ErrorBoundaryState {
  hasError: boolean;
}

interface ErrorBoundaryProps extends PropsWithChildren {
  fallback?: ReactNode;
}

export class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Reserved for future telemetry wiring.
    void error;
    void errorInfo;
  }

  private handleReset = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? <ErrorScreen onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}
