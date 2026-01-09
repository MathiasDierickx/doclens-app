"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useGetDocumentQuery } from "@/store/api/generatedApi";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { page: number; text: string }[];
}

interface ChatAreaProps {
  documentId: string;
}

export function ChatArea({ documentId }: ChatAreaProps) {
  const { data: document, isLoading: isLoadingDoc } = useGetDocumentQuery({ documentId });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // TODO: Replace with actual API call to Azure Function for Q&A
    setTimeout(() => {
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "This is a placeholder response. The Q&A feature will be implemented with Azure Document Intelligence and Azure OpenAI.",
        sources: [
          { page: 1, text: "Example source text from page 1..." },
          { page: 3, text: "Another relevant passage from page 3..." },
        ],
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
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
            <h2 className="font-semibold">{document?.filename || "Document"}</h2>
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
                onClick={() => setInput("What are the main findings of this document?")}
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
                  <p className="whitespace-pre-wrap">{message.content}</p>

                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-medium opacity-70">Sources:</p>
                      {message.sources.map((source, idx) => (
                        <Card key={idx} className="bg-background/50">
                          <CardHeader className="p-3 pb-1">
                            <CardTitle className="text-xs font-medium">
                              Page {source.page}
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

            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg bg-muted px-4 py-3">
                  <div className="flex space-x-2">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0.1s]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            )}
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
