import { useState, useEffect, useRef } from "react";

export type IndexingStatus =
  | "pending"
  | "extracting"
  | "chunking"
  | "embedding"
  | "indexing"
  | "ready"
  | "error";

export interface IndexingStatusEvent {
  status: IndexingStatus;
  progress: number;
  message?: string;
  error?: string;
}

interface UseIndexingStatusOptions {
  enabled?: boolean;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export function useIndexingStatus(
  documentId: string | null,
  options: UseIndexingStatusOptions = {}
) {
  const { enabled = true, onComplete, onError } = options;
  const [status, setStatus] = useState<IndexingStatusEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Use refs to store callbacks to prevent reconnection on callback changes
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  // Keep refs up to date
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  }, [onComplete, onError]);

  useEffect(() => {
    if (!documentId || !enabled) {
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    const eventSource = new EventSource(
      `${apiUrl}/documents/${documentId}/status`
    );

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.addEventListener("status", (event) => {
      const data = JSON.parse(event.data) as IndexingStatusEvent;
      setStatus(data);
    });

    eventSource.addEventListener("complete", (event) => {
      const data = JSON.parse(event.data) as IndexingStatusEvent;
      setStatus(data);
      eventSource.close();
      setIsConnected(false);
      onCompleteRef.current?.();
    });

    eventSource.addEventListener("error", (event) => {
      if (event instanceof MessageEvent) {
        const data = JSON.parse(event.data) as IndexingStatusEvent;
        setStatus(data);
        onErrorRef.current?.(data.error || "Unknown error");
      }
      eventSource.close();
      setIsConnected(false);
    });

    eventSource.onerror = () => {
      eventSource.close();
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [documentId, enabled]); // Only reconnect when documentId or enabled changes

  return {
    status,
    isConnected,
    isComplete: status?.status === "ready",
    isError: status?.status === "error",
    progress: status?.progress ?? 0,
    message: status?.message,
    error: status?.error,
  };
}
