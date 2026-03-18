import { apiFetch } from "./client";

export interface CascadingImpact {
  event: {
    id: string;
    type: string;
    severity: number;
    region: string;
  } | null;
  region: {
    id: string;
    name: string;
  } | null;
  suppliers: Array<{
    id: string;
    name: string;
    reliability_score: number;
    lat?: number;
    lng?: number;
  }>;
  skus: Array<{
    id: string;
    name: string;
    category: string;
  }>;
  warehouses: Array<{
    id: string;
    name: string;
    capacity: number;
    lat?: number;
    lng?: number;
  }>;
  factories: Array<{
    id: string;
    name: string;
    lat?: number;
    lng?: number;
  }>;
}

export interface SupplyChainEntities {
  suppliers: Array<{
    id: string;
    name: string;
    reliability_score: number;
    region: string;
    lat?: number;
    lng?: number;
  }>;
  warehouses: Array<{
    id: string;
    name: string;
    capacity: number;
    region: string;
    lat?: number;
    lng?: number;
  }>;
  factories: Array<{
    id: string;
    name: string;
    region: string;
    lat?: number;
    lng?: number;
  }>;
  ports: Array<{
    id: string;
    name: string;
    region: string;
    lat?: number;
    lng?: number;
  }>;
  regions: Array<{
    id: string;
    name: string;
    lat?: number;
    lng?: number;
  }>;
}

export interface Connection {
  from_id: string;
  from_type: string;
  to_id: string;
  to_type: string;
}

export async function getCascadingImpact(eventId: string): Promise<CascadingImpact> {
  return apiFetch<CascadingImpact>(`/api/graph/impact/${eventId}`);
}

export async function getEntities(): Promise<SupplyChainEntities> {
  return apiFetch<SupplyChainEntities>("/api/graph/entities");
}

export async function getConnections(): Promise<Connection[]> {
  return apiFetch<Connection[]>("/api/graph/connections");
}
