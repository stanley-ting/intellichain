"use client";

import { Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showCreateButton?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function Header({
  title,
  subtitle,
  showCreateButton = false,
  onRefresh,
  isRefreshing,
}: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card/30 px-6 backdrop-blur-sm">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {onRefresh && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={cn("h-4 w-4", isRefreshing && "animate-spin")}
            />
          </Button>
        )}
        {showCreateButton && (
          <Link href="/disruptions/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              New Disruption
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
