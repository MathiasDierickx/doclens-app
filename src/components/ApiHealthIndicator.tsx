"use client";

import { useGetHealthQuery } from "@/store/api/generatedApi";

interface ApiHealthIndicatorProps {
  compact?: boolean;
}

export function ApiHealthIndicator({ compact = false }: ApiHealthIndicatorProps) {
  const { data, isLoading, isError } = useGetHealthQuery();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground" title="Connecting...">
        <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
        {!compact && <span>Connecting...</span>}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive" title="API Offline">
        <div className="h-2 w-2 rounded-full bg-red-500" />
        {!compact && <span>API Offline</span>}
      </div>
    );
  }

  if (data?.status === "Healthy") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground" title="API Online">
        <div className="h-2 w-2 rounded-full bg-green-500" />
        {!compact && <span>API Online</span>}
      </div>
    );
  }

  return null;
}
