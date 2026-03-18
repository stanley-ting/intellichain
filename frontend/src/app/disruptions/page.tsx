"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  AlertTriangle,
  Cloud,
  Ship,
  TrendingUp,
  Plus,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDisruptions } from "@/lib/api/disruptions";
import { cn, formatDate } from "@/lib/utils";
import type { EventType } from "@/lib/types";

const EVENT_ICONS: Record<EventType, React.ComponentType<{ className?: string }>> = {
  weather: Cloud,
  supplier_outage: AlertTriangle,
  port_congestion: Ship,
  demand_spike: TrendingUp,
};

const EVENT_LABELS: Record<EventType, string> = {
  weather: "Weather Event",
  supplier_outage: "Supplier Outage",
  port_congestion: "Port Congestion",
  demand_spike: "Demand Spike",
};

function getSeverityVariant(severity: number) {
  if (severity >= 0.8) return "critical";
  if (severity >= 0.6) return "high";
  if (severity >= 0.4) return "medium";
  return "low";
}

export default function DisruptionsPage() {
  const {
    data: disruptions = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["disruptions"],
    queryFn: getDisruptions,
  });

  return (
    <div className="flex flex-col">
      <Header
        title="Disruption Events"
        subtitle={`${disruptions.length} events recorded`}
        onRefresh={() => refetch()}
        isRefreshing={isRefetching}
      />

      <div className="p-6">
        {/* Action Bar */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="text-xs">
              All Regions
            </Badge>
            <Badge variant="secondary" className="text-xs">
              All Types
            </Badge>
          </div>
          <Link href="/disruptions/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              New Disruption
            </Button>
          </Link>
        </div>

        {/* Empty State */}
        {!isLoading && disruptions.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <AlertTriangle className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No disruptions recorded</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Create a disruption event to start monitoring
              </p>
              <Link href="/disruptions/new" className="mt-6">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Disruption
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Disruptions Grid */}
        <div className="grid grid-cols-2 gap-4">
          {disruptions.map((event, index) => {
            const Icon = EVENT_ICONS[event.event_type];
            const severityVariant = getSeverityVariant(event.severity);

            return (
              <Card
                key={event.event_id}
                className={cn(
                  "group transition-all duration-300 hover:border-primary/30 opacity-0 animate-fade-in-up",
                  `stagger-${(index % 5) + 1}`
                )}
                style={{ animationFillMode: "forwards" }}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
                        severityVariant === "critical" &&
                          "bg-risk-critical/10 text-risk-critical",
                        severityVariant === "high" &&
                          "bg-risk-high/10 text-risk-high",
                        severityVariant === "medium" &&
                          "bg-risk-medium/10 text-risk-medium",
                        severityVariant === "low" && "bg-risk-low/10 text-risk-low"
                      )}
                    >
                      <Icon className="h-6 w-6" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">
                          {EVENT_LABELS[event.event_type]}
                        </h3>
                        <Badge variant={severityVariant} className="shrink-0">
                          {Math.round(event.severity * 100)}%
                        </Badge>
                      </div>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {event.region}
                      </p>

                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                        {event.description}
                      </p>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground data-text">
                          {formatDate(event.timestamp)}
                        </span>

                        <span className="text-xs text-muted-foreground data-text">
                          ID: {event.event_id.slice(0, 8)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
