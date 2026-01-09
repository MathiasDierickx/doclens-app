"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useGetDocumentQuery } from "@/store/api/generatedApi";
import { useAskQuestion, SourceReference } from "@/hooks/useAskQuestion";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceReference[];
  isStreaming?: boolean;
}

interface ChatAreaProps {
  documentId: string;
  /** Callback when a source citation is clicked (page is 0-indexed) */
  onSourceClick?: (pageIndex: number) => void;
}

export function ChatArea({ documentId, onSourceClick }: ChatAreaProps) {
  const { data: document, isLoading: isLoadingDoc } = useGetDocumentQuery({
    documentId,
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { ask, isLoading } = useAskQuestion({
    onChunk: (chunk) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamingMessageId ? { ...m, content: m.content + chunk } : m
        )
      );
    },
    onSources: (sources) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamingMessageId ? { ...m, sources } : m
        )
      );
    },
    onComplete: () => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamingMessageId ? { ...m, isStreaming: false } : m
        )
      );
      setStreamingMessageId(null);
    },
    onError: (error) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamingMessageId
            ? {
                ...m,
                content: m.content || `Error: ${error}`,
                isStreaming: false,
              }
            : m
        )
      );
      setStreamingMessageId(null);
    },
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const question = input.trim();

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
    };

    const assistantMessageId = crypto.randomUUID();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setStreamingMessageId(assistantMessageId);
    setInput("");

    await ask(documentId, question);
  };

  if (isLoadingDoc) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading document...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Document Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📄</span>
          <div>
            <h2 className="font-semibold">
              {document?.filename || "Document"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {document?.uploadedAt
                ? new Date(document.uploadedAt).toLocaleDateString()
                : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-auto p-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-muted-foreground mb-6">
              Ask a question about this document
            </p>
            <div className="grid gap-3 sm:grid-cols-2 max-w-lg">
              <Card
                className="cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() =>
                  setInput("What are the main findings of this document?")
                }
              >
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">
                    &quot;What are the main findings?&quot;
                  </p>
                </CardContent>
              </Card>
              <Card
                className="cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => setInput("Summarize this document")}
              >
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">
                    &quot;Summarize this document&quot;
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="space-y-6 max-w-3xl mx-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {message.content ? (
                    <p className="whitespace-pre-wrap">
                      {message.content}
                      {message.isStreaming && (
                        <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
                      )}
                    </p>
                  ) : message.isStreaming ? (
                    <div className="flex space-x-2">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0.1s]" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0.2s]" />
                    </div>
                  ) : null}

                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-medium opacity-70">Sources:</p>
                      {message.sources.map((source, idx) => (
                        <Card
                          key={idx}
                          className={`bg-background/50 ${
                            onSourceClick
                              ? "cursor-pointer transition-colors hover:bg-background/80"
                              : ""
                          }`}
                          onClick={() => onSourceClick?.(source.page - 1)}
                        >
                          <CardHeader className="p-3 pb-1">
                            <CardTitle className="text-xs font-medium flex items-center gap-2">
                              Page {source.page}
                              {onSourceClick && (
                                <span className="text-[10px] text-muted-foreground">
                                  Click to view
                                </span>
                              )}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 pt-0">
                            <p className="text-xs text-muted-foreground">
                              {source.text}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t bg-background px-6 py-4">
        <form onSubmit={handleSubmit} className="flex gap-3 max-w-3xl mx-auto">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about this document..."
            className="min-h-[44px] flex-1 resize-none"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
