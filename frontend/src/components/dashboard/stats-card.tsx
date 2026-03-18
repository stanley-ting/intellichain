"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "warning" | "danger";
  className?: string;
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  className,
}: StatsCardProps) {
  const variantStyles = {
    default: "border-border",
    primary: "border-primary/30 bg-primary/5",
    warning: "border-risk-medium/30 bg-risk-medium/5",
    danger: "border-risk-critical/30 bg-risk-critical/5",
  };

  const iconStyles = {
    default: "text-muted-foreground",
    primary: "text-primary",
    warning: "text-risk-medium",
    danger: "text-risk-critical",
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border bg-card p-5 transition-all duration-300 hover:border-primary/30",
        variantStyles[variant],
        className
      )}
    >
      {/* Background decoration */}
      <div
        className={cn(
          "absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-10 blur-2xl",
          variant === "primary" && "bg-primary",
          variant === "warning" && "bg-risk-medium",
          variant === "danger" && "bg-risk-critical",
          variant === "default" && "bg-muted-foreground"
        )}
      />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>

          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-md bg-secondary/50",
              iconStyles[variant]
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>

        {trend && (
          <div className="mt-3 flex items-center gap-1.5">
            <span
              className={cn(
                "text-xs font-medium",
                trend.isPositive ? "text-risk-low" : "text-risk-critical"
              )}
            >
              {trend.isPositive ? "+" : ""}
              {trend.value}%
            </span>
            <span className="text-xs text-muted-foreground">vs last week</span>
          </div>
        )}
      </div>
    </div>
  );
}
