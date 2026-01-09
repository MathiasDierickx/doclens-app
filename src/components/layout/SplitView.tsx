"use client";

import { useState, useRef, useCallback, useEffect, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SplitViewProps {
  /** Left panel content (typically chat) */
  leftPanel: ReactNode;
  /** Right panel content (typically PDF viewer) */
  rightPanel: ReactNode;
  /** Initial split ratio (0-1, default 0.5) */
  initialRatio?: number;
  /** Minimum panel width in pixels */
  minPanelWidth?: number;
  /** Whether the right panel is visible */
  rightPanelVisible?: boolean;
  /** Callback when split ratio changes */
  onRatioChange?: (ratio: number) => void;
  /** Class name for the container */
  className?: string;
}

export function SplitView({
  leftPanel,
  rightPanel,
  initialRatio = 0.5,
  minPanelWidth = 300,
  rightPanelVisible = true,
  onRatioChange,
  className,
}: SplitViewProps) {
  const [splitRatio, setSplitRatio] = useState(initialRatio);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const mouseX = e.clientX - containerRect.left;

      // Calculate new ratio with min/max constraints
      const minRatio = minPanelWidth / containerWidth;
      const maxRatio = 1 - minRatio;
      const newRatio = Math.max(minRatio, Math.min(maxRatio, mouseX / containerWidth));

      setSplitRatio(newRatio);
      onRatioChange?.(newRatio);
    },
    [isDragging, minPanelWidth, onRatioChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse listeners when dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      // Prevent text selection while dragging
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // When right panel is hidden, left panel takes full width
  if (!rightPanelVisible) {
    return (
      <div className={cn("flex h-full w-full", className)}>
        <div className="h-full w-full">{leftPanel}</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("flex h-full w-full", className)}>
      {/* Left Panel */}
      <div
        className="h-full overflow-hidden"
        style={{ width: `${splitRatio * 100}%` }}
      >
        {leftPanel}
      </div>

      {/* Resizer */}
      <div
        className={cn(
          "relative flex h-full w-1 cursor-col-resize items-center justify-center bg-border transition-colors",
          "hover:bg-primary/50",
          isDragging && "bg-primary"
        )}
        onMouseDown={handleMouseDown}
      >
        {/* Drag handle indicator */}
        <div
          className={cn(
            "absolute h-8 w-4 rounded-full bg-muted-foreground/20 transition-all",
            "hover:bg-muted-foreground/40",
            isDragging && "bg-muted-foreground/60 scale-110"
          )}
        />
      </div>

      {/* Right Panel */}
      <div
        className="h-full overflow-hidden"
        style={{ width: `${(1 - splitRatio) * 100}%` }}
      >
        {rightPanel}
      </div>
    </div>
  );
}
