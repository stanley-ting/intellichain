"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createDisruption } from "@/lib/api/disruptions";
import type { EventType, CreateDisruptionRequest } from "@/lib/types";

const EVENT_TYPE_OPTIONS = [
  { value: "supplier_outage", label: "Supplier Outage" },
  { value: "weather", label: "Weather Event" },
  { value: "port_congestion", label: "Port Congestion" },
  { value: "demand_spike", label: "Demand Spike" },
];

const REGION_OPTIONS = [
  { value: "Asia Pacific", label: "Asia Pacific" },
  { value: "Europe", label: "Europe" },
  { value: "Americas", label: "Americas" },
];

function getSeverityLabel(severity: number) {
  if (severity >= 0.8) return { label: "Critical", variant: "critical" as const };
  if (severity >= 0.6) return { label: "High", variant: "high" as const };
  if (severity >= 0.4) return { label: "Medium", variant: "medium" as const };
  return { label: "Low", variant: "low" as const };
}

export default function CreateDisruptionPage() {
  const router = useRouter();

  const [eventType, setEventType] = useState<EventType>("supplier_outage");
  const [region, setRegion] = useState("Asia Pacific");
  const [severity, setSeverity] = useState(0.5);
  const [description, setDescription] = useState("");

  const { mutate, isPending, error } = useMutation({
    mutationFn: createDisruption,
    onSuccess: (data) => {
      router.push(`/workflows/${data.workflow_id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const request: CreateDisruptionRequest = {
      event_type: eventType,
      region,
      severity,
      description: description || `${eventType} in ${region}`,
    };

    mutate(request);
  };

  const severityInfo = getSeverityLabel(severity);

  return (
    <div className="flex flex-col">
      <Header title="Create Disruption Event" subtitle="Report a new supply chain disruption" />

      <div className="p-6">
        <div className="mx-auto max-w-2xl">
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-risk-high/10">
                  <AlertTriangle className="h-5 w-5 text-risk-high" />
                </div>
                <div>
                  <CardTitle>Disruption Details</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Enter information about the supply chain disruption
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Event Type */}
                <div className="space-y-2">
                  <Label htmlFor="event-type">Event Type</Label>
                  <Select
                    id="event-type"
                    options={EVENT_TYPE_OPTIONS}
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as EventType)}
                  />
                </div>

                {/* Region */}
                <div className="space-y-2">
                  <Label htmlFor="region">Affected Region</Label>
                  <Select
                    id="region"
                    options={REGION_OPTIONS}
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                  />
                </div>

                {/* Severity */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Severity</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant={severityInfo.variant}>
                        {severityInfo.label}
                      </Badge>
                      <span className="text-sm font-mono text-muted-foreground">
                        {Math.round(severity * 100)}%
                      </span>
                    </div>
                  </div>
                  <Slider
                    value={severity}
                    onChange={setSeverity}
                    min={0}
                    max={1}
                    step={0.05}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Low Impact</span>
                    <span>Critical Impact</span>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the disruption event..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div className="rounded-md bg-risk-critical/10 border border-risk-critical/30 p-3 text-sm text-risk-critical">
                    {error instanceof Error
                      ? error.message
                      : "Failed to create disruption"}
                  </div>
                )}

                {/* Submit */}
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Disruption
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Info Box */}
          <div className="mt-6 rounded-lg border border-border/50 bg-card/50 p-4">
            <h3 className="text-sm font-medium">What happens next?</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-primary" />
                The event will be persisted to the knowledge graph
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-primary" />
                AI will assess the risk level and gather evidence
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-primary" />
                Mitigation strategies will be generated and ranked
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-primary" />
                You&apos;ll see the recommended actions in real-time
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
