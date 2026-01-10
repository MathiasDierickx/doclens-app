import { useState, useCallback } from "react";

export interface SourceReference {
  page: number;
  text: string;
  positions?: Array<{
    pageNumber: number;
    boundingBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    charOffset: number;
    charLength: number;
    pageWidth?: number;   // Page width in inches for coordinate conversion
    pageHeight?: number;  // Page height in inches for coordinate conversion
  }>;
  relevanceScore?: number;  // Relevance score from 0.0 to 1.0 (higher = better match)
}

export interface AskQuestionResult {
  answer: string;
  sources: SourceReference[];
  sessionId: string;
}

interface UseAskQuestionOptions {
  onChunk?: (chunk: string) => void;
  onSources?: (sources: SourceReference[]) => void;
  onComplete?: (result: AskQuestionResult) => void;
  onError?: (error: string) => void;
}

export function useAskQuestion(options: UseAskQuestionOptions = {}) {
  const { onChunk, onSources, onComplete, onError } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<SourceReference[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const ask = useCallback(
    async (documentId: string, question: string, existingSessionId?: string) => {
      setIsLoading(true);
      setAnswer("");
      setSources([]);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

      try {
        const response = await fetch(
          `${apiUrl}/documents/${documentId}/ask`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              question,
              sessionId: existingSessionId
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let fullAnswer = "";
        let finalSources: SourceReference[] = [];
        let currentEvent = "";
        let newSessionId = existingSessionId || "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events from buffer - split by double newline (SSE event separator)
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || ""; // Keep incomplete event in buffer

          for (const part of parts) {
            const lines = part.split("\n");
            for (const line of lines) {
              if (line.startsWith("event: ")) {
                currentEvent = line.slice(7).trim();
              } else if (line.startsWith("data: ")) {
                const data = line.slice(6);
                try {
                  const parsed = JSON.parse(data);

                  switch (currentEvent) {
                    case "chunk":
                      fullAnswer += parsed.content || "";
                      setAnswer(fullAnswer);
                      onChunk?.(parsed.content || "");
                      break;
                    case "sources":
                      finalSources = parsed.sources || [];
                      setSources(finalSources);
                      onSources?.(finalSources);
                      break;
                    case "done":
                      newSessionId = parsed.sessionId || newSessionId;
                      setSessionId(newSessionId);
                      onComplete?.({ answer: fullAnswer, sources: finalSources, sessionId: newSessionId });
                      break;
                    case "error":
                      setError(parsed.error || "Unknown error");
                      onError?.(parsed.error || "Unknown error");
                      break;
                  }
                } catch {
                  // Ignore JSON parse errors for incomplete data
                }
              }
            }
          }
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to ask question";
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [onChunk, onSources, onComplete, onError]
  );

  const reset = useCallback(() => {
    setAnswer("");
    setSources([]);
    setError(null);
    setIsLoading(false);
    setSessionId(null);
  }, []);

  return {
    ask,
    reset,
    isLoading,
    answer,
    sources,
    error,
    sessionId,
    setSessionId,
  };
}
