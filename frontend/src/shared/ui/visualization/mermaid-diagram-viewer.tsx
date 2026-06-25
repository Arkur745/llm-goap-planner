import { Alert, Box, IconButton, Stack, Typography } from "@mui/material";
import type { MermaidConfig } from "mermaid";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";

import { AppSkeleton } from "@shared/ui/components/skeleton";

const BLOCKED_SVG_TAGS = new Set(["script", "iframe", "object", "embed", "link"]);

// Inline SVG Icons for developer style toolbar
const ResetIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <polyline points="3 3 3 8 8 8" />
  </svg>
);

const SvgIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5 5 5 5-5m-5 5V3" />
  </svg>
);

const PngIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const FullscreenIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
  </svg>
);

const FullscreenExitIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14h6v6m10-6h-6v6M4 10h6V4m10 6h-6V4" />
  </svg>
);

const ZoomInIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="11" y1="8" x2="11" y2="14" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

const ZoomOutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

const FitIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 14 10 14 10 20" />
    <polyline points="20 10 14 10 14 4" />
    <polyline points="14 20 14 14 20 14" />
    <polyline points="10 4 10 10 4 10" />
  </svg>
);

export interface MermaidDiagramViewerProps {
  diagram: string;
  title?: string;
  description?: string;
  config?: MermaidConfig;
  maxWidth?: string | number;
}

const defaultConfig: MermaidConfig = {
  startOnLoad: false,
  securityLevel: "loose",
  theme: "base",
  fontFamily: "Inter, Segoe UI, Arial, sans-serif",
};

function validateFlowchartNodesAndEdges(source: string): { isValid: boolean; error?: string } {
  const lines = source.split("\n");
  const declaredNodes = new Map<string, string>(); // ID -> Label
  const referencedNodes = new Set<string>();

  // Matches node declarations with their shape/label brackets
  // e.g., START((Goal: ...)) or S1[1. Step Title]
  const nodeDeclRegex = /([a-zA-Z0-9_-]+)(?:\["([^"]+)"\]|\[([^\]]+)\]|\(\("([^"]+)"\)\)|\(\(([^)]+)\)\)|\(\["([^"]+)"\]\)|\(\[([^\]]+)\]\)|\("([^"]+)"\)|\(([^)]+)\)|\{"([^"]+)"\}|\{([^}]+)\})/g;

  for (let line of lines) {
    line = line.trim();
    if (
      !line ||
      line.startsWith("%%") ||
      line.startsWith("flowchart") ||
      line.startsWith("graph") ||
      line.startsWith("subgraph") ||
      line.startsWith("end") ||
      line.startsWith("style") ||
      line.startsWith("classDef") ||
      line.startsWith("class") ||
      line.startsWith("click") ||
      line.startsWith("linkStyle")
    ) {
      continue;
    }

    // Find declarations on this line
    let match;
    nodeDeclRegex.lastIndex = 0;
    while ((match = nodeDeclRegex.exec(line)) !== null) {
      const nodeId = match[1];
      const label = match.slice(2).find(g => g !== undefined && g.trim() !== "");
      if (nodeId) {
        declaredNodes.set(nodeId, label || "");
      }
    }

    // Find node references in connections/edges (e.g. S1 --> S2 or START --> S1)
    const edgeRegex = /-->|---|-.->|==>/;
    if (edgeRegex.test(line)) {
      const parts = line.split(edgeRegex).map(p => p.trim());
      for (let part of parts) {
        if (!part) continue;
        if (part.startsWith("|")) {
          const closingPipeIdx = part.indexOf("|", 1);
          if (closingPipeIdx !== -1) {
            part = part.substring(closingPipeIdx + 1).trim();
          }
        }
        // Extract node ID from the start of the part (e.g. from "S1[Label]" or just "S1")
        const idMatch = part.match(/^([a-zA-Z0-9_-]+)/);
        if (idMatch && idMatch[1]) {
          referencedNodes.add(idMatch[1]);
        }
      }
    } else {
      // It's a single line declaration/ref like "START((Goal: Plan))" or "S1"
      const idMatch = line.match(/^([a-zA-Z0-9_-]+)/);
      if (idMatch && idMatch[1]) {
        referencedNodes.add(idMatch[1]);
      }
    }
  }

  // Verify that every referenced node ID exists in declaredNodes and is not empty
  for (const nodeId of referencedNodes) {
    if (
      nodeId === "flowchart" ||
      nodeId === "graph" ||
      nodeId === "subgraph" ||
      nodeId === "end" ||
      nodeId === "style" ||
      nodeId === "classDef" ||
      nodeId === "class" ||
      nodeId === "click" ||
      nodeId === "linkStyle"
    ) {
      continue;
    }
    if (!declaredNodes.has(nodeId)) {
      return { isValid: false, error: `Node '${nodeId}' is referenced in the flowchart but has no label/declaration.` };
    }
    const label = declaredNodes.get(nodeId);
    if (!label || label.trim() === "") {
      return { isValid: false, error: `Node '${nodeId}' has an empty label.` };
    }
  }

  // Verify that every edge specifically references existing node IDs
  for (let line of lines) {
    line = line.trim();
    if (
      !line ||
      line.startsWith("%%") ||
      line.startsWith("flowchart") ||
      line.startsWith("graph") ||
      line.startsWith("subgraph") ||
      line.startsWith("end") ||
      line.startsWith("style") ||
      line.startsWith("classDef") ||
      line.startsWith("class") ||
      line.startsWith("click") ||
      line.startsWith("linkStyle")
    ) {
      continue;
    }

    const edgeRegex = /-->|---|-.->|==>/;
    if (edgeRegex.test(line)) {
      const parts = line.split(edgeRegex).map(p => p.trim());
      for (let part of parts) {
        if (!part) continue;
        if (part.startsWith("|")) {
          const closingPipeIdx = part.indexOf("|", 1);
          if (closingPipeIdx !== -1) {
            part = part.substring(closingPipeIdx + 1).trim();
          }
        }
        const idMatch = part.match(/^([a-zA-Z0-9_-]+)/);
        if (idMatch && idMatch[1]) {
          const nodeId = idMatch[1];
          if (!declaredNodes.has(nodeId)) {
            return { isValid: false, error: `Edge references non-existent node ID '${nodeId}'.` };
          }
        }
      }
    }
  }

  return { isValid: true };
}


function sanitizeSvg(svgElement: Element): SVGElement {
  if (!(svgElement instanceof SVGElement)) {
    throw new Error("Mermaid output was not a valid SVG document.");
  }

  const elements = Array.from(svgElement.querySelectorAll("*")).reverse();

  for (const element of elements) {
    const tagName = element.tagName.toLowerCase();

    if (BLOCKED_SVG_TAGS.has(tagName)) {
      element.remove();
      continue;
    }

    for (const attribute of Array.from(element.attributes)) {
      const attributeName = attribute.name.toLowerCase();
      const attributeValue = attribute.value.trim().toLowerCase();

      if (attributeName.startsWith("on")) {
        element.removeAttribute(attribute.name);
      }

      if (
        (attributeName === "href" || attributeName === "xlink:href" || attributeName === "src") &&
        attributeValue.startsWith("javascript:")
      ) {
        element.removeAttribute(attribute.name);
      }
    }
  }

  return svgElement;
}

export function MermaidDiagramViewer({
  diagram,
  title = "Execution Workflow",
  description = "Generated execution plan based on your goal.",
  config,
  maxWidth = "400px",
}: MermaidDiagramViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerContainerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const id = useId();

  const resolvedConfig: MermaidConfig = useMemo(
    () => ({
      ...defaultConfig,
      ...config,
      theme: "base",
      themeVariables: {
        background: "transparent",
        primaryColor: "#091321",
        primaryTextColor: "#F8FAFC",
        primaryBorderColor: "#8B5CF6",
        lineColor: "#8B5CF6",
        textColor: "#F8FAFC",
        fontFamily: "Inter, sans-serif",
        fontSize: "10px",
        mainBkg: "#091321",
        nodeBorder: "#8B5CF6",
        nodePadding: "12px",
        clusterBkg: "rgba(139, 92, 246, 0.03)",
        clusterBorder: "rgba(139, 92, 246, 0.15)",
        edgeLabelBackground: "#030712",
        labelBackground: "#030712",
        titleColor: "#F8FAFC",
        ganttLabelColor: "#F8FAFC",
        ganttLabelFontSize: "14px",
        ganttTitleColor: "#F8FAFC",
        ganttTitleFontSize: "20px",
        ganttSectionBkgColor: "transparent",
        ganttSectionBkgColor2: "transparent",
        ganttGridLineColor: "rgba(255, 255, 255, 0.05)",
        ganttTodayLineColor: "#EF4444",
        ...(config?.themeVariables ?? {}),
      },
        flowchart: {
          nodeSpacing: 20, // slightly more spacing
          rankSpacing: 20,
          curve: "basis",
          useMaxWidth: true,
          htmlLabels: false,
          padding: 8,
        },
        securityLevel: "loose",
      gantt: {
        titlePadding: 24,
        barHeight: 32, // Increased task bar height
        barGap: 12,    // Better spacing
        topPadding: 60,
        sidePadding: 100,
        fontSize: 14,
        sectionFontSize: 18,
        useWidth: 1200,
        useMaxWidth: true,
        ...(config?.gantt ?? {}),
      },
    }),
    [config],
  );

  useEffect(() => {
    let isActive = true;

    async function renderDiagram() {
      if (!containerRef.current) {
        return;
      }

      containerRef.current.replaceChildren();

      if (!diagram || !diagram.trim()) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        const mermaidModule = await import("mermaid");
        
        // 2. Print the exact Mermaid source string before rendering
        console.log(`[Mermaid Diagram Source - ${title}]:\n`, diagram);

        // 3. Validate that the generated Mermaid syntax is valid
        const isGantt = title.toLowerCase().includes("gantt") || title.toLowerCase().includes("roadmap") || diagram.trim().startsWith("gantt");
        
        // 8. Ensure Gantt component is actually receiving Mermaid Gantt syntax beginning with gantt
        if (isGantt) {
          if (!diagram.trim().startsWith("gantt")) {
            throw new Error("Gantt component must receive Mermaid Gantt syntax beginning with 'gantt' and not flowchart syntax.");
          }
        } else {
          // Flowchart validation
          if (!diagram.trim().startsWith("flowchart") && !diagram.trim().startsWith("graph")) {
            throw new Error("Flowchart component must receive Mermaid flowchart syntax beginning with 'flowchart' or 'graph'.");
          }
          // 4. Verify every node has a label. 5. Verify every edge references existing node IDs.
          const flowchartValidation = validateFlowchartNodesAndEdges(diagram);
          if (!flowchartValidation.isValid) {
            throw new Error(`Flowchart validation failed: ${flowchartValidation.error}`);
          }
        }

        // Initialize Mermaid
        mermaidModule.default.initialize(resolvedConfig);

        // 6. Verify the Mermaid parser reports no errors
        try {
          await mermaidModule.default.parse(diagram);
        } catch (parseError) {
          throw new Error(`Mermaid parser error: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        }

        const cleanId = id.replace(/:/g, "").replace(/[^a-zA-Z0-9-]/g, "");
        const uniqueRenderId = `mermaid-${cleanId}-${Math.random().toString(36).substring(2, 9)}`;
        
        // 10. Verify that Mermaid render() returns a valid SVG
        const { svg } = await mermaidModule.default.render(uniqueRenderId, diagram);
        if (!svg || !svg.trim().startsWith("<svg")) {
          throw new Error("Mermaid render did not return a valid SVG.");
        }

        if (!isActive || !containerRef.current) {
          return;
        }

        const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
        const svgElement = parsed.documentElement;
        
        // Remove fixed width/height attributes for fluid scaling inside the viewport container
        svgElement.removeAttribute("width");
        svgElement.removeAttribute("height");
        svgElement.style.width = "100%";
        svgElement.style.height = "100%";
        svgElement.style.maxWidth = "100%";
        svgElement.style.maxHeight = "100%";

        // Programmatic SVG Post-processing (Clean and functional)
        // 1. Inject linear gradient for flowchart connections
        let defs = svgElement.querySelector("defs");
        if (!defs) {
          defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
          svgElement.insertBefore(defs, svgElement.firstChild);
        }

        const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
        gradient.setAttribute("id", "purple-gradient");
        gradient.setAttribute("x1", "0%");
        gradient.setAttribute("y1", "0%");
        gradient.setAttribute("x2", "100%");
        gradient.setAttribute("y2", "100%");

        const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        stop1.setAttribute("offset", "0%");
        stop1.setAttribute("stop-color", "#8B5CF6");

        const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        stop2.setAttribute("offset", "100%");
        stop2.setAttribute("stop-color", "#EC4899");

        gradient.appendChild(stop1);
        gradient.appendChild(stop2);
        defs.appendChild(gradient);

        // 2. Customize flowchart nodes (only rects for rounded corners)
        const rects = svgElement.querySelectorAll(".node rect");
        rects.forEach(rect => {
          rect.setAttribute("rx", "12");
          rect.setAttribute("ry", "12");
        });

        // 3. Flowchart edge connection colors using gradient (no buggy/hidden draw animations)
        const edgePaths = svgElement.querySelectorAll(".edgePath .path");
        edgePaths.forEach((path) => {
          path.setAttribute("stroke", "url(#purple-gradient)");
          path.setAttribute("stroke-width", "4");
        });

        // 4. Customize Gantt timeline bars (rounded corners, no hidden opacity/scale animations)
        const ganttRects = svgElement.querySelectorAll("rect.task, rect.done, rect.active, rect.crit");
        ganttRects.forEach((rect) => {
          rect.setAttribute("rx", "8");
          rect.setAttribute("ry", "8");
        });

        const importedSvg = document.importNode(sanitizeSvg(svgElement), true);

        // Mount into DOM
        containerRef.current.replaceChildren(importedSvg);
        setLoading(false);
      } catch (error) {
        if (!isActive) {
          return;
        }

        console.error("Mermaid diagram rendering error:", error);
        containerRef.current?.replaceChildren();
        setLoading(false);
        // 9. If the Gantt renderer fails, surface the Mermaid parse error instead of silently rendering nothing.
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to render Mermaid diagram.",
        );
      }
    }

    void renderDiagram();

    return () => {
      isActive = false;
    };
  }, [diagram, id, resolvedConfig, title]);

  // Serializes diagram SVG, embedding styling details for clean file export downloads
  const getStyledSVGSource = (svgElement: SVGElement): string => {
    const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
    
    // Ensure the cloned SVG has the correct namespace
    clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clonedSvg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

    // Set explicit width/height from viewBox for better export compatibility
    if (svgElement instanceof SVGSVGElement && svgElement.viewBox?.baseVal) {
      const { width, height } = svgElement.viewBox.baseVal;
      if (width > 0 && height > 0) {
        clonedSvg.setAttribute("width", width.toString());
        clonedSvg.setAttribute("height", height.toString());
      }
    } else {
      const bbox = (svgElement as any).getBBox?.() || svgElement.getBoundingClientRect();
      if (bbox.width > 0 && bbox.height > 0) {
        clonedSvg.setAttribute("width", bbox.width.toString());
        clonedSvg.setAttribute("height", bbox.height.toString());
      }
    }

    // Inject gradient definition for downloads if missing
    let defs = clonedSvg.querySelector("defs");
    if (!defs) {
      defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      clonedSvg.insertBefore(defs, clonedSvg.firstChild);
    }
    if (!defs.querySelector("#purple-gradient")) {
      const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
      gradient.setAttribute("id", "purple-gradient");
      gradient.setAttribute("x1", "0%");
      gradient.setAttribute("y1", "0%");
      gradient.setAttribute("x2", "100%");
      gradient.setAttribute("y2", "100%");
      
      const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
      stop1.setAttribute("offset", "0%");
      stop1.setAttribute("stop-color", "#8B5CF6");
      
      const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
      stop2.setAttribute("offset", "100%");
      stop2.setAttribute("stop-color", "#EC4899");
      
      gradient.appendChild(stop1);
      gradient.appendChild(stop2);
      defs.appendChild(gradient);
    }

    const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
    styleEl.textContent = `
      svg {
        background: #030712 !important;
      }
      .node rect, .node circle, .node polygon, .node path {
        fill: #091321 !important;
        stroke: #8B5CF6 !important;
        stroke-width: 2px !important;
        rx: 8px !important;
        ry: 8px !important;
        filter: drop-shadow(0 10px 24px rgba(0, 0, 0, 0.45));
      }
      .node .label, .nodeLabel, .label span, .node foreignObject div, .node text, .node tspan {
        font-family: 'Inter', 'Segoe UI', Arial, sans-serif !important;
        font-weight: 600 !important;
        fill: #F8FAFC !important;
        color: #F8FAFC !important;
        font-size: 10px !important;
        text-anchor: middle !important;
        dominant-baseline: central !important;
      }
      .edgePath .path {
        stroke: url(#purple-gradient) !important;
        stroke-width: 3px !important;
        stroke-linecap: round !important;
        stroke-linejoin: round !important;
      }
      marker, [id^=mermaid-marker] {
        fill: #8B5CF6 !important;
        stroke: none !important;
      }
      .edgeLabel rect {
        fill: #030712 !important;
        rx: 6px !important;
        ry: 6px !important;
        stroke: rgba(255, 255, 255, 0.08) !important;
      }
      .edgeLabel span, .edgeLabel text {
        font-family: 'Inter', sans-serif !important;
        font-size: 12px !important;
        font-weight: 500 !important;
        fill: #94A3B8 !important;
      }
      /* Gantt Chart Overrides */
      rect.secNode, .secNode {
        fill: rgba(255, 255, 255, 0.02) !important;
        stroke: rgba(255, 255, 255, 0.05) !important;
        stroke-width: 1px !important;
      }
      .grid .tick text, .axisFormat, text.titleText, .tick text, text.axisFormat {
        font-family: 'Inter', sans-serif !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        fill: #94A3B8 !important;
      }
      .grid line, .tick line, .grid .tick line, line.grid {
        stroke: rgba(255, 255, 255, 0.05) !important;
        stroke-width: 1px !important;
      }
      text.taskText, text.taskTextOutside, .taskText, .taskTextOutside {
        font-family: 'Inter', sans-serif !important;
        font-size: 14px !important;
        font-weight: 500 !important;
        fill: #F8FAFC !important;
      }
      text.sectionTitle, .sectionTitle {
        font-family: 'Inter', sans-serif !important;
        font-size: 16px !important;
        font-weight: 600 !important;
        fill: #F8FAFC !important;
      }
      rect.task, .task rect {
        fill: #3B82F6 !important;
        stroke: rgba(59, 130, 246, 0.3) !important;
        rx: 8px !important;
        ry: 8px !important;
      }
      rect.done, .done rect {
        fill: #10B981 !important;
        stroke: rgba(16, 185, 129, 0.3) !important;
        rx: 8px !important;
        ry: 8px !important;
      }
      rect.active, .active rect {
        fill: #8B5CF6 !important;
        stroke: rgba(139, 92, 246, 0.3) !important;
        rx: 8px !important;
        ry: 8px !important;
      }
      rect.crit, .crit rect, rect.blocked, .blocked rect {
        fill: #EF4444 !important;
        stroke: rgba(239, 68, 68, 0.3) !important;
        rx: 8px !important;
        ry: 8px !important;
      }
      rect.milestone, .milestone rect, polygon.milestone, .milestone polygon, path.milestone, .milestone path {
        fill: #F59E0B !important;
        stroke: rgba(245, 158, 11, 0.3) !important;
      }
    `;
    clonedSvg.appendChild(styleEl);
    
    const serializer = new XMLSerializer();
    return serializer.serializeToString(clonedSvg);
  };

  const downloadSVG = () => {
    if (!containerRef.current) return;
    const svgElement = containerRef.current.querySelector("svg");
    if (!svgElement) return;

    const source = getStyledSVGSource(svgElement);
    const xmlHeader = '<?xml version="1.0" standalone="no"?>\r\n';
    const blob = new Blob([xmlHeader + source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.toLowerCase().replace(/\s+/g, "-")}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadPNG = () => {
    if (!containerRef.current) return;
    const svgElement = containerRef.current.querySelector("svg");
    if (!svgElement) return;

    try {
      const source = getStyledSVGSource(svgElement);
      const image = new Image();
      
      // Use base64 encoding for the SVG source to ensure all styles are captured correctly
      const svgBase64 = btoa(unescape(encodeURIComponent(source)));
      const svgUrl = `data:image/svg+xml;base64,${svgBase64}`;
      
      image.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          
          let width = 800;
          let height = 600;
          
          if (svgElement instanceof SVGSVGElement && svgElement.viewBox && svgElement.viewBox.baseVal) {
            width = svgElement.viewBox.baseVal.width || 800;
            height = svgElement.viewBox.baseVal.height || 600;
          } else {
            const bbox = (svgElement as any).getBBox?.() || svgElement.getBoundingClientRect();
            width = bbox.width || 800;
            height = bbox.height || 600;
          }
          
          const scaleVal = 2; 
          canvas.width = width * scaleVal;
          canvas.height = height * scaleVal;
          
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.scale(scaleVal, scaleVal);
            ctx.fillStyle = "#030712"; 
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(image, 0, 0, width, height);
            
            const pngUrl = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = pngUrl;
            link.download = `${title.toLowerCase().replace(/\s+/g, "-")}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        } catch (e) {
          console.error("Error during PNG generation:", e);
        }
      };
      
      image.onerror = (err) => {
        console.error("Error loading SVG for PNG conversion:", err);
      };
      
      image.src = svgUrl;
    } catch (error) {
      console.error("Error initiating PNG download:", error);
    }
  };

  // Render premium empty state
  if (!diagram || !diagram.trim()) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "360px",
          p: 4,
          borderRadius: "24px",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          backgroundColor: "rgba(9, 19, 33, 0.45)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3), 0 0 40px rgba(168, 85, 247, 0.04), inset 0 1px 0 0 rgba(255, 255, 255, 0.03)",
          textAlign: "center",
          maxWidth: "1200px",
          width: "100%",
          mx: "auto",
        }}
      >
        <Box
          sx={{
            width: "80px",
            height: "80px",
            mb: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            backgroundColor: "rgba(139, 92, 246, 0.08)",
            border: "1px dashed rgba(139, 92, 246, 0.25)",
            animation: "pulseGlow 3s infinite ease-in-out",
            "@keyframes pulseGlow": {
              "0%, 100%": { boxShadow: "0 0 0 0 rgba(168, 85, 247, 0.1)" },
              "50%": { boxShadow: "0 0 20px 8px rgba(168, 85, 247, 0.04)" },
            },
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "#a78bfa" }}
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M21 12H3m9-9v18" />
          </svg>
        </Box>
        <Typography variant="h6" fontWeight={700} sx={{ color: "#F8FAFC", mb: 1, letterSpacing: "-0.01em" }}>
          No Execution Plan Yet
        </Typography>
        <Typography variant="body2" sx={{ color: "#94A3B8", maxWidth: "340px", lineHeight: 1.5 }}>
          Generate a goal to visualize the execution workflow.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      ref={viewerContainerRef}
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        maxWidth: maxWidth,
        mx: "auto",
        borderRadius: "16px",
        border: "1px solid rgba(168, 85, 247, 0.12)",
        backgroundColor: "#030712",
        backdropFilter: "blur(20px)",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4), 0 0 30px rgba(168, 85, 247, 0.04), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)",
        p: { xs: 1.5, sm: 2 },
        transition: "all var(--transition-normal)",
        overflow: "hidden",
        position: "relative",
        minHeight: "180px",
      }}
    >
      {/* Header Toolbar */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)", pb: 2.5, mb: 3 }}
      >
        <Box>
          <Typography
            variant="h6"
            component="h3"
            fontWeight={700}
            sx={{ color: "#F8FAFC", fontSize: "1.1rem", letterSpacing: "-0.015em" }}
          >
            {title}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "#94A3B8", mt: 0.5, fontSize: "0.85rem" }}
          >
            {description}
          </Typography>
        </Box>

        {/* glassmorphism toolbar */}
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{
            backgroundColor: "rgba(9, 19, 33, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: "10px",
            p: 0.6,
            backdropFilter: "blur(12px)",
          }}
        >
          <IconButton
            onClick={downloadSVG}
            title="Download SVG"
            sx={{
              color: "#94A3B8",
              p: 0.85,
              borderRadius: "6px",
              transition: "all 150ms ease",
              "&:hover": {
                color: "#F8FAFC",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                transform: "translateY(-1px)",
              },
              "&:active": {
                transform: "translateY(0.5px)",
              },
            }}
          >
            <SvgIcon />
          </IconButton>

          <IconButton
            onClick={downloadPNG}
            title="Download PNG"
            sx={{
              color: "#94A3B8",
              p: 0.85,
              borderRadius: "6px",
              transition: "all 150ms ease",
              "&:hover": {
                color: "#F8FAFC",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                transform: "translateY(-1px)",
              },
              "&:active": {
                transform: "translateY(0.5px)",
              },
            }}
          >
            <PngIcon />
          </IconButton>
        </Stack>
      </Stack>

      {/* Main Diagram Viewport */}
      <Box sx={{ position: "relative", flexGrow: 1, display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
        {loading ? (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "320px", width: "100%" }}>
            <AppSkeleton variant="rounded" height={320} sx={{ width: "100%" }} />
          </Box>
        ) : null}

        {errorMessage ? (
          <Stack spacing={2} sx={{ mb: 3, width: "100%" }}>
            <Alert
              severity="error"
              variant="outlined"
              sx={{ borderColor: "rgba(239, 68, 68, 0.25)", color: "#EF4444", backgroundColor: "rgba(239, 68, 68, 0.02)" }}
            >
              <Typography variant="subtitle2" fontWeight={700}>
                Mermaid Syntax/Rendering Error
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {errorMessage}
              </Typography>
            </Alert>
            <Box
              sx={{
                p: 2.5,
                borderRadius: "12px",
                backgroundColor: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                overflowX: "auto",
                width: "100%",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "#94A3B8",
                  display: "block",
                  mb: 1.5,
                  textTransform: "uppercase",
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                }}
              >
                Mermaid Diagram Source
              </Typography>
              <Typography
                variant="body2"
                component="pre"
                sx={{
                  fontFamily: "monospace, Courier New, monospace",
                  fontSize: "0.85rem",
                  color: "#94A3B8",
                  whiteSpace: "pre",
                  m: 0,
                  backgroundColor: "transparent",
                  border: "none",
                }}
              >
                {diagram}
              </Typography>
            </Box>
          </Stack>
        ) : null}

        {/* Diagram wrapper */}
        <Box
          sx={{
            flexGrow: 1,
            display: loading ? "none" : "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            overflow: "auto", 
            minHeight: "280px",
            position: "relative",
            width: "100%",
            height: "100%",
            p: 1,
          }}
        >
          <Box
            ref={containerRef}
            component="div"
            aria-label={title}
            role="img"
            aria-busy={loading}
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "flex-start",
              width: "100%",
              height: "auto",
              animation: "diagramFadeIn 750ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
              "@keyframes diagramFadeIn": {
                from: { opacity: 0 },
                to: { opacity: 1 },
              },
              "& svg": {
                width: "100%",
                height: "auto",
                maxWidth: "100%",
                display: "block",
                mx: "auto",
                background: "transparent !important",
                // Mermaid default styling removals
                "& g.classGroup, & rect.classGroup": {
                  fill: "transparent !important",
                  stroke: "none !important",
                },
                // Premium Developer Tool Nodes (Mermaid Studio, GitLab, Obsidian styling)
                "& .node rect, & .node circle, & .node polygon, & .node path": {
                  fill: "#091321 !important",
                  stroke: "#8B5CF6 !important", // Purple border
                  strokeWidth: "2px !important",
                  rx: "12px !important", // Rounded corners
                  ry: "12px !important",
                  filter: "drop-shadow(0 8px 24px rgba(0, 0, 0, 0.45)) !important",
                  transition: "all 200ms ease-in-out !important",
                },
                "& .node:hover rect, & .node:hover circle, & .node:hover polygon, & .node:hover path": {
                  fill: "#0c1a2e !important",
                  stroke: "#A855F7 !important",
                  filter: "drop-shadow(0 0 15px rgba(168, 85, 247, 0.45)) !important",
                },
                "& .node": {
                  opacity: 0,
                  transformOrigin: "center !important",
                  animation: "nodeFadeIn 800ms cubic-bezier(0.16, 1, 0.3, 1) forwards !important",
                  transition: "transform 200ms ease-in-out !important",
                },
                "& .node:hover": {
                  filter: "brightness(1.2) !important",
                  cursor: "pointer",
                },
                // Staggered node entrance delays
                "& .node:nth-of-type(1)": { animationDelay: "0.05s !important" },
                "& .node:nth-of-type(2)": { animationDelay: "0.15s !important" },
                "& .node:nth-of-type(3)": { animationDelay: "0.25s !important" },
                "& .node:nth-of-type(4)": { animationDelay: "0.35s !important" },
                "& .node:nth-of-type(5)": { animationDelay: "0.45s !important" },
                "& .node:nth-of-type(6)": { animationDelay: "0.55s !important" },
                "& .node:nth-of-type(7)": { animationDelay: "0.65s !important" },
                "& .node:nth-of-type(n+8)": { animationDelay: "0.75s !important" },
                "@keyframes nodeFadeIn": {
                  to: { opacity: 1 },
                },
                // Premium Connection Edges
                "& .edgePath .path": {
                  stroke: "url(#purple-gradient) !important",
                  strokeWidth: "3px !important",
                  strokeLinecap: "round !important",
                  strokeLinejoin: "round !important",
                  transition: "stroke 200ms ease, stroke-width 200ms ease !important",
                },
                // Edge hover
                "& .edgePath:hover .path": {
                  strokeWidth: "4.5px !important",
                  filter: "drop-shadow(0 0 8px rgba(168, 85, 247, 0.5)) !important",
                },
                "@keyframes drawEdge": {
                  to: { strokeDashoffset: 0 },
                },
                // Connectors (arrows)
                "& marker, & [id^=mermaid-marker]": {
                  fill: "#8B5CF6 !important",
                  stroke: "none !important",
                },
        // Typography Hierarchy
                "& .label, & .nodeLabel, & .label text, & .label span, & .node label, & .node foreignObject div, & .node text, & .node tspan": {
                  fontFamily: "Inter, sans-serif !important",
                  fontWeight: "600 !important",
                  fill: "#F8FAFC !important",
                  color: "#F8FAFC !important",
                  fontSize: "9px !important",
                  textAnchor: "middle !important",
                  dominantBaseline: "central !important",
                },
                "& .node .label .sub-label": {
                  fontSize: "15px !important",
                  fontWeight: "500 !important",
                  fill: "#94A3B8 !important",
                },
                "& .edgeLabel rect": {
                  fill: "#030712 !important",
                  rx: "6px !important",
                  ry: "6px !important",
                  stroke: "rgba(255, 255, 255, 0.08) !important",
                },
                "& .edgeLabel span, & .edgeLabel text, & .edgeLabel div": {
                  fontFamily: "Inter, sans-serif !important",
                  fontSize: "12px !important",
                  fontWeight: "500 !important",
                  fill: "#94A3B8 !important",
                  color: "#94A3B8 !important",
                },
                // Gantt Chart Custom Styles
                "& rect.secNode, & .secNode": {
                  fill: "rgba(255, 255, 255, 0.02) !important",
                  stroke: "rgba(255, 255, 255, 0.05) !important",
                  strokeWidth: "1px !important",
                },
                "& .grid .tick text, & .axisFormat, & text.titleText, & .tick text, & text.axisFormat": {
                  fontFamily: "Inter, sans-serif !important",
                  fontSize: "13px !important",
                  fontWeight: "600 !important",
                  fill: "#94A3B8 !important",
                },
                "& .grid line, & .tick line, & .grid .tick line, & line.grid": {
                  stroke: "rgba(255, 255, 255, 0.05) !important",
                  strokeWidth: "1px !important",
                },
                "& text.taskText, & text.taskTextOutside, & .taskText, & .taskTextOutside": {
                  fontFamily: "Inter, sans-serif !important",
                  fontSize: "14px !important",
                  fontWeight: "500 !important",
                  fill: "#F8FAFC !important",
                },
                "& text.sectionTitle, & .sectionTitle": {
                  fontFamily: "Inter, sans-serif !important",
                  fontSize: "16px !important",
                  fontWeight: "600 !important",
                  fill: "#F8FAFC !important",
                },
                "& rect.task, & .task rect": {
                  fill: "#3B82F6 !important",
                  stroke: "rgba(59, 130, 246, 0.3) !important",
                  strokeWidth: "1px !important",
                  rx: "8px !important",
                  ry: "8px !important",
                  filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.25)) !important",
                  transition: "all 200ms ease-in-out !important",
                },
                "& .task:hover rect, & rect.task:hover": {
                  fill: "#4f8ff7 !important",
                  stroke: "rgba(59, 130, 246, 0.6) !important",
                  filter: "drop-shadow(0 0 12px rgba(59, 130, 246, 0.35)) !important",
                },
                "& rect.done, & .done rect": {
                  fill: "#10B981 !important",
                  stroke: "rgba(16, 185, 129, 0.3) !important",
                  strokeWidth: "1px !important",
                  rx: "8px !important",
                  ry: "8px !important",
                  filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.25)) !important",
                  transition: "all 200ms ease-in-out !important",
                },
                "& .done:hover rect, & rect.done:hover": {
                  fill: "#34d399 !important",
                  stroke: "rgba(16, 185, 129, 0.6) !important",
                  filter: "drop-shadow(0 0 12px rgba(16, 185, 129, 0.35)) !important",
                },
                "& rect.active, & .active rect": {
                  fill: "#8B5CF6 !important",
                  stroke: "rgba(139, 92, 246, 0.3) !important",
                  strokeWidth: "1px !important",
                  rx: "8px !important",
                  ry: "8px !important",
                  filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.25)) !important",
                  transition: "all 200ms ease-in-out !important",
                },
                "& .active:hover rect, & rect.active:hover": {
                  fill: "#a78bfa !important",
                  stroke: "rgba(139, 92, 246, 0.6) !important",
                  filter: "drop-shadow(0 0 12px rgba(139, 92, 246, 0.35)) !important",
                },
                "& rect.crit, & .crit rect, & rect.blocked, & .blocked rect": {
                  fill: "#EF4444 !important",
                  stroke: "rgba(239, 68, 68, 0.3) !important",
                  strokeWidth: "1px !important",
                  rx: "8px !important",
                  ry: "8px !important",
                  filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.25)) !important",
                  transition: "all 200ms ease-in-out !important",
                },
                "& .crit:hover rect, & rect.crit:hover, & .blocked:hover rect, & rect.blocked:hover": {
                  fill: "#f87171 !important",
                  stroke: "rgba(239, 68, 68, 0.6) !important",
                  filter: "drop-shadow(0 0 12px rgba(239, 68, 68, 0.35)) !important",
                },
                "& rect.milestone, & .milestone rect, & polygon.milestone, & .milestone polygon, & path.milestone, & .milestone path": {
                  fill: "#F59E0B !important",
                  stroke: "rgba(245, 158, 11, 0.3) !important",
                  strokeWidth: "1px !important",
                  filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.25)) !important",
                  transition: "all 200ms ease-in-out !important",
                },
                "& .milestone:hover rect, & .milestone:hover polygon, & .milestone:hover path": {
                  fill: "#fbbf24 !important",
                  stroke: "rgba(245, 158, 11, 0.6) !important",
                  filter: "drop-shadow(0 0 12px rgba(245, 158, 11, 0.35)) !important",
                },
                // Gantt Staggered Entrance Animations keyframes trigger
                "@keyframes ganttFadeIn": {
                  to: { opacity: 1 },
                },
                "@keyframes ganttBarGrow": {
                  to: {
                    opacity: 1,
                    transform: "scaleX(1)",
                  },
                },
              },
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
