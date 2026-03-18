"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Database,
  Sparkles,
  Brain,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UIEvent } from "@/lib/types";

interface ReasoningPanelProps {
  events: UIEvent[];
  className?: string;
}

type StepType = "cypher" | "reasoning";

interface ReasoningStep {
  type: StepType;
  node: string;
  timestamp: string;
  // Cypher fields
  query?: string;
  queryResult?: string;
  // Reasoning fields
  step?: string;
  promptSummary?: string;
  outputSummary?: string;
  thinking?: string;
}

export function ReasoningPanel({ events, className }: ReasoningPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0, 1]));

  // Extract all reasoning events (cypher + llm reasoning)
  const steps: ReasoningStep[] = events
    .filter((e) => e.data?.type === "cypher" || e.data?.type === "reasoning")
    .map((e) => {
      if (e.data?.type === "cypher") {
        return {
          type: "cypher" as const,
          node: e.node,
          timestamp: e.timestamp,
          query: e.data?.query as string,
          queryResult: e.data?.result as string,
          thinking: e.data?.reasoning as string,
        };
      }
      return {
        type: "reasoning" as const,
        node: e.node,
        timestamp: e.timestamp,
        step: e.data?.step as string,
        promptSummary: e.data?.prompt_summary as string,
        outputSummary: e.data?.output_summary as string,
        thinking: e.data?.thinking as string,
      };
    });

  const cypherCount = steps.filter((s) => s.type === "cypher").length;
  const reasoningCount = steps.filter((s) => s.type === "reasoning").length;

  if (steps.length === 0) {
    return null;
  }

  const toggleStep = (index: number) => {
    const next = new Set(expandedSteps);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setExpandedSteps(next);
  };

  return (
    <div className={cn("rounded-lg border border-border bg-card overflow-hidden", className)}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-medium">AI Reasoning Trace</h3>
            <p className="text-xs text-muted-foreground">
              {cypherCount} graph queries, {reasoningCount} LLM calls
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
            {steps.length} steps
          </span>
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Timeline */}
      {expanded && (
        <div className="border-t border-border">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Timeline connector */}
              {index < steps.length - 1 && (
                <div className="absolute left-[27px] top-10 bottom-0 w-0.5 bg-border" />
              )}

              <div className="border-b border-border last:border-b-0">
                {/* Step header */}
                <button
                  onClick={() => toggleStep(index)}
                  className="w-full flex items-start gap-3 p-3 hover:bg-muted/30 transition-colors"
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 mt-0.5",
                      step.type === "cypher"
                        ? "border-amber-500 bg-amber-500/10 text-amber-500"
                        : "border-purple-500 bg-purple-500/10 text-purple-500"
                    )}
                  >
                    {step.type === "cypher" ? (
                      <Database className="h-3.5 w-3.5" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded",
                          step.type === "cypher"
                            ? "bg-amber-500/10 text-amber-500"
                            : "bg-purple-500/10 text-purple-500"
                        )}
                      >
                        {step.type === "cypher" ? "Neo4j Query" : "LLM Think"}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {step.node.replace(/_/g, " ")}
                      </span>
                    </div>

                    {/* Preview */}
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {step.type === "cypher"
                        ? step.thinking || "Querying knowledge graph..."
                        : step.step === "prompt"
                        ? step.promptSummary
                        : step.outputSummary}
                    </p>
                  </div>

                  {/* Expand icon */}
                  {expandedSteps.has(index) ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  )}
                </button>

                {/* Expanded content */}
                {expandedSteps.has(index) && (
                  <div className="px-3 pb-3 ml-11 space-y-2">
                    {step.type === "cypher" ? (
                      <>
                        {/* Cypher query */}
                        <div className="rounded-md bg-[#1a1b26] p-3 overflow-x-auto">
                          <div className="flex items-center gap-2 mb-2 text-[10px] text-slate-500 uppercase tracking-wider">
                            <Zap className="h-3 w-3" />
                            Generated Cypher
                          </div>
                          <pre className="text-xs font-mono">
                            <CypherHighlight query={step.query || ""} />
                          </pre>
                        </div>

                        {/* Query result */}
                        {step.queryResult && (
                          <div className="rounded-md bg-muted/50 p-2">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                              Graph Response
                            </p>
                            <p className="text-xs text-muted-foreground font-mono line-clamp-4">
                              {step.queryResult}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {/* LLM reasoning */}
                        {step.step === "prompt" && step.promptSummary && (
                          <div className="rounded-md bg-purple-500/5 border border-purple-500/20 p-3">
                            <div className="flex items-center gap-2 mb-1 text-[10px] text-purple-400 uppercase tracking-wider">
                              <Brain className="h-3 w-3" />
                              Prompt
                            </div>
                            <p className="text-xs text-foreground">
                              {step.promptSummary}
                            </p>
                          </div>
                        )}

                        {step.step === "output" && step.outputSummary && (
                          <div className="rounded-md bg-emerald-500/5 border border-emerald-500/20 p-3">
                            <div className="flex items-center gap-2 mb-1 text-[10px] text-emerald-400 uppercase tracking-wider">
                              <Zap className="h-3 w-3" />
                              Output
                            </div>
                            <p className="text-xs text-foreground font-medium">
                              {step.outputSummary}
                            </p>
                          </div>
                        )}

                        {step.thinking && (
                          <div className="rounded-md bg-muted/50 p-2">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                              Reasoning
                            </p>
                            <p className="text-xs text-muted-foreground italic">
                              &ldquo;{step.thinking}&rdquo;
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Cypher syntax highlighting
function CypherHighlight({ query }: { query: string }) {
  if (!query) return <span className="text-slate-500">No query generated</span>;

  const keywords =
    /\b(MATCH|WHERE|RETURN|WITH|CREATE|MERGE|DELETE|SET|ORDER BY|LIMIT|OPTIONAL|AND|OR|NOT|AS|IN|IS|NULL|DISTINCT|COLLECT|COUNT|SUM|AVG|MAX|MIN|CASE|WHEN|THEN|ELSE|END)\b/gi;
  const relationships = /(\[:[A-Z_]+\])/g;
  const nodeLabels = /(\(:[A-Za-z_]+)/g;
  const properties = /(\{[^}]+\})/g;
  const strings = /('[^']*'|"[^"]*")/g;
  const numbers = /\b(\d+\.?\d*)\b/g;

  const highlighted = query
    .replace(strings, '<span class="text-emerald-400">$1</span>')
    .replace(keywords, '<span class="text-purple-400 font-semibold">$1</span>')
    .replace(relationships, '<span class="text-amber-400">$1</span>')
    .replace(nodeLabels, '<span class="text-sky-400">$1</span>')
    .replace(properties, '<span class="text-rose-300">$1</span>')
    .replace(numbers, '<span class="text-orange-300">$1</span>');

  return (
    <code
      className="text-slate-300 whitespace-pre-wrap break-all"
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
}
