"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ApiHealthIndicator } from "@/components/ApiHealthIndicator";
import { UploadDialog } from "@/components/UploadDialog";
import { DocumentsList } from "@/components/DocumentsList";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { page: number; text: string }[];
}

export default function Home() {
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

    // TODO: Replace with actual API call to Azure Function
    // Simulated response for now
    setTimeout(() => {
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "This is a placeholder response. Connect me to your Azure Function backend to get real answers from your documents!",
        sources: [
          { page: 1, text: "Example source text from page 1..." },
          { page: 3, text: "Another relevant passage from page 3..." },
        ],
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">DocLens</h1>
            <ApiHealthIndicator />
          </div>
<UploadDialog />
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl px-6 py-8">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 text-6xl">📄</div>
              <h2 className="mb-2 text-2xl font-semibold">
                Welcome to DocLens
              </h2>
              <p className="mb-8 max-w-md text-muted-foreground">
                Upload a PDF document and ask questions about its content.
                I&apos;ll provide answers with references to the source pages.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 mb-8">
                <Card className="cursor-pointer transition-colors hover:bg-muted/50">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">
                      &quot;What are the main findings of this report?&quot;
                    </p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer transition-colors hover:bg-muted/50">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">
                      &quot;Summarize section 3 of this document&quot;
                    </p>
                  </CardContent>
                </Card>
              </div>

              <DocumentsList />
            </div>
          ) : (
            <div className="space-y-6">
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

                    {/* Source References */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-medium opacity-70">
                          Sources:
                        </p>
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
      </main>

      {/* Input Area */}
      <footer className="border-t bg-background px-6 py-4">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-4xl gap-3"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your document..."
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
      </footer>
    </div>
  );
}
