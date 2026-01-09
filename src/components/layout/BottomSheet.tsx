"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  ReactNode,
  TouchEvent,
} from "react";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type SheetState = "collapsed" | "half" | "expanded";

interface BottomSheetProps {
  /** Main content (visible when sheet is collapsed) */
  mainContent: ReactNode;
  /** Sheet content (the PDF viewer) */
  sheetContent: ReactNode;
  /** Title for the sheet header */
  sheetTitle?: string;
  /** Current state of the sheet */
  state?: SheetState;
  /** Callback when state changes */
  onStateChange?: (state: SheetState) => void;
  /** Class name for the container */
  className?: string;
}

const SHEET_HEIGHTS: Record<SheetState, number> = {
  collapsed: 0,
  half: 50,
  expanded: 90,
};

const COLLAPSED_HANDLE_HEIGHT = 48; // Height of the handle when collapsed

export function BottomSheet({
  mainContent,
  sheetContent,
  sheetTitle = "Document",
  state: controlledState,
  onStateChange,
  className,
}: BottomSheetProps) {
  const [internalState, setInternalState] = useState<SheetState>("collapsed");
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const state = controlledState ?? internalState;
  const setState = (newState: SheetState) => {
    if (controlledState === undefined) {
      setInternalState(newState);
    }
    onStateChange?.(newState);
  };

  const currentHeight = SHEET_HEIGHTS[state];

  // Calculate display height including drag offset
  const displayHeight = isDragging
    ? Math.max(0, Math.min(90, startHeightRef.current - dragOffset))
    : currentHeight;

  // Touch handlers for drag gestures
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      setIsDragging(true);
      startYRef.current = e.touches[0].clientY;
      startHeightRef.current = SHEET_HEIGHTS[state];
    },
    [state]
  );

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!containerRef.current) return;

    const containerHeight = containerRef.current.getBoundingClientRect().height;
    const deltaY = e.touches[0].clientY - startYRef.current;
    const deltaPercent = (deltaY / containerHeight) * 100;

    setDragOffset(deltaPercent);
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);

    // Determine final state based on display height
    const finalHeight = startHeightRef.current - dragOffset;

    if (finalHeight < 20) {
      setState("collapsed");
    } else if (finalHeight < 70) {
      setState("half");
    } else {
      setState("expanded");
    }

    setDragOffset(0);
  }, [dragOffset]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && state !== "collapsed") {
        setState("collapsed");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state]);

  const cycleState = () => {
    const states: SheetState[] = ["collapsed", "half", "expanded"];
    const currentIndex = states.indexOf(state);
    const nextIndex = (currentIndex + 1) % states.length;
    setState(states[nextIndex]);
  };

  return (
    <div ref={containerRef} className={cn("relative flex h-full flex-col", className)}>
      {/* Main Content Area */}
      <div
        className="flex-1 overflow-hidden transition-all duration-300"
        style={{
          height:
            state === "collapsed"
              ? `calc(100% - ${COLLAPSED_HANDLE_HEIGHT}px)`
              : `${100 - displayHeight}%`,
        }}
      >
        {mainContent}
      </div>

      {/* Bottom Sheet */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 flex flex-col rounded-t-2xl border-t bg-background shadow-lg",
          !isDragging && "transition-all duration-300"
        )}
        style={{
          height:
            state === "collapsed"
              ? `${COLLAPSED_HANDLE_HEIGHT}px`
              : `${displayHeight}%`,
        }}
      >
        {/* Drag Handle */}
        <div
          className="flex cursor-grab items-center justify-center py-2 active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={state === "collapsed" ? () => setState("half") : undefined}
        >
          <div className="h-1 w-12 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Sheet Header */}
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">📄</span>
            <span className="font-medium">{sheetTitle}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={cycleState}
            >
              {state === "expanded" ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
            {state !== "collapsed" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setState("collapsed")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Sheet Content */}
        <div className="flex-1 overflow-hidden">
          {state !== "collapsed" && sheetContent}
        </div>
      </div>
    </div>
  );
}
