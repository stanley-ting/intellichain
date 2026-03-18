"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Package, Warehouse, Factory, Loader2 } from "lucide-react";
import { getCascadingImpact, type CascadingImpact } from "@/lib/api/graph";
import { cn } from "@/lib/utils";

interface ImpactGraphProps {
  eventId: string;
  className?: string;
}

interface GraphNode {
  id: string;
  label: string;
  type: "event" | "region" | "supplier" | "sku" | "warehouse" | "factory";
  x: number;
  y: number;
  layer: number;
}

interface GraphEdge {
  source: string;
  target: string;
}

// Color palette for node types
const NODE_COLORS = {
  event: "hsl(var(--risk-critical))",
  region: "hsl(var(--risk-high))",
  supplier: "hsl(var(--primary))",
  sku: "hsl(var(--risk-medium))",
  warehouse: "hsl(var(--risk-low))",
  factory: "hsl(215, 70%, 60%)",
};

const NODE_SIZES = {
  event: 24,
  region: 20,
  supplier: 16,
  sku: 12,
  warehouse: 16,
  factory: 16,
};

export function ImpactGraph({ eventId, className }: ImpactGraphProps) {
  const [animatedLayers, setAnimatedLayers] = useState<Set<number>>(new Set());
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: impact, isLoading, error } = useQuery({
    queryKey: ["impact", eventId],
    queryFn: () => getCascadingImpact(eventId),
    enabled: !!eventId,
  });

  // Animate layers sequentially
  useEffect(() => {
    if (!impact) return;

    setAnimatedLayers(new Set([0])); // Start with event

    const timers: NodeJS.Timeout[] = [];
    [1, 2, 3, 4].forEach((layer, i) => {
      timers.push(
        setTimeout(() => {
          setAnimatedLayers((prev) => new Set([...Array.from(prev), layer]));
        }, (i + 1) * 600)
      );
    });

    return () => timers.forEach(clearTimeout);
  }, [impact]);

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !impact?.event) {
    return (
      <div className={cn("flex items-center justify-center h-64 text-muted-foreground", className)}>
        No impact data available
      </div>
    );
  }

  // Build graph data
  const { nodes, edges } = buildGraphData(impact);

  // Show message if no meaningful data
  if (nodes.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-64 text-muted-foreground", className)}>
        No cascading impact detected
      </div>
    );
  }

  // Filter to animated layers
  const visibleNodes = nodes.filter((n) => animatedLayers.has(n.layer));
  const visibleEdges = edges.filter(
    (e) =>
      visibleNodes.some((n) => n.id === e.source) &&
      visibleNodes.some((n) => n.id === e.target)
  );

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <svg
        viewBox="0 0 600 400"
        className="w-full h-full"
        style={{ minHeight: "350px" }}
      >
        <defs>
          {/* Glow filter for event node */}
          <filter id="impact-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Pulse animation */}
          <radialGradient id="pulse-gradient">
            <stop offset="0%" stopColor="hsl(var(--risk-critical))" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(var(--risk-critical))" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background */}
        <rect width="600" height="400" fill="transparent" />

        {/* Edges */}
        <g className="edges">
          {visibleEdges.map((edge, i) => {
            const source = visibleNodes.find((n) => n.id === edge.source);
            const target = visibleNodes.find((n) => n.id === edge.target);
            if (!source || !target) return null;

            const isHighlighted =
              hoveredNode === source.id || hoveredNode === target.id;

            return (
              <line
                key={`${edge.source}-${edge.target}-${i}`}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={isHighlighted ? "hsl(var(--primary))" : "hsl(var(--border))"}
                strokeWidth={isHighlighted ? 2 : 1}
                strokeOpacity={isHighlighted ? 1 : 0.5}
                className="transition-all duration-300"
              >
                <animate
                  attributeName="stroke-dasharray"
                  from="0,1000"
                  to="1000,0"
                  dur="0.8s"
                  fill="freeze"
                />
              </line>
            );
          })}
        </g>

        {/* Pulse effect from event */}
        {animatedLayers.has(0) && (
          <circle
            cx={nodes[0]?.x || 80}
            cy={nodes[0]?.y || 200}
            r="60"
            fill="url(#pulse-gradient)"
          >
            <animate
              attributeName="r"
              from="20"
              to="100"
              dur="2s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              from="0.6"
              to="0"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
        )}

        {/* Nodes */}
        <g className="nodes">
          {visibleNodes.map((node) => {
            const size = NODE_SIZES[node.type];
            const color = NODE_COLORS[node.type];
            const isHovered = hoveredNode === node.id;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                className="cursor-pointer"
              >
                {/* Node circle */}
                <circle
                  r={isHovered ? size * 1.3 : size}
                  fill={color}
                  stroke={isHovered ? "white" : "transparent"}
                  strokeWidth={2}
                  filter={node.type === "event" ? "url(#impact-glow)" : undefined}
                  className="transition-all duration-200"
                >
                  <animate
                    attributeName="r"
                    from="0"
                    to={size}
                    dur="0.4s"
                    fill="freeze"
                  />
                </circle>

                {/* Node icon */}
                <NodeIcon type={node.type} size={size * 0.7} />

                {/* Label on hover */}
                {isHovered && (
                  <g>
                    <rect
                      x={-node.label.length * 3.5}
                      y={size + 8}
                      width={node.label.length * 7}
                      height={18}
                      rx={4}
                      fill="hsl(var(--popover))"
                      stroke="hsl(var(--border))"
                    />
                    <text
                      y={size + 20}
                      textAnchor="middle"
                      fill="hsl(var(--popover-foreground))"
                      fontSize="10"
                      fontWeight="500"
                    >
                      {node.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="absolute bottom-2 left-2 flex flex-wrap gap-3 text-xs">
        {(["event", "supplier", "sku", "warehouse", "factory"] as const).map((type) => (
          <div key={type} className="flex items-center gap-1.5">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: NODE_COLORS[type] }}
            />
            <span className="capitalize text-muted-foreground">{type}</span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="absolute top-2 right-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{impact.suppliers.length}</span> suppliers,{" "}
        <span className="font-medium text-foreground">{impact.skus.length}</span> SKUs affected
      </div>
    </div>
  );
}

function NodeIcon({ type, size }: { type: GraphNode["type"]; size: number }) {
  const props = {
    x: -size / 2,
    y: -size / 2,
    width: size,
    height: size,
    fill: "white",
  };

  switch (type) {
    case "event":
      return <AlertTriangle {...props} stroke="white" strokeWidth={1.5} fill="none" />;
    case "supplier":
      return (
        <text textAnchor="middle" dominantBaseline="central" fill="white" fontSize={size} fontWeight="bold">
          S
        </text>
      );
    case "sku":
      return <Package {...props} stroke="white" strokeWidth={1.5} fill="none" />;
    case "warehouse":
      return <Warehouse {...props} stroke="black" strokeWidth={1.5} fill="none" />;
    case "factory":
      return <Factory {...props} stroke="white" strokeWidth={1.5} fill="none" />;
    default:
      return null;
  }
}

function buildGraphData(impact: CascadingImpact): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Guard: need at least event + some data to render meaningful graph
  if (!impact.event || (impact.suppliers.length === 0 && impact.skus.length === 0)) {
    return { nodes: [], edges: [] };
  }

  const height = 400;
  const centerY = height / 2;

  // Layer 0: Event
  const eventId = `event_${impact.event?.id}`;
  nodes.push({
    id: eventId,
    label: impact.event?.type.replace("_", " ") || "Event",
    type: "event",
    x: 80,
    y: centerY,
    layer: 0,
  });

  // Layer 1: Suppliers
  const supplierStartY = centerY - ((impact.suppliers.length - 1) * 50) / 2;
  impact.suppliers.forEach((s, i) => {
    nodes.push({
      id: s.id,
      label: s.name,
      type: "supplier",
      x: 200,
      y: supplierStartY + i * 50,
      layer: 1,
    });
    edges.push({ source: eventId, target: s.id });
  });

  // Layer 2: SKUs (connected to suppliers)
  const skuStartY = centerY - ((impact.skus.length - 1) * 30) / 2;
  impact.skus.slice(0, 8).forEach((sku, i) => {
    nodes.push({
      id: sku.id,
      label: sku.name,
      type: "sku",
      x: 340,
      y: skuStartY + i * 35,
      layer: 2,
    });
    // Connect to random supplier
    const supplier = impact.suppliers[i % impact.suppliers.length];
    if (supplier) {
      edges.push({ source: supplier.id, target: sku.id });
    }
  });

  // Layer 3: Warehouses
  const whStartY = centerY - ((impact.warehouses.length - 1) * 60) / 2 - 40;
  impact.warehouses.forEach((w, i) => {
    nodes.push({
      id: w.id,
      label: w.name,
      type: "warehouse",
      x: 480,
      y: whStartY + i * 60,
      layer: 3,
    });
    // Connect to SKUs
    const sku = impact.skus[i % impact.skus.length];
    if (sku) {
      edges.push({ source: sku.id, target: w.id });
    }
  });

  // Layer 4: Factories
  const facStartY = centerY - ((impact.factories.length - 1) * 60) / 2 + 40;
  impact.factories.forEach((f, i) => {
    nodes.push({
      id: f.id,
      label: f.name,
      type: "factory",
      x: 520,
      y: facStartY + i * 60,
      layer: 4,
    });
    // Connect to SKUs
    const sku = impact.skus[(i + 2) % impact.skus.length];
    if (sku) {
      edges.push({ source: sku.id, target: f.id });
    }
  });

  return { nodes, edges };
}
