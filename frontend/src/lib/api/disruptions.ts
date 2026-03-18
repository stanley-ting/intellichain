import { apiFetch } from "./client";
import type {
  DisruptionEvent,
  CreateDisruptionRequest,
  CreateDisruptionResponse,
} from "../types";

export async function getDisruptions(): Promise<DisruptionEvent[]> {
  return apiFetch<DisruptionEvent[]>("/api/disruptions");
}

export async function getDisruption(eventId: string): Promise<DisruptionEvent> {
  return apiFetch<DisruptionEvent>(`/api/disruptions/${eventId}`);
}

export async function createDisruption(
  data: CreateDisruptionRequest
): Promise<CreateDisruptionResponse> {
  return apiFetch<CreateDisruptionResponse>("/api/disruptions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
