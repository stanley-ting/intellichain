"use client";

import {
  ArrowRightLeft,
  Warehouse,
  Factory,
  Building2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ENTITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Supplier: ArrowRightLeft,
  Warehouse: Warehouse,
  Factory: Factory,
};

interface GraphMitigation {
  rank: number;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  action: string;
  score: number;
  reasoning: string;
}

interface MitigationCardProps {
  mitigation: GraphMitigation;
  isRecommended?: boolean;
  className?: string;
}

export function MitigationCard({
  mitigation,
  isRecommended = false,
  className,
}: MitigationCardProps) {
  const Icon = ENTITY_ICONS[mitigation.entity_type] || Building2;
  const scorePercent = Math.round(mitigation.score * 100);

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        isRecommended && "border-primary/50 glow-sm",
        className
      )}
    >
      {isRecommended && (
        <div className="absolute left-0 top-0 h-full w-1 bg-primary" />
      )}

      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
              isRecommended
                ? "bg-primary/10 text-primary"
                : "bg-secondary text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {mitigation.entity_name}
              </span>
              <Badge variant="secondary" className="text-[10px]">
                {mitigation.entity_type}
              </Badge>
              {isRecommended && (
                <Badge variant="default" className="text-[10px]">
                  Recommended
                </Badge>
              )}
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              {mitigation.action}
            </p>

            {/* Reasoning */}
            <p className="mt-2 text-xs text-muted-foreground/80 italic">
              &ldquo;{mitigation.reasoning}&rdquo;
            </p>
          </div>

          {/* Score with bar */}
          <div className="flex flex-col items-end gap-1.5 min-w-[70px]">
            <div className="flex items-baseline gap-1">
              <span
                className={cn(
                  "text-2xl font-bold",
                  scorePercent >= 80 && "text-risk-low",
                  scorePercent >= 60 && scorePercent < 80 && "text-risk-medium",
                  scorePercent < 60 && "text-muted-foreground"
                )}
              >
                {scorePercent}
              </span>
              <span className="text-xs text-muted-foreground">%</span>
            </div>
            {/* Score bar */}
            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700",
                  scorePercent >= 80 && "bg-risk-low",
                  scorePercent >= 60 && scorePercent < 80 && "bg-risk-medium",
                  scorePercent < 60 && "bg-muted-foreground"
                )}
                style={{ width: `${scorePercent}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
