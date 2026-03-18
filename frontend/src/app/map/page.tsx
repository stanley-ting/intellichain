"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { X, AlertTriangle, Loader2, Building2, Warehouse, Factory, Ship } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDisruptions } from "@/lib/api/disruptions";
import { getEntities, getCascadingImpact, type CascadingImpact } from "@/lib/api/graph";

const AmChartsMap = dynamic(
  () => import("@/components/map/amcharts-map").then((mod) => mod.AmChartsMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-card">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading map...</span>
        </div>
      </div>
    ),
  }
);

interface SelectedEntity {
  id: string;
  name: string;
  type: string;
  region: string;
  lat: number;
  lng: number;
  reliability_score?: number;
  capacity?: number;
}

const ENTITY_COLORS: Record<string, string> = {
  supplier: "hsl(185, 80%, 50%)",
  warehouse: "hsl(142, 71%, 45%)",
  factory: "hsl(48, 96%, 53%)",
  port: "hsl(260, 60%, 60%)",
};

export default function MapPage() {
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);
  const [selectedDisruptionId, setSelectedDisruptionId] = useState<string | null>(null);

  const { data: disruptions = [] } = useQuery({
    queryKey: ["disruptions"],
    queryFn: getDisruptions,
  });

  const { data: entitiesData, isLoading } = useQuery({
    queryKey: ["entities"],
    queryFn: getEntities,
  });

  // Fetch impact data when a disruption is clicked
  const { data: selectedImpact } = useQuery({
    queryKey: ["impact", selectedDisruptionId],
    queryFn: () => getCascadingImpact(selectedDisruptionId!),
    enabled: !!selectedDisruptionId,
  });

  const handleDisruptionClick = useCallback((eventId: string) => {
    // Toggle - click again to hide lines
    setSelectedDisruptionId((prev) => (prev === eventId ? null : eventId));
  }, []);

  const clearImpact = useCallback(() => {
    setSelectedDisruptionId(null);
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <Header title="Supply Chain Map" subtitle="Global operations visualization" />

      <div className="flex-1 relative overflow-hidden bg-[#0f172a]">
        <AmChartsMap
          entitiesData={entitiesData}
          disruptions={disruptions}
          selectedImpact={selectedImpact || null}
          onEntitySelect={setSelectedEntity}
          onDisruptionClick={handleDisruptionClick}
        />

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-40">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading supply chain...</span>
            </div>
          </div>
        )}

        {/* Selected entity panel */}
        {selectedEntity && (
          <div className="absolute right-4 top-4 z-50 w-72 animate-in slide-in-from-right-4 duration-200">
            <Card className="bg-card/95 backdrop-blur-sm border-primary/30">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-base">{selectedEntity.name}</CardTitle>
                  <p className="text-xs text-muted-foreground capitalize">{selectedEntity.type}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedEntity(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge
                  variant="secondary"
                  style={{
                    backgroundColor: `${ENTITY_COLORS[selectedEntity.type]}20`,
                    color: ENTITY_COLORS[selectedEntity.type],
                  }}
                >
                  {selectedEntity.region}
                </Badge>
                {selectedEntity.type === "supplier" && selectedEntity.reliability_score && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Reliability</span>
                    <span className="font-medium">{Math.round(selectedEntity.reliability_score * 100)}%</span>
                  </div>
                )}
                {selectedEntity.type === "warehouse" && selectedEntity.capacity && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Capacity</span>
                    <span className="font-medium data-text">{selectedEntity.capacity.toLocaleString()} units</span>
                  </div>
                )}
                <div className="flex justify-between text-xs pt-2 border-t border-border">
                  <span className="text-muted-foreground">Coordinates</span>
                  <span className="font-mono">{selectedEntity.lat.toFixed(2)}, {selectedEntity.lng.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Legend */}
        <div className="absolute left-4 bottom-4 z-50">
          <Card className="w-56 bg-card/90 backdrop-blur-sm">
            <CardContent className="p-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Live from Neo4j</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full flex items-center justify-center" style={{ backgroundColor: ENTITY_COLORS.supplier }}>
                      <Building2 className="h-2.5 w-2.5 text-black" />
                    </div>
                    <span>Suppliers</span>
                  </div>
                  <span className="text-muted-foreground font-mono">{entitiesData?.suppliers.length || 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full flex items-center justify-center" style={{ backgroundColor: ENTITY_COLORS.warehouse }}>
                      <Warehouse className="h-2.5 w-2.5 text-black" />
                    </div>
                    <span>Warehouses</span>
                  </div>
                  <span className="text-muted-foreground font-mono">{entitiesData?.warehouses.length || 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full flex items-center justify-center" style={{ backgroundColor: ENTITY_COLORS.factory }}>
                      <Factory className="h-2.5 w-2.5 text-black" />
                    </div>
                    <span>Factories</span>
                  </div>
                  <span className="text-muted-foreground font-mono">{entitiesData?.factories.length || 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full flex items-center justify-center" style={{ backgroundColor: ENTITY_COLORS.port }}>
                      <Ship className="h-2.5 w-2.5 text-white" />
                    </div>
                    <span>Ports</span>
                  </div>
                  <span className="text-muted-foreground font-mono">{entitiesData?.ports.length || 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-red-500 animate-pulse" />
                    <span>Disruptions</span>
                  </div>
                  <span className="text-red-500 font-mono">{disruptions.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Disruption Alert */}
        {disruptions.length > 0 && (
          <div className="absolute left-4 top-4 z-50 w-64 animate-in slide-in-from-left-4 duration-200">
            <Card className="bg-red-500/10 border-red-500/30">
              <CardContent className="p-3 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 animate-pulse" />
                <div>
                  <p className="text-sm font-medium">{disruptions.length} Active Disruption{disruptions.length !== 1 && "s"}</p>
                  <p className="text-xs text-muted-foreground">Click to show impact</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Impact Info Panel */}
        {selectedImpact && selectedImpact.event && (
          <div className="absolute right-4 bottom-4 z-50 w-64 animate-in slide-in-from-right-4 duration-200">
            <Card className="bg-red-500/10 border-red-500/30">
              <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <CardTitle className="text-sm text-red-400">Cascading Impact</CardTitle>
                <Button variant="ghost" size="icon" className="h-5 w-5 -mt-1" onClick={clearImpact}>
                  <X className="h-3 w-3" />
                </Button>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <p className="text-xs text-muted-foreground">{selectedImpact.event.region}</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-red-400">{selectedImpact.suppliers.length}</p>
                    <p className="text-xs text-muted-foreground">Suppliers</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-red-400">{selectedImpact.warehouses.length}</p>
                    <p className="text-xs text-muted-foreground">Warehouses</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-red-400">{selectedImpact.skus.length}</p>
                    <p className="text-xs text-muted-foreground">SKUs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
