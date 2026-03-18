import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/50",
        className
      )}
    />
  );
}

export function CardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-6 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

export function WorkflowResultSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Event Details */}
      <div className="grid grid-cols-3 gap-6">
        <CardSkeleton />
        <div className="col-span-2">
          <CardSkeleton className="h-full" />
        </div>
      </div>

      {/* Impact Graph */}
      <div className="rounded-lg border border-border bg-card p-6">
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </div>

      {/* Mitigations */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        {[1, 2, 3].map((i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
