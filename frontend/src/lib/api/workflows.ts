import { apiFetch } from "./client";
import type { WorkflowResponse } from "../types";

export interface WorkflowSummary {
  id: string;
  status: string;
  event_id: string;
  risk_level: string | null;
  created_at: string;
}

export async function getWorkflows(): Promise<WorkflowSummary[]> {
  return apiFetch<WorkflowSummary[]>("/api/workflows");
}

export async function getWorkflow(workflowId: string): Promise<WorkflowResponse> {
  return apiFetch<WorkflowResponse>(`/api/workflows/${workflowId}`);
}
