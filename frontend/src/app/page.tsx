"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Activity,
  Package,
  Users,
  Map as MapIcon,
} from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { RiskChart } from "@/components/dashboard/risk-chart";
import { RecentDisruptions } from "@/components/dashboard/recent-disruptions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDisruptions } from "@/lib/api/disruptions";
import { getWorkflows, type WorkflowSummary } from "@/lib/api/workflows";
import { formatRelativeTime } from "@/lib/utils";

// Mock stats - in production these would come from /api/stats/overview
function calculateStats(
  disruptions: { severity: number }[],
  workflows: WorkflowSummary[]
) {
  const riskDistribution = { low: 0, medium: 0, high: 0, critical: 0 };

  workflows.forEach((w) => {
    if (w.risk_level && w.risk_level in riskDistribution) {
      riskDistribution[w.risk_level as keyof typeof riskDistribution]++;
    }
  });

  return {
    active_disruptions: disruptions.filter((d) => d.severity >= 0.5).length,
    risk_distribution: riskDistribution,
    affected_skus_count: Math.floor(disruptions.length * 2.5),
    affected_suppliers_count: Math.floor(disruptions.length * 1.2),
  };
}

export default function DashboardPage() {
  const {
    data: disruptions = [],
    isLoading: disruptionsLoading,
    refetch: refetchDisruptions,
  } = useQuery({
    queryKey: ["disruptions"],
    queryFn: getDisruptions,
  });

  const {
    data: workflows = [],
    isLoading: workflowsLoading,
    refetch: refetchWorkflows,
  } = useQuery({
    queryKey: ["workflows"],
    queryFn: getWorkflows,
  });

  const stats = calculateStats(disruptions, workflows);
  const isLoading = disruptionsLoading || workflowsLoading;

  const handleRefresh = () => {
    refetchDisruptions();
    refetchWorkflows();
  };

  return (
    <div className="flex flex-col">
      <Header
        title="Operations Dashboard"
        subtitle="Real-time supply chain monitoring"
        showCreateButton
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
      />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4">
          <StatsCard
            title="Active Disruptions"
            value={stats.active_disruptions}
            subtitle="Severity ≥ 50%"
            icon={AlertTriangle}
            variant={stats.active_disruptions > 0 ? "danger" : "default"}
          />
          <StatsCard
            title="Workflows Run"
            value={workflows.length}
            subtitle="Last 24 hours"
            icon={Activity}
            variant="primary"
          />
          <StatsCard
            title="Affected SKUs"
            value={stats.affected_skus_count}
            subtitle="Across all events"
            icon={Package}
          />
          <StatsCard
            title="Suppliers Impacted"
            value={stats.affected_suppliers_count}
            subtitle="Requiring attention"
            icon={Users}
            variant={stats.affected_suppliers_count > 3 ? "warning" : "default"}
          />
        </div>

        {/* Middle Row */}
        <div className="grid grid-cols-3 gap-4">
          {/* Risk Distribution */}
          <RiskChart data={stats.risk_distribution} />

          {/* Recent Disruptions */}
          <div className="col-span-2">
            <RecentDisruptions disruptions={disruptions} />
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-3 gap-4">
          {/* Map Preview */}
          <Card className="col-span-2 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Global Operations
              </CardTitle>
              <Link
                href="/map"
                className="text-xs text-primary hover:underline"
              >
                Open Map
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <Link href="/map" className="block">
                <div className="relative h-64 bg-secondary/30 overflow-hidden group cursor-pointer">
                  {/* Placeholder map visualization */}
                  <div className="absolute inset-0 grid-overlay opacity-50" />

                  {/* Decorative elements */}
                  <div className="absolute left-1/4 top-1/3 h-3 w-3 rounded-full bg-risk-critical/60 animate-pulse" />
                  <div className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-risk-medium/60 animate-pulse" />
                  <div className="absolute right-1/3 top-1/4 h-2.5 w-2.5 rounded-full bg-risk-high/60 animate-pulse" />

                  {/* Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                      <MapIcon className="h-4 w-4" />
                      View Interactive Map
                    </div>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Workflows */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Recent Workflows
              </CardTitle>
              <Link
                href="/workflows"
                className="text-xs text-primary hover:underline"
              >
                View all
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {workflows.length === 0 ? (
                  <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                    No workflows yet
                  </div>
                ) : (
                  workflows.slice(0, 5).map((workflow) => (
                    <Link
                      key={workflow.id}
                      href={`/workflows/${workflow.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-mono text-muted-foreground">
                          {workflow.id?.slice(0, 8) || "—"}...
                        </span>
                        <Badge
                          variant={
                            (workflow.risk_level as
                              | "low"
                              | "medium"
                              | "high"
                              | "critical") || "secondary"
                          }
                        >
                          {workflow.risk_level || "pending"}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground data-text">
                        {formatRelativeTime(workflow.created_at)}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
