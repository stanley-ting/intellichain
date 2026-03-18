"use client";

import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowNode, UIEvent } from "@/lib/types";

const WORKFLOW_STEPS: { node: WorkflowNode; label: string }[] = [
  { node: "load_event", label: "Load" },
  { node: "enrich_description", label: "Enrich" },
  { node: "persist_event", label: "Save" },
  { node: "gather_evidence", label: "Query" },
  { node: "assess_risk", label: "Assess" },
  { node: "generate_mitigations", label: "Options" },
  { node: "rank_mitigations", label: "Rank" },
  { node: "route_action", label: "Route" },
];

interface ProgressStepperProps {
  events: UIEvent[];
  className?: string;
}

export function ProgressStepper({ events, className }: ProgressStepperProps) {
  // Build a map of node -> status
  const nodeStatus = new Map<WorkflowNode, "pending" | "running" | "completed" | "error">();

  for (const event of events) {
    if (event.status === "started") {
      nodeStatus.set(event.node, "running");
    } else if (event.status === "completed") {
      nodeStatus.set(event.node, "completed");
    } else if (event.status === "error") {
      nodeStatus.set(event.node, "error");
    }
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="relative flex items-center justify-between">
        {/* Progress line background */}
        <div className="absolute left-0 right-0 top-4 h-0.5 bg-border" />

        {/* Active progress line */}
        <div
          className="absolute left-0 top-4 h-0.5 bg-primary transition-all duration-500"
          style={{
            width: `${Math.min(
              (Array.from(nodeStatus.values()).filter((s) => s === "completed")
                .length /
                WORKFLOW_STEPS.length) *
              100,
              100
            )}%`,
          }}
        />

        {/* Steps */}
        {WORKFLOW_STEPS.map((step, index) => {
          const status = nodeStatus.get(step.node) || "pending";

          return (
            <div
              key={step.node}
              className="relative z-10 flex flex-col items-center"
            >
              {/* Step indicator */}
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300",
                  status === "completed" &&
                    "border-primary bg-primary text-primary-foreground",
                  status === "running" &&
                    "border-primary bg-primary/10 text-primary",
                  status === "error" &&
                    "border-risk-critical bg-risk-critical/10 text-risk-critical",
                  status === "pending" && "border-border bg-background text-muted-foreground"
                )}
              >
                {status === "completed" && <Check className="h-4 w-4" />}
                {status === "running" && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {status === "error" && (
                  <span className="text-xs font-bold">!</span>
                )}
                {status === "pending" && (
                  <span className="text-xs font-medium">{index + 1}</span>
                )}
              </div>

              {/* Step label */}
              <span
                className={cn(
                  "mt-2 text-[10px] font-medium uppercase tracking-wider transition-colors",
                  status === "completed" && "text-primary",
                  status === "running" && "text-primary",
                  status === "error" && "text-risk-critical",
                  status === "pending" && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
