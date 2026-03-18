"use client";

import { useEffect, useRef, useLayoutEffect } from "react";
import * as am5 from "@amcharts/amcharts5";
import * as am5map from "@amcharts/amcharts5/map";
import am5geodata_worldLow from "@amcharts/amcharts5-geodata/worldLow";
import am5themes_Dark from "@amcharts/amcharts5/themes/Dark";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import type { SupplyChainEntities, CascadingImpact } from "@/lib/api/graph";
import type { DisruptionEvent } from "@/lib/types";

interface AmChartsMapProps {
  entitiesData: SupplyChainEntities | undefined;
  disruptions: DisruptionEvent[];
  selectedImpact: CascadingImpact | null;
  onEntitySelect: (entity: {
    id: string;
    name: string;
    type: string;
    region: string;
    lat: number;
    lng: number;
    reliability_score?: number;
    capacity?: number;
  } | null) => void;
  onDisruptionClick: (eventId: string) => void;
}

const ENTITY_COLORS = {
  supplier: am5.color(0x22d3ee), // cyan
  warehouse: am5.color(0x22c55e), // green
  factory: am5.color(0xeab308), // yellow
  port: am5.color(0xa855f7), // purple
  disruption: am5.color(0xef4444), // red
};

export function AmChartsMap({ entitiesData, disruptions, selectedImpact, onEntitySelect, onDisruptionClick }: AmChartsMapProps) {
  const chartRef = useRef<am5.Root | null>(null);
  const chartDivRef = useRef<HTMLDivElement>(null);
  const onDisruptionClickRef = useRef(onDisruptionClick);

  // Keep ref updated with latest callback
  useEffect(() => {
    onDisruptionClickRef.current = onDisruptionClick;
  }, [onDisruptionClick]);

  useLayoutEffect(() => {
    if (!chartDivRef.current) return;

    const root = am5.Root.new(chartDivRef.current);
    chartRef.current = root;

    root.setThemes([am5themes_Dark.new(root), am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
      am5map.MapChart.new(root, {
        panX: "rotateX",
        panY: "rotateY",
        projection: am5map.geoMercator(),
        homeGeoPoint: { longitude: 30, latitude: 25 },
        homeZoomLevel: 1.5,
      })
    );

    // Countries
    const polygonSeries = chart.series.push(
      am5map.MapPolygonSeries.new(root, {
        geoJSON: am5geodata_worldLow,
        exclude: ["AQ"],
      })
    );

    polygonSeries.mapPolygons.template.setAll({
      tooltipText: "{name}",
      interactive: true,
      fill: am5.color(0x1e293b),
      strokeWidth: 0.5,
      stroke: am5.color(0x334155),
    });

    polygonSeries.mapPolygons.template.states.create("hover", {
      fill: am5.color(0x334155),
    });

    // Impact lines (shown when disruption selected)
    const impactLineSeries = chart.series.push(
      am5map.MapLineSeries.new(root, {})
    );

    impactLineSeries.mapLines.template.setAll({
      stroke: ENTITY_COLORS.disruption,
      strokeWidth: 2,
      strokeOpacity: 0.7,
    });

    // Arrow at end of line
    impactLineSeries.mapLines.template.set("strokeDasharray", [8, 4]);

    // Suppliers
    const supplierSeries = chart.series.push(
      am5map.MapPointSeries.new(root, {
        latitudeField: "lat",
        longitudeField: "lng",
      })
    );

    supplierSeries.bullets.push(() => {
      const circle = am5.Circle.new(root, {
        radius: 8,
        fill: ENTITY_COLORS.supplier,
        fillOpacity: 0.9,
        stroke: am5.color(0xffffff),
        strokeWidth: 2,
        tooltipText: "{name}\nSupplier - {region}",
        cursorOverStyle: "pointer",
        shadowColor: ENTITY_COLORS.supplier,
        shadowBlur: 10,
      });

      circle.events.on("click", (e) => {
        const data = e.target.dataItem?.dataContext as any;
        if (data) {
          onEntitySelect({
            id: data.id,
            name: data.name,
            type: "supplier",
            region: data.region,
            lat: data.lat,
            lng: data.lng,
            reliability_score: data.reliability_score,
          });
        }
      });

      circle.states.create("hover", { scale: 1.3 });
      return am5.Bullet.new(root, { sprite: circle });
    });

    // Warehouses
    const warehouseSeries = chart.series.push(
      am5map.MapPointSeries.new(root, {
        latitudeField: "lat",
        longitudeField: "lng",
      })
    );

    warehouseSeries.bullets.push(() => {
      const circle = am5.Circle.new(root, {
        radius: 8,
        fill: ENTITY_COLORS.warehouse,
        fillOpacity: 0.9,
        stroke: am5.color(0xffffff),
        strokeWidth: 2,
        tooltipText: "{name}\nWarehouse - {region}",
        cursorOverStyle: "pointer",
        shadowColor: ENTITY_COLORS.warehouse,
        shadowBlur: 10,
      });

      circle.events.on("click", (e) => {
        const data = e.target.dataItem?.dataContext as any;
        if (data) {
          onEntitySelect({
            id: data.id,
            name: data.name,
            type: "warehouse",
            region: data.region,
            lat: data.lat,
            lng: data.lng,
            capacity: data.capacity,
          });
        }
      });

      circle.states.create("hover", { scale: 1.3 });
      return am5.Bullet.new(root, { sprite: circle });
    });

    // Factories
    const factorySeries = chart.series.push(
      am5map.MapPointSeries.new(root, {
        latitudeField: "lat",
        longitudeField: "lng",
      })
    );

    factorySeries.bullets.push(() => {
      const circle = am5.Circle.new(root, {
        radius: 8,
        fill: ENTITY_COLORS.factory,
        fillOpacity: 0.9,
        stroke: am5.color(0xffffff),
        strokeWidth: 2,
        tooltipText: "{name}\nFactory - {region}",
        cursorOverStyle: "pointer",
        shadowColor: ENTITY_COLORS.factory,
        shadowBlur: 10,
      });

      circle.events.on("click", (e) => {
        const data = e.target.dataItem?.dataContext as any;
        if (data) {
          onEntitySelect({
            id: data.id,
            name: data.name,
            type: "factory",
            region: data.region,
            lat: data.lat,
            lng: data.lng,
          });
        }
      });

      circle.states.create("hover", { scale: 1.3 });
      return am5.Bullet.new(root, { sprite: circle });
    });

    // Ports
    const portSeries = chart.series.push(
      am5map.MapPointSeries.new(root, {
        latitudeField: "lat",
        longitudeField: "lng",
      })
    );

    portSeries.bullets.push(() => {
      const circle = am5.Circle.new(root, {
        radius: 8,
        fill: ENTITY_COLORS.port,
        fillOpacity: 0.9,
        stroke: am5.color(0xffffff),
        strokeWidth: 2,
        tooltipText: "{name}\nPort - {region}",
        cursorOverStyle: "pointer",
        shadowColor: ENTITY_COLORS.port,
        shadowBlur: 10,
      });

      circle.events.on("click", (e) => {
        const data = e.target.dataItem?.dataContext as any;
        if (data) {
          onEntitySelect({
            id: data.id,
            name: data.name,
            type: "port",
            region: data.region,
            lat: data.lat,
            lng: data.lng,
          });
        }
      });

      circle.states.create("hover", { scale: 1.3 });
      return am5.Bullet.new(root, { sprite: circle });
    });

    // Disruptions with pulsing effect
    const disruptionSeries = chart.series.push(
      am5map.MapPointSeries.new(root, {
        latitudeField: "lat",
        longitudeField: "lng",
      })
    );

    disruptionSeries.bullets.push((root, series, dataItem) => {
      const container = am5.Container.new(root, {
        cursorOverStyle: "pointer",
      });

      const pulseCircle = container.children.push(
        am5.Circle.new(root, {
          radius: 20,
          fill: ENTITY_COLORS.disruption,
          fillOpacity: 0.3,
        })
      );

      pulseCircle.animate({
        key: "radius",
        from: 15,
        to: 40,
        duration: 1500,
        loops: Infinity,
        easing: am5.ease.out(am5.ease.cubic),
      });

      pulseCircle.animate({
        key: "fillOpacity",
        from: 0.5,
        to: 0,
        duration: 1500,
        loops: Infinity,
        easing: am5.ease.out(am5.ease.cubic),
      });

      const innerCircle = container.children.push(
        am5.Circle.new(root, {
          radius: 10,
          fill: ENTITY_COLORS.disruption,
          fillOpacity: 0.9,
          stroke: am5.color(0xffffff),
          strokeWidth: 2,
          tooltipText: "Click to show impact\n{region}",
          shadowColor: ENTITY_COLORS.disruption,
          shadowBlur: 15,
        })
      );

      // Click handler for disruption
      container.events.on("click", () => {
        const ctx = dataItem.dataContext as any;
        if (ctx?.id) {
          onDisruptionClickRef.current(ctx.id);
        }
      });

      return am5.Bullet.new(root, { sprite: container });
    });

    // Store refs
    (chart as any).supplierSeries = supplierSeries;
    (chart as any).warehouseSeries = warehouseSeries;
    (chart as any).factorySeries = factorySeries;
    (chart as any).portSeries = portSeries;
    (chart as any).disruptionSeries = disruptionSeries;
    (chart as any).impactLineSeries = impactLineSeries;

    chart.set("zoomControl", am5map.ZoomControl.new(root, {}));
    chart.appear(1000, 100);

    return () => {
      root.dispose();
    };
  }, [onEntitySelect]);

  // Update entities
  useEffect(() => {
    if (!chartRef.current || !entitiesData) return;

    const root = chartRef.current;
    const chart = root.container.children.getIndex(0) as am5map.MapChart;
    if (!chart) return;

    const supplierSeries = (chart as any).supplierSeries as am5map.MapPointSeries;
    const warehouseSeries = (chart as any).warehouseSeries as am5map.MapPointSeries;
    const factorySeries = (chart as any).factorySeries as am5map.MapPointSeries;
    const portSeries = (chart as any).portSeries as am5map.MapPointSeries;

    supplierSeries.data.setAll(
      entitiesData.suppliers.filter((s) => s.lat && s.lng).map((s) => ({
        id: s.id, name: s.name, region: s.region, lat: s.lat, lng: s.lng, reliability_score: s.reliability_score,
      }))
    );

    warehouseSeries.data.setAll(
      entitiesData.warehouses.filter((w) => w.lat && w.lng).map((w) => ({
        id: w.id, name: w.name, region: w.region, lat: w.lat, lng: w.lng, capacity: w.capacity,
      }))
    );

    factorySeries.data.setAll(
      entitiesData.factories.filter((f) => f.lat && f.lng).map((f) => ({
        id: f.id, name: f.name, region: f.region, lat: f.lat, lng: f.lng,
      }))
    );

    portSeries.data.setAll(
      entitiesData.ports.filter((p) => p.lat && p.lng).map((p) => ({
        id: p.id, name: p.name, region: p.region, lat: p.lat, lng: p.lng,
      }))
    );
  }, [entitiesData]);

  // Update disruptions data
  useEffect(() => {
    if (!chartRef.current) return;

    const root = chartRef.current;
    const chart = root.container.children.getIndex(0) as am5map.MapChart;
    if (!chart) return;

    const disruptionSeries = (chart as any).disruptionSeries as am5map.MapPointSeries;

    const regionCoords: Record<string, { lat: number; lng: number }> = {
      "Asia Pacific": { lat: 35, lng: 105 },
      "Europe": { lat: 50, lng: 10 },
      "Americas": { lat: 37, lng: -95 },
    };

    const data = disruptions.map((d) => {
      const coords = regionCoords[d.region];
      if (!coords) return null;
      return {
        id: d.event_id,
        region: d.region,
        lat: coords.lat,
        lng: coords.lng,
        severity: d.severity,
      };
    }).filter(Boolean);

    disruptionSeries.data.setAll(data);
  }, [disruptions]);

  // Draw impact lines when a disruption is selected
  useEffect(() => {
    if (!chartRef.current || !entitiesData) return;

    const root = chartRef.current;
    const chart = root.container.children.getIndex(0) as am5map.MapChart;
    if (!chart) return;

    const impactLineSeries = (chart as any).impactLineSeries as am5map.MapLineSeries;
    if (!impactLineSeries) return;

    // Clear previous lines
    impactLineSeries.data.setAll([]);

    if (!selectedImpact?.event) return;

    const regionCoords: Record<string, { lat: number; lng: number }> = {
      "Asia Pacific": { lat: 35, lng: 105 },
      "Europe": { lat: 50, lng: 10 },
      "Americas": { lat: 37, lng: -95 },
    };

    const disruptionCoords = regionCoords[selectedImpact.event.region];
    if (!disruptionCoords) return;

    const lineData: Array<{ geometry: { type: string; coordinates: number[][] } }> = [];

    // Lines to affected suppliers
    selectedImpact.suppliers.forEach((supplier) => {
      if (supplier.lat && supplier.lng) {
        lineData.push({
          geometry: {
            type: "LineString",
            coordinates: [
              [disruptionCoords.lng, disruptionCoords.lat],
              [supplier.lng, supplier.lat],
            ],
          },
        });
      }
    });

    // Lines to affected warehouses
    selectedImpact.warehouses.forEach((warehouse) => {
      if (warehouse.lat && warehouse.lng) {
        lineData.push({
          geometry: {
            type: "LineString",
            coordinates: [
              [disruptionCoords.lng, disruptionCoords.lat],
              [warehouse.lng, warehouse.lat],
            ],
          },
        });
      }
    });

    // Lines to affected factories
    selectedImpact.factories.forEach((factory) => {
      if (factory.lat && factory.lng) {
        lineData.push({
          geometry: {
            type: "LineString",
            coordinates: [
              [disruptionCoords.lng, disruptionCoords.lat],
              [factory.lng, factory.lat],
            ],
          },
        });
      }
    });

    impactLineSeries.data.setAll(lineData);
  }, [selectedImpact, entitiesData]);

  return <div ref={chartDivRef} className="w-full h-full" />;
}
