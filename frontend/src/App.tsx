import { AppErrorBoundary } from "@app/boundaries/error-boundary";
import { LoadingBoundary } from "@app/boundaries/loading-boundary";
import { AppProviders } from "@app/providers/app-providers";
import { AppRouter } from "@app/router/router";

export default function App() {
  return (
    <AppErrorBoundary>
      <AppProviders>
        <LoadingBoundary>
          <AppRouter />
        </LoadingBoundary>
      </AppProviders>
    </AppErrorBoundary>
  );
}
