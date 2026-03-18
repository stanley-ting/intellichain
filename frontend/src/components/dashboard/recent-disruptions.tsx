"use client";

import Link from "next/link";
import { AlertTriangle, Cloud, Ship, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { DisruptionEvent, EventType } from "@/lib/types";

interface RecentDisruptionsProps {
  disruptions: DisruptionEvent[];
}

const EVENT_ICONS: Record<EventType, React.ComponentType<{ className?: string }>> = {
  weather: Cloud,
  supplier_outage: AlertTriangle,
  port_congestion: Ship,
  demand_spike: TrendingUp,
};

const EVENT_LABELS: Record<EventType, string> = {
  weather: "Weather",
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

export function RecentDisruptions({ disruptions }: RecentDisruptionsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Recent Disruptions</CardTitle>
        <Link
          href="/disruptions"
          className="text-xs text-primary hover:underline"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {disruptions.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              No disruptions recorded
            </div>
          ) : (
            disruptions.slice(0, 5).map((event, index) => {
              const Icon = EVENT_ICONS[event.event_type];
              const severityVariant = getSeverityVariant(event.severity);

              return (
                <div
                  key={event.event_id}
                  className={cn(
                    "flex items-center gap-4 px-5 py-3 opacity-0 animate-fade-in-up",
                    `stagger-${index + 1}`
                  )}
                  style={{ animationFillMode: "forwards" }}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                      severityVariant === "critical" &&
                        "bg-risk-critical/10 text-risk-critical",
                      severityVariant === "high" &&
                        "bg-risk-high/10 text-risk-high",
                      severityVariant === "medium" &&
                        "bg-risk-medium/10 text-risk-medium",
                      severityVariant === "low" && "bg-risk-low/10 text-risk-low"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {EVENT_LABELS[event.event_type]}
                      </span>
                      <Badge variant={severityVariant} className="shrink-0">
                        {Math.round(event.severity * 100)}%
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {event.region} • {event.description.slice(0, 50)}...
                    </p>
                  </div>

                  <span className="text-xs text-muted-foreground data-text shrink-0">
                    {formatRelativeTime(event.timestamp)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
