"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Activity, ExternalLink, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getWorkflows } from "@/lib/api/workflows";
import { cn, formatDate, formatRelativeTime } from "@/lib/utils";
import type { RiskLevel } from "@/lib/types";

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") {
    return <CheckCircle2 className="h-4 w-4 text-risk-low" />;
  }
  if (status === "error") {
    return <XCircle className="h-4 w-4 text-risk-critical" />;
  }
  return <Clock className="h-4 w-4 text-muted-foreground animate-pulse" />;
}

export default function WorkflowsPage() {
  const {
    data: workflows = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["workflows"],
    queryFn: getWorkflows,
  });

  return (
    <div className="flex flex-col">
      <Header
        title="Workflow History"
        subtitle={`${workflows.length} workflows processed`}
        onRefresh={() => refetch()}
        isRefreshing={isRefetching}
      />

      <div className="p-6">
        {/* Empty State */}
        {!isLoading && workflows.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Activity className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No workflows yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Workflows are created when disruption events are processed
              </p>
              <Link href="/disruptions/new" className="mt-6">
                <Badge variant="default" className="cursor-pointer">
                  Create a disruption to trigger a workflow
                </Badge>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Workflows Table */}
        {workflows.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Workflow ID
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Status
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Risk Level
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Event ID
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Created
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {workflows.map((workflow, index) => (
                      <tr
                        key={workflow.id}
                        className={cn(
                          "group hover:bg-accent/50 transition-colors opacity-0 animate-fade-in-up",
                          `stagger-${(index % 5) + 1}`
                        )}
                        style={{ animationFillMode: "forwards" }}
                      >
                        <td className="px-5 py-4">
                          <span className="font-mono text-sm">
                            {workflow.id?.slice(0, 12) || "—"}...
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <StatusIcon status={workflow.status} />
                            <span className="text-sm capitalize">
                              {workflow.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {workflow.risk_level ? (
                            <Badge variant={workflow.risk_level as RiskLevel}>
                              {workflow.risk_level}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-mono text-sm text-muted-foreground">
                            {workflow.event_id?.slice(0, 8) || "—"}...
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {formatRelativeTime(workflow.created_at)}
                            </span>
                            <span className="text-xs text-muted-foreground data-text">
                              {formatDate(workflow.created_at)}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link href={`/workflows/${workflow.id}`}>
                            <Badge
                              variant="outline"
                              className="cursor-pointer hover:bg-accent"
                            >
                              <ExternalLink className="mr-1 h-3 w-3" />
                              View
                            </Badge>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
