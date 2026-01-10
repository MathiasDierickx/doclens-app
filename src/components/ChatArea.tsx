"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useGetDocumentQuery, useGetChatSessionsQuery, useGetChatHistoryQuery, api } from "@/store/api/generatedApi";
import { useAskQuestion, SourceReference } from "@/hooks/useAskQuestion";
import { useDispatch } from "react-redux";
import { ChevronDown, ChevronUp, Trophy, Medal, Award } from "lucide-react";

// Re-export for use in other components
export type { SourceReference } from "@/hooks/useAskQuestion";

const MAX_VISIBLE_SOURCES = 3;

// Markdown content renderer with proper styling
function MarkdownContent({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted prose-pre:p-3 prose-pre:rounded-lg">
      <ReactMarkdown>
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse rounded-sm" />
      )}
    </div>
  );
}

// Ranking badge configuration for top 3 sources
const rankConfig = [
  { icon: Trophy, label: "Best match", className: "text-amber-500", bgClassName: "bg-amber-500/10" },
  { icon: Medal, label: "2nd match", className: "text-slate-400", bgClassName: "bg-slate-400/10" },
  { icon: Award, label: "3rd match", className: "text-amber-600", bgClassName: "bg-amber-600/10" },
];

function RankBadge({ rank }: { rank: number }) {
  if (rank >= rankConfig.length) return null;
  const config = rankConfig[rank];
  const Icon = config.icon;
  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${config.bgClassName}`}>
      <Icon className={`w-3 h-3 ${config.className}`} />
      <span className={`text-[10px] font-medium ${config.className}`}>{config.label}</span>
    </div>
  );
}

interface SourcesListProps {
  sources: SourceReference[];
  onSourceClick?: (source: SourceReference) => void;
  messageId: string;
}

function SourcesList({ sources, onSourceClick, messageId }: SourcesListProps) {
  const [expanded, setExpanded] = useState(false);

  const visibleSources = expanded ? sources : sources.slice(0, MAX_VISIBLE_SOURCES);
  const hiddenCount = sources.length - MAX_VISIBLE_SOURCES;
  const hasMore = sources.length > MAX_VISIBLE_SOURCES;

  // Get the original index in the full sources array for ranking
  const getOriginalIndex = (source: SourceReference) => sources.indexOf(source);

  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs font-semibold text-primary/80 flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
        Sources ({sources.length})
      </p>
      {visibleSources.map((source, idx) => {
        const originalIndex = getOriginalIndex(source);
        const isTopThree = originalIndex < 3;

        return (
          <Card
            key={`${messageId}-source-${idx}`}
            className={`bg-gradient-to-r from-muted/50 to-muted/30 border-primary/10 ${
              onSourceClick
                ? "cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/30"
                : ""
            }`}
            onClick={() => onSourceClick?.(source)}
          >
            <CardContent className="p-3">
              <div className="text-xs font-semibold flex items-center justify-between text-primary">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">Page {source.page}</span>
                  {onSourceClick && (
                    <span className="text-[10px] text-muted-foreground font-normal">
                      Click to view
                    </span>
                  )}
                </div>
                {isTopThree && <RankBadge rank={originalIndex} />}
              </div>
            </CardContent>
          </Card>
        );
      })}
      {hasMore && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors py-1"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              View {hiddenCount} more source{hiddenCount > 1 ? "s" : ""}
            </>
          )}
        </button>
      )}
    </div>
  );
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceReference[];
  isStreaming?: boolean;
}

interface StreamingMessage {
  userMessage: Message;
  assistantMessage: Message;
}

interface ChatAreaProps {
  documentId: string;
  /** Callback when a source citation is clicked - receives full source with positions */
  onSourceClick?: (source: SourceReference) => void;
}

export function ChatArea({ documentId, onSourceClick }: ChatAreaProps) {
  const { data: document, isLoading: isLoadingDoc } = useGetDocumentQuery({
    documentId,
  });

  // Fetch existing chat sessions for this document
  const { data: chatSessionsData, isFetching: isFetchingSessions } = useGetChatSessionsQuery({ documentId });

  // Get the most recent session if one exists
  const mostRecentSessionId = chatSessionsData?.sessions?.[0]?.sessionId;

  // Fetch chat history for the most recent session
  const { data: chatHistoryData, isFetching: isFetchingHistory } = useGetChatHistoryQuery(
    { sessionId: mostRecentSessionId! },
    { skip: !mostRecentSessionId }
  );

  // Streaming state - only for the current streaming message pair
  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null);
  const [input, setInput] = useState("");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentDocumentIdRef = useRef<string>(documentId);
  const dispatch = useDispatch();

  // Convert history data to messages - this is derived from RTK Query
  const historyMessages = useMemo((): Message[] => {
    if (!chatHistoryData?.messages) return [];
    return chatHistoryData.messages.map((msg, idx) => ({
      id: `history-${chatHistoryData.sessionId}-${idx}`,
      role: msg.role as "user" | "assistant",
      content: msg.content || "",
      sources: msg.sources?.map(s => ({
        page: s.page ?? 0,
        text: s.text ?? "",
        positions: s.positions?.map(p => ({
          pageNumber: p.pageNumber ?? 0,
          boundingBox: p.boundingBox ? {
            x: p.boundingBox.x ?? 0,
            y: p.boundingBox.y ?? 0,
            width: p.boundingBox.width ?? 0,
            height: p.boundingBox.height ?? 0,
          } : undefined,
          charOffset: p.charOffset ?? 0,
          charLength: p.charLength ?? 0,
          pageWidth: p.pageWidth ?? undefined,
          pageHeight: p.pageHeight ?? undefined,
        })),
        relevanceScore: s.relevanceScore ?? undefined,
      })),
    }));
  }, [chatHistoryData]);

  // Combined messages: history + streaming (if any)
  const messages = useMemo((): Message[] => {
    if (streamingMessage) {
      return [...historyMessages, streamingMessage.userMessage, streamingMessage.assistantMessage];
    }
    return historyMessages;
  }, [historyMessages, streamingMessage]);

  const { ask, isLoading, setSessionId } = useAskQuestion({
    onChunk: (chunk) => {
      // Ignore if document changed during streaming
      if (currentDocumentIdRef.current !== documentId) return;
      setStreamingMessage((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          assistantMessage: {
            ...prev.assistantMessage,
            content: prev.assistantMessage.content + chunk,
          },
        };
      });
    },
    onSources: (sources) => {
      if (currentDocumentIdRef.current !== documentId) return;
      setStreamingMessage((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          assistantMessage: {
            ...prev.assistantMessage,
            sources,
          },
        };
      });
    },
    onComplete: (result) => {
      if (currentDocumentIdRef.current !== documentId) return;
      // Mark as done streaming (but keep visible until cache is refreshed)
      setStreamingMessage((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          assistantMessage: {
            ...prev.assistantMessage,
            isStreaming: false,
          },
        };
      });
      if (result.sessionId) {
        setCurrentSessionId(result.sessionId);
        // Invalidate the chat cache so history is refetched
        // This will cause historyMessages to update, and we'll clear streamingMessage
        dispatch(api.util.invalidateTags(["Chat"]));
      }
    },
    onError: (error) => {
      if (currentDocumentIdRef.current !== documentId) return;
      setStreamingMessage((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          assistantMessage: {
            ...prev.assistantMessage,
            content: prev.assistantMessage.content || `Error: ${error}`,
            isStreaming: false,
          },
        };
      });
    },
  });

  // Sync session ID from history data
  useEffect(() => {
    if (chatHistoryData?.sessionId) {
      setCurrentSessionId(chatHistoryData.sessionId);
      setSessionId(chatHistoryData.sessionId);
    }
  }, [chatHistoryData?.sessionId, setSessionId]);

  // Clear streaming message when it appears in history (after refetch)
  useEffect(() => {
    if (streamingMessage && !streamingMessage.assistantMessage.isStreaming && chatHistoryData?.messages) {
      // Check if the streaming message content matches the last message in history
      const lastHistoryMessage = chatHistoryData.messages[chatHistoryData.messages.length - 1];
      if (lastHistoryMessage &&
          lastHistoryMessage.role === "assistant" &&
          lastHistoryMessage.content === streamingMessage.assistantMessage.content) {
        // History now contains our streamed message, clear the streaming state
        setStreamingMessage(null);
      }
    }
  }, [chatHistoryData?.messages, streamingMessage]);

  // Reset streaming state when document changes
  useEffect(() => {
    currentDocumentIdRef.current = documentId;
    setStreamingMessage(null);
    setCurrentSessionId(null);
    setSessionId(null);
  }, [documentId, setSessionId]);

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

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      isStreaming: true,
    };

    setStreamingMessage({ userMessage, assistantMessage });
    setInput("");

    // Pass existing session ID to maintain conversation context
    await ask(documentId, question, currentSessionId || undefined);
  };

  const isLoadingChat = isLoadingDoc || isFetchingSessions || (mostRecentSessionId && isFetchingHistory);

  if (isLoadingChat) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-muted/30">
      {/* Document Header */}
      <div className="border-b bg-white/50 backdrop-blur-sm px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary sm:w-6 sm:h-6"
            >
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-foreground text-sm sm:text-base truncate">
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
      <div className="flex-1 overflow-auto p-3 sm:p-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-2">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4 sm:mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary sm:w-9 sm:h-9"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">Start a Conversation</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 max-w-md">
              Ask questions about your document and get instant answers with source references
            </p>
            <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 max-w-lg w-full">
              <Card
                className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-primary/30 border-2 border-transparent bg-white"
                onClick={() =>
                  setInput("What are the main findings of this document?")
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    </div>
                    <p className="text-sm text-foreground font-medium text-left">
                      What are the main findings?
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card
                className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-accent/30 border-2 border-transparent bg-white"
                onClick={() => setInput("Summarize this document")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/></svg>
                    </div>
                    <p className="text-sm text-foreground font-medium text-left">
                      Summarize this document
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div className={`flex items-start gap-2 sm:gap-3 max-w-[90%] sm:max-w-[85%] ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 ${
                    message.role === "user"
                      ? "bg-gradient-to-br from-primary to-accent"
                      : "bg-gradient-to-br from-accent/80 to-primary/80"
                  }`}>
                    {message.role === "user" ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
                    )}
                  </div>
                  <div
                    className={`rounded-2xl px-4 py-3 shadow-sm ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-primary to-primary/90 text-white"
                        : "bg-white border border-border/50"
                    }`}
                  >
                    {message.content ? (
                      message.role === "assistant" ? (
                        <MarkdownContent content={message.content} isStreaming={message.isStreaming} />
                      ) : (
                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      )
                    ) : message.isStreaming ? (
                      <div className="flex space-x-2 py-1">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-primary/50" />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-primary/50 [animation-delay:0.1s]" />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-primary/50 [animation-delay:0.2s]" />
                      </div>
                    ) : null}

                    {message.sources && message.sources.length > 0 && (
                      <SourcesList
                        sources={message.sources}
                        onSourceClick={onSourceClick}
                        messageId={message.id}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t bg-white/80 backdrop-blur-sm px-6 py-4">
        <form onSubmit={handleSubmit} className="flex gap-3 max-w-3xl mx-auto">
          <div className="flex-1 relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about this document..."
              className="min-h-[52px] flex-1 resize-none pr-4 py-3.5 rounded-xl border-2 border-border/50 focus:border-primary/50 transition-colors bg-white shadow-sm"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="h-[52px] px-6 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          </Button>
        </form>
      </div>
    </div>
  );
}
