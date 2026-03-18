"use client";

import { useState, useMemo, useCallback } from "react";
import MapGL, { Marker, Popup, Source, Layer, NavigationControl } from "react-map-gl/maplibre";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { X, Building2, Warehouse, Factory, Ship } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DisruptionEvent } from "@/lib/types";
import type { SupplyChainEntities, Connection } from "@/lib/api/graph";

// Dark style using OSM raster tiles from Carto
const MAP_STYLE: StyleSpecification = {
  version: 8,
  name: "Dark",
  sources: {
    "osm-raster": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: "osm-raster-layer",
      type: "raster",
      source: "osm-raster",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

type EntityType = "supplier" | "warehouse" | "factory" | "port";

interface SelectedEntity {
  id: string;
  name: string;
  type: EntityType;
  region: string;
  lat: number;
  lng: number;
  reliability_score?: number;
  capacity?: number;
}

// Entity colors
const ENTITY_COLORS: Record<EntityType, string> = {
  supplier: "hsl(185, 80%, 50%)",
  warehouse: "hsl(142, 71%, 45%)",
  factory: "hsl(48, 96%, 53%)",
  port: "hsl(260, 60%, 60%)",
};

interface SupplyChainMapProps {
  entitiesData: SupplyChainEntities | undefined;
  connectionsData: Connection[];
  disruptions: DisruptionEvent[];
}

export function SupplyChainMap({ entitiesData, connectionsData, disruptions }: SupplyChainMapProps) {
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);
  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null);
  const [viewState, setViewState] = useState({
    longitude: 30,
    latitude: 25,
    zoom: 1.5,
  });

  // Build entity lookup map
  const entityLookup = useMemo(() => {
    if (!entitiesData) return new Map<string, { lat: number; lng: number }>();
    const lookup = new Map<string, { lat: number; lng: number }>();

    [...entitiesData.suppliers, ...entitiesData.warehouses, ...entitiesData.factories, ...entitiesData.ports].forEach((e) => {
      if (e.lat && e.lng) {
        lookup.set(e.id, { lat: e.lat, lng: e.lng });
      }
    });

    return lookup;
  }, [entitiesData]);

  // Build GeoJSON for connection lines
  const connectionLines = useMemo(() => {
    if (!connectionsData.length || !entityLookup.size) return null;

    const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];

    connectionsData.forEach((conn) => {
      const from = entityLookup.get(conn.from_id);
      const to = entityLookup.get(conn.to_id);
      if (from && to) {
        features.push({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [from.lng, from.lat],
              [to.lng, to.lat],
            ],
          },
        });
      }
    });

    return {
      type: "FeatureCollection" as const,
      features,
    };
  }, [connectionsData, entityLookup]);

  // Region coordinates for disruption markers
  const regionCoords: Record<string, { lat: number; lng: number }> = {
    "Asia Pacific": { lat: 35, lng: 105 },
    "Europe": { lat: 50, lng: 10 },
    "Americas": { lat: 37, lng: -95 },
  };

  const handleEntityClick = useCallback((entity: SelectedEntity) => {
    if (selectedEntity?.id === entity.id) {
      setSelectedEntity(null);
    } else {
      setSelectedEntity(entity);
      setViewState((prev) => ({
        ...prev,
        longitude: entity.lng,
        latitude: entity.lat,
        zoom: Math.max(prev.zoom, 4),
      }));
    }
  }, [selectedEntity]);

  return (
    <MapGL
      {...viewState}
      onMove={(evt) => setViewState(evt.viewState)}
      mapStyle={MAP_STYLE}
      style={{ width: "100%", height: "100%" }}
      attributionControl={{ compact: true }}
    >
      <NavigationControl position="bottom-right" />

      {/* Connection lines layer */}
      {connectionLines && (
        <Source id="connections" type="geojson" data={connectionLines}>
          <Layer
            id="connection-lines"
            type="line"
            paint={{
              "line-color": "hsl(185, 60%, 40%)",
              "line-width": 1,
              "line-opacity": 0.4,
              "line-dasharray": [4, 4],
            }}
          />
        </Source>
      )}

      {/* Disruption pulse markers */}
      {disruptions.map((d: DisruptionEvent) => {
        const coords = regionCoords[d.region];
        if (!coords) return null;

        return (
          <Marker
            key={`disruption-${d.event_id}`}
            longitude={coords.lng}
            latitude={coords.lat}
          >
            <div className="relative">
              <div
                className="absolute rounded-full bg-red-500/30 animate-ping"
                style={{
                  width: 40 + d.severity * 40,
                  height: 40 + d.severity * 40,
                  left: -(20 + d.severity * 20),
                  top: -(20 + d.severity * 20),
                }}
              />
              <div
                className="absolute rounded-full bg-red-500/20 animate-ping"
                style={{
                  width: 60 + d.severity * 40,
                  height: 60 + d.severity * 40,
                  left: -(30 + d.severity * 20),
                  top: -(30 + d.severity * 20),
                  animationDelay: "0.5s",
                }}
              />
              <div
                className="rounded-full bg-red-500 shadow-lg shadow-red-500/50"
                style={{ width: 16, height: 16 }}
              />
            </div>
          </Marker>
        );
      })}

      {/* Supplier markers */}
      {entitiesData?.suppliers
        .filter((s) => s.lat && s.lng)
        .map((s) => (
          <Marker key={s.id} longitude={s.lng!} latitude={s.lat!} anchor="center">
            <button
              onClick={() => handleEntityClick({ ...s, lat: s.lat!, lng: s.lng!, type: "supplier" })}
              onMouseEnter={() => setHoveredEntity(s.id)}
              onMouseLeave={() => setHoveredEntity(null)}
              className={`flex items-center justify-center rounded-full transition-all duration-200 ${selectedEntity?.id === s.id || hoveredEntity === s.id ? "scale-125 ring-2 ring-white" : ""}`}
              style={{ backgroundColor: ENTITY_COLORS.supplier, width: 24, height: 24, boxShadow: `0 0 12px ${ENTITY_COLORS.supplier}` }}
            >
              <Building2 className="h-3 w-3 text-black" />
            </button>
          </Marker>
        ))}

      {/* Warehouse markers */}
      {entitiesData?.warehouses
        .filter((w) => w.lat && w.lng)
        .map((w) => (
          <Marker key={w.id} longitude={w.lng!} latitude={w.lat!} anchor="center">
            <button
              onClick={() => handleEntityClick({ ...w, lat: w.lat!, lng: w.lng!, type: "warehouse" })}
              onMouseEnter={() => setHoveredEntity(w.id)}
              onMouseLeave={() => setHoveredEntity(null)}
              className={`flex items-center justify-center rounded-full transition-all duration-200 ${selectedEntity?.id === w.id || hoveredEntity === w.id ? "scale-125 ring-2 ring-white" : ""}`}
              style={{ backgroundColor: ENTITY_COLORS.warehouse, width: 24, height: 24, boxShadow: `0 0 12px ${ENTITY_COLORS.warehouse}` }}
            >
              <Warehouse className="h-3 w-3 text-black" />
            </button>
          </Marker>
        ))}

      {/* Factory markers */}
      {entitiesData?.factories
        .filter((f) => f.lat && f.lng)
        .map((f) => (
          <Marker key={f.id} longitude={f.lng!} latitude={f.lat!} anchor="center">
            <button
              onClick={() => handleEntityClick({ ...f, lat: f.lat!, lng: f.lng!, type: "factory" })}
              onMouseEnter={() => setHoveredEntity(f.id)}
              onMouseLeave={() => setHoveredEntity(null)}
              className={`flex items-center justify-center rounded-full transition-all duration-200 ${selectedEntity?.id === f.id || hoveredEntity === f.id ? "scale-125 ring-2 ring-white" : ""}`}
              style={{ backgroundColor: ENTITY_COLORS.factory, width: 24, height: 24, boxShadow: `0 0 12px ${ENTITY_COLORS.factory}` }}
            >
              <Factory className="h-3 w-3 text-black" />
            </button>
          </Marker>
        ))}

      {/* Port markers */}
      {entitiesData?.ports
        .filter((p) => p.lat && p.lng)
        .map((p) => (
          <Marker key={p.id} longitude={p.lng!} latitude={p.lat!} anchor="center">
            <button
              onClick={() => handleEntityClick({ id: p.id, name: p.name, region: p.region, lat: p.lat!, lng: p.lng!, type: "port" })}
              onMouseEnter={() => setHoveredEntity(p.id)}
              onMouseLeave={() => setHoveredEntity(null)}
              className={`flex items-center justify-center rounded-full transition-all duration-200 ${selectedEntity?.id === p.id || hoveredEntity === p.id ? "scale-125 ring-2 ring-white" : ""}`}
              style={{ backgroundColor: ENTITY_COLORS.port, width: 24, height: 24, boxShadow: `0 0 12px ${ENTITY_COLORS.port}` }}
            >
              <Ship className="h-3 w-3 text-white" />
            </button>
          </Marker>
        ))}

      {/* Selected entity popup */}
      {selectedEntity && (
        <Popup
          longitude={selectedEntity.lng}
          latitude={selectedEntity.lat}
          anchor="bottom"
          onClose={() => setSelectedEntity(null)}
          closeButton={false}
          className="!p-0"
        >
          <Card className="w-56 border-0 shadow-none bg-transparent">
            <CardHeader className="flex flex-row items-start justify-between p-3 pb-1">
              <div>
                <CardTitle className="text-sm">{selectedEntity.name}</CardTitle>
                <p className="text-xs text-muted-foreground capitalize">{selectedEntity.type}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-5 w-5 -mt-1 -mr-1" onClick={() => setSelectedEntity(null)}>
                <X className="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              <Badge variant="secondary" style={{ backgroundColor: `${ENTITY_COLORS[selectedEntity.type]}20`, color: ENTITY_COLORS[selectedEntity.type], borderColor: ENTITY_COLORS[selectedEntity.type] }}>
                {selectedEntity.region}
              </Badge>
              {selectedEntity.type === "supplier" && selectedEntity.reliability_score && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Reliability</span>
                  <span className="font-medium font-mono">{Math.round(selectedEntity.reliability_score * 100)}%</span>
                </div>
              )}
              {selectedEntity.type === "warehouse" && selectedEntity.capacity && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Capacity</span>
                  <span className="font-medium font-mono">{selectedEntity.capacity.toLocaleString()} units</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Coordinates</span>
                <span className="font-mono text-[10px]">{selectedEntity.lat.toFixed(2)}, {selectedEntity.lng.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </Popup>
      )}
    </MapGL>
  );
}
