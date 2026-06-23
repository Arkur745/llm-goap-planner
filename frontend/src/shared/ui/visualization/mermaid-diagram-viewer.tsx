import { Alert, Box, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import type { MermaidConfig } from "mermaid";
import mermaid from "mermaid";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { AppSkeleton } from "@shared/ui/components/skeleton";

export interface MermaidDiagramViewerProps {
  diagram: string;
  title: string;
  description?: string;
  config?: MermaidConfig;
}

const defaultConfig: MermaidConfig = {
  startOnLoad: false,
  securityLevel: "strict",
  theme: "base",
  fontFamily: "Inter, Segoe UI, Arial, sans-serif",
};

mermaid.initialize(defaultConfig);

export function MermaidDiagramViewer({
  diagram,
  title,
  description,
  config,
}: MermaidDiagramViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const id = useId();
  const theme = useTheme();

  const resolvedConfig: MermaidConfig = useMemo(
    () => ({
      ...defaultConfig,
      ...config,
      theme: theme.palette.mode === "dark" ? "dark" : "default",
      themeVariables: {
        primaryColor: theme.palette.primary.main,
        primaryTextColor: theme.palette.text.primary,
        primaryBorderColor: theme.palette.primary.dark,
        lineColor: theme.palette.divider,
        secondaryColor: theme.palette.background.paper,
        tertiaryColor: theme.palette.background.default,
        fontFamily: "Inter, Segoe UI, Arial, sans-serif",
        ...(config?.themeVariables ?? {}),
      },
    }),
    [
      config,
      theme.palette.background.default,
      theme.palette.background.paper,
      theme.palette.divider,
      theme.palette.mode,
      theme.palette.primary.dark,
      theme.palette.primary.main,
      theme.palette.text.primary,
    ],
  );

  useEffect(() => {
    let isActive = true;

    async function renderDiagram() {
      if (!containerRef.current) {
        return;
      }

      containerRef.current.replaceChildren();

      if (!diagram.trim()) {
        setLoading(false);
        setErrorMessage("No Mermaid diagram was returned by the backend.");
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        mermaid.initialize(resolvedConfig);
        const { svg } = await mermaid.render(`mermaid-${id}`, diagram);

        if (!isActive || !containerRef.current) {
          return;
        }

        const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
        const svgElement = parsed.documentElement;
        const importedSvg = document.importNode(svgElement, true);

        containerRef.current.replaceChildren(importedSvg);
        setLoading(false);
      } catch (error) {
        if (!isActive) {
          return;
        }

        containerRef.current.replaceChildren();
        setLoading(false);
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to render Mermaid diagram.",
        );
      }
    }

    void renderDiagram();

    return () => {
      isActive = false;
    };
  }, [diagram, id, resolvedConfig]);

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h6" component="h3" fontWeight={700} gutterBottom>
          {title}
        </Typography>
        {description ? (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        ) : null}
      </Box>

      {loading ? <AppSkeleton variant="rounded" height={320} /> : null}

      {errorMessage ? (
        <Alert severity="warning" variant="outlined">
          {errorMessage}
        </Alert>
      ) : null}

      <Box
        ref={containerRef}
        component="div"
        aria-label={title}
        role="img"
        sx={{
          overflowX: "auto",
          "& svg": {
            width: "100%",
            height: "auto",
          },
        }}
      />
    </Stack>
  );
}
