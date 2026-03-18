"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressStepper } from "@/components/workflow/progress-stepper";
import { MitigationCard } from "@/components/workflow/mitigation-card";
import { ReasoningPanel } from "@/components/workflow/reasoning-panel";
import { Celebration } from "@/components/ui/celebration";
import { useWorkflowSSE, type SSEStatus } from "@/hooks/use-sse";
import { getWorkflow } from "@/lib/api/workflows";
import { cn, formatDate, formatPercent } from "@/lib/utils";
import type { RiskLevel } from "@/lib/types";

function StatusIndicator({ status }: { status: SSEStatus }) {
  const config = {
    connecting: { icon: Clock, color: "text-muted-foreground", label: "Connecting..." },
    open: { icon: Clock, color: "text-primary", label: "Processing" },
    done: { icon: CheckCircle2, color: "text-risk-low", label: "Complete" },
    error: { icon: XCircle, color: "text-risk-critical", label: "Error" },
  };

  const { icon: Icon, color, label } = config[status];

  return (
    <div className={cn("flex items-center gap-2", color)}>
      <Icon className={cn("h-4 w-4", status === "open" && "animate-spin")} />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export default function WorkflowDetailPage() {
  const params = useParams();
  const workflowId = params.id as string;
  const queryClient = useQueryClient();
  const [showCelebration, setShowCelebration] = useState(false);
  const wasCompleteRef = useRef(false);

  // SSE for real-time updates
  const { events, status } = useWorkflowSSE(workflowId);

  // Fetch workflow result
  const { data: workflow, refetch } = useQuery({
    queryKey: ["workflow", workflowId],
    queryFn: () => getWorkflow(workflowId),
    enabled: !!workflowId,
    refetchInterval: status === "done" ? false : 2000,
  });

  // Show results if workflow is completed (regardless of SSE status)
  const isComplete = workflow?.status === "completed";
  const hasError = workflow?.error || status === "error";

  // Trigger celebration when workflow completes
  useEffect(() => {
    if (isComplete && !wasCompleteRef.current && !hasError) {
      wasCompleteRef.current = true;
      setShowCelebration(true);
    }
  }, [isComplete, hasError]);

  // Refetch when SSE completes
  useEffect(() => {
    if (status === "done") {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.invalidateQueries({ queryKey: ["disruptions"] });
    }
  }, [status, refetch, queryClient]);

  // Determine display status - use workflow status if SSE hasn't determined anything yet
  const displayStatus = isComplete ? "done" : (status === "connecting" && workflow?.status === "completed") ? "done" : status;

  return (
    <div className="flex flex-col">
      {/* Celebration effect on completion */}
      <Celebration trigger={showCelebration} />

      <Header
        title="Workflow Analysis"
        subtitle={`ID: ${workflowId.slice(0, 8)}...`}
      />

      <div className="p-6 space-y-6">
        {/* Progress Stepper */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Workflow Progress</CardTitle>
            <StatusIndicator status={displayStatus} />
          </CardHeader>
          <CardContent>
            <ProgressStepper events={events} />
          </CardContent>
        </Card>

        {/* AI Reasoning Panel - shows Cypher queries */}
        <ReasoningPanel events={events} />

        {/* Error State */}
        {hasError && (
          <Card className="border-risk-critical/50 bg-risk-critical/5">
            <CardContent className="flex items-center gap-4 p-5">
              <XCircle className="h-8 w-8 text-risk-critical" />
              <div>
                <h3 className="font-medium text-risk-critical">Workflow Error</h3>
                <p className="text-sm text-muted-foreground">
                  {workflow?.error || "An error occurred during processing"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Grid */}
        {isComplete && workflow && (
          <div className="grid grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Event Details */}
            <Card className="animate-in fade-in slide-in-from-left-4 duration-500 delay-100">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {workflow.event && (
                  <>
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-risk-high" />
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {workflow.event.event_type?.replace("_", " ") || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {workflow.event.region}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2 pt-2 border-t border-border">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Severity</span>
                        <span className="font-medium">
                          {formatPercent(workflow.event.severity)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Timestamp</span>
                        <span className="data-text">
                          {formatDate(workflow.event.timestamp)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground pt-2 border-t border-border">
                      {workflow.event.description}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Risk Assessment */}
            <Card className="col-span-2 animate-in fade-in slide-in-from-right-4 duration-500 delay-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  Risk Assessment
                </CardTitle>
                {workflow.risk_level && (
                  <Badge variant={workflow.risk_level as RiskLevel}>
                    {workflow.risk_level.toUpperCase()}
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {workflow.risk_assessment && (
                  <div className="space-y-4">
                    {/* Risk Level Gradient Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Low</span>
                        <span>Critical</span>
                      </div>
                      <div className="relative h-2 rounded-full overflow-hidden bg-gradient-to-r from-risk-low via-risk-medium via-risk-high to-risk-critical">
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-foreground shadow-lg transition-all duration-700"
                          style={{
                            left: `${
                              workflow.risk_level === "low" ? 12 :
                              workflow.risk_level === "medium" ? 37 :
                              workflow.risk_level === "high" ? 62 : 87
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-6 pt-2">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">
                          Confidence
                        </p>
                        <p className="text-2xl font-bold">
                          {formatPercent(workflow.risk_assessment.confidence)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">
                          Est. Recovery
                        </p>
                        <p className="text-2xl font-bold">
                          {workflow.risk_assessment.estimated_recovery_days}
                          <span className="text-sm font-normal text-muted-foreground ml-1">
                            days
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <p className="text-sm text-muted-foreground">
                        {workflow.risk_assessment.reasoning}
                      </p>
                    </div>

                    {workflow.risk_assessment.key_factors.length > 0 && (
                      <div className="pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                          Key Factors
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {workflow.risk_assessment.key_factors.map(
                            (factor, i) => (
                              <Badge key={i} variant="secondary">
                                {factor}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recommended Action */}
        {isComplete && workflow?.recommended_action && (
          <Card className="border-primary/30 glow-sm animate-in fade-in zoom-in-95 duration-500 delay-500">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  Recommended Action
                </CardTitle>
                <Badge variant="default">
                  {workflow.recommended_action.mitigation?.entity_type?.toUpperCase() || "ACTION"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <ArrowRight className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{workflow.recommended_action.summary}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Score: {formatPercent(workflow.recommended_action.mitigation?.score || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mitigations List */}
        {isComplete && workflow?.ranked_mitigations && workflow.ranked_mitigations.length > 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-700">
            <h2 className="text-lg font-semibold">Ranked Mitigations</h2>
            <div className="space-y-3">
              {workflow.ranked_mitigations.map((mit, index) => (
                <div
                  key={mit.entity_id || index}
                  className="animate-in fade-in slide-in-from-left-2 duration-300"
                  style={{ animationDelay: `${800 + index * 100}ms` }}
                >
                  <MitigationCard
                    mitigation={mit}
                    isRecommended={index === 0}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {!isComplete && !hasError && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-primary/20" />
              <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
            <p className="mt-6 text-lg font-medium">Analyzing disruption...</p>
            <p className="mt-2 text-sm text-muted-foreground">
              AI is assessing risk and generating mitigation strategies
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
