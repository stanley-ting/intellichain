// Event types matching backend Pydantic models
export type EventType = "weather" | "supplier_outage" | "port_congestion" | "demand_spike";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type UIEventStatus = "started" | "completed" | "error";

export type WorkflowNode =
  | "load_event"
  | "enrich_description"
  | "persist_event"
  | "gather_evidence"
  | "assess_risk"
  | "generate_mitigations"
  | "rank_mitigations"
  | "route_action";

export interface DisruptionEvent {
  event_id: string;
  id?: string;  // Backend may also return 'id'
  event_type: EventType;
  type?: EventType;  // Backend may also return 'type'
  region: string;
  severity: number;
  description: string;
  timestamp: string;
}

export interface UIEvent {
  event_id: string;
  workflow_id: string;
  node: WorkflowNode;
  status: UIEventStatus;
  timestamp: string;
  data: Record<string, unknown>;
}

// Cypher query event from LLM reasoning
export interface CypherQueryEvent {
  type: "cypher";
  query: string;
  result: string | null;
  reasoning: string | null;
}

export interface RiskAssessment {
  risk_level: RiskLevel;
  confidence: number;
  reasoning: string;
  key_factors: string[];
  estimated_recovery_days: number;
}

// Graph-derived mitigation (entity from Neo4j)
export interface RankedMitigation {
  rank: number;
  entity_type: string;  // Supplier, Warehouse, Factory
  entity_id: string;
  entity_name: string;
  action: string;
  score: number;
  reasoning: string;
}

export interface RecommendedAction {
  mitigation: RankedMitigation;
  summary: string;
}

export interface WorkflowResponse {
  workflow_id: string;
  status: "pending" | "completed" | "error";
  event: DisruptionEvent | null;
  risk_level: RiskLevel | null;
  risk_assessment: RiskAssessment | null;
  ranked_mitigations: RankedMitigation[];
  recommended_action: RecommendedAction | null;
  error: string | null;
}

// Entity types for map
export interface Supplier {
  id: string;
  name: string;
  region: string;
  reliability_score: number;
  lat?: number;
  lng?: number;
}

export interface Warehouse {
  id: string;
  name: string;
  region: string;
  capacity: number;
  lat?: number;
  lng?: number;
}

export interface Factory {
  id: string;
  name: string;
  region: string;
  lat?: number;
  lng?: number;
}

export interface Region {
  id: string;
  name: string;
}

// API request types
export interface CreateDisruptionRequest {
  event_type: EventType;
  region: string;
  severity: number;
  description: string;
}

export interface CreateDisruptionResponse {
  workflow_id: string;
  event_id: string;
  message: string;
}

// Dashboard stats
export interface DashboardStats {
  active_disruptions: number;
  risk_distribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  affected_skus_count: number;
  affected_suppliers_count: number;
}
