"use client";

import { useGetHealthQuery } from "@/store/api/generatedApi";

export function ApiHealthIndicator() {
  const { data, isLoading, isError, error } = useGetHealthQuery();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
        <span>Connecting...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <div className="h-2 w-2 rounded-full bg-red-500" />
        <span>API Offline</span>
      </div>
    );
  }

  if (data?.status === "Healthy") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-green-500" />
        <span>API Online</span>
      </div>
    );
  }

  return null;
}
