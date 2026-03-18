"use client";

import { useState, useEffect, useCallback } from "react";
import { getSSEUrl } from "@/lib/api/client";
import type { UIEvent, WorkflowNode } from "@/lib/types";

export type SSEStatus = "connecting" | "open" | "done" | "error";

export interface UseSSEReturn {
  events: UIEvent[];
  status: SSEStatus;
  currentNode: WorkflowNode | null;
  error: string | null;
  reconnect: () => void;
}

export function useWorkflowSSE(workflowId: string | null): UseSSEReturn {
  const [events, setEvents] = useState<UIEvent[]>([]);
  const [status, setStatus] = useState<SSEStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [reconnectKey, setReconnectKey] = useState(0);

  const reconnect = useCallback(() => {
    setEvents([]);
    setStatus("connecting");
    setError(null);
    setReconnectKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!workflowId) {
      setStatus("connecting");
      return;
    }

    const url = getSSEUrl(workflowId);
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      setStatus("open");
    };

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        // Check for completion signal
        if (data.done) {
          setStatus("done");
          eventSource.close();
          return;
        }

        // Add event to list
        setEvents((prev) => [...prev, data as UIEvent]);
      } catch {
        console.error("Failed to parse SSE message:", e.data);
      }
    };

    eventSource.onerror = () => {
      setError("Connection lost");
      setStatus("error");
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [workflowId, reconnectKey]);

  // Get current node (last started or completed)
  const currentNode =
    events.length > 0 ? events[events.length - 1].node : null;

  return { events, status, currentNode, error, reconnect };
}
