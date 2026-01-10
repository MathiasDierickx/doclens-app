"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Viewer, Worker, SpecialZoomLevel } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import {
  highlightPlugin,
  MessageIcon,
  RenderHighlightContentProps,
  RenderHighlightTargetProps,
  RenderHighlightsProps,
} from "@react-pdf-viewer/highlight";
import { pageNavigationPlugin } from "@react-pdf-viewer/page-navigation";
import { Button } from "@/components/ui/button";

import "@react-pdf-viewer/page-navigation/lib/styles/index.css";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import "@react-pdf-viewer/highlight/lib/styles/index.css";

export interface Highlight {
  id: string;
  pageIndex: number;
  content: string;
  highlightAreas: {
    pageIndex: number;
    height: number;
    width: number;
    left: number;
    top: number;
  }[];
  quote: string;
}

// Separate component for highlight content to avoid hooks-in-useMemo issue
function HighlightContentPopup({
  props,
  onHighlightCreate,
}: {
  props: RenderHighlightContentProps;
  onHighlightCreate?: (highlight: Omit<Highlight, "id">) => void;
}) {
  const [note, setNote] = useState("");

  const handleAdd = () => {
    onHighlightCreate?.({
      pageIndex: props.highlightAreas[0].pageIndex,
      content: note,
      highlightAreas: props.highlightAreas,
      quote: props.selectedText,
    });
    props.cancel();
  };

  return (
    <div
      className="absolute z-10 w-64 rounded-lg border bg-background p-3 shadow-lg"
      style={{
        left: `${props.selectionRegion.left}%`,
        top: `${props.selectionRegion.top + props.selectionRegion.height}%`,
        transform: "translateY(8px)",
      }}
    >
      <textarea
        className="mb-2 w-full rounded border p-2 text-sm"
        placeholder="Add a note..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={props.cancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleAdd}>
          Save
        </Button>
      </div>
    </div>
  );
}

interface PdfViewerProps {
  /** URL to the PDF file */
  fileUrl: string;
  /** Initial page to display (0-indexed) */
  initialPage?: number;
  /** Current page to navigate to (0-indexed) */
  currentPage?: number;
  /** Trigger to force navigation even to the same page */
  navigationTrigger?: number;
  /** Callback when page changes */
  onPageChange?: (pageIndex: number) => void;
  /** Callback when a highlight is created */
  onHighlightCreate?: (highlight: Omit<Highlight, "id">) => void;
  /** Existing highlights to display */
  highlights?: Highlight[];
  /** Callback when a highlight is clicked */
  onHighlightClick?: (highlight: Highlight) => void;
}

export function PdfViewer({
  fileUrl,
  initialPage = 0,
  currentPage,
  navigationTrigger,
  onPageChange,
  onHighlightCreate,
  highlights = [],
  onHighlightClick,
}: PdfViewerProps) {
  const [isReady, setIsReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track page changes
  const handlePageChange = (e: { currentPage: number }) => {
    onPageChange?.(e.currentPage);
  };

  // Render highlight target (the button that appears when selecting text)
  const renderHighlightTarget = (props: RenderHighlightTargetProps) => (
    <div
      className="absolute z-10 flex items-center gap-1 rounded-md bg-primary p-1 shadow-lg"
      style={{
        left: `${props.selectionRegion.left}%`,
        top: `${props.selectionRegion.top + props.selectionRegion.height}%`,
        transform: "translateY(8px)",
      }}
    >
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-2 text-xs text-primary-foreground hover:bg-primary/80"
        onClick={props.toggle}
      >
        <MessageIcon /> Add Note
      </Button>
    </div>
  );

  // Store onHighlightCreate in a ref so we can access it in the render function
  const onHighlightCreateRef = useRef(onHighlightCreate);
  onHighlightCreateRef.current = onHighlightCreate;

  // Render highlight content (popup when editing a highlight)
  const renderHighlightContent = useCallback(
    (props: RenderHighlightContentProps) => (
      <HighlightContentPopup props={props} onHighlightCreate={onHighlightCreateRef.current} />
    ),
    []
  );

  // Render existing highlights
  const renderHighlights = useCallback((props: RenderHighlightsProps) => (
    <div>
      {highlights
        .filter((h) => h.highlightAreas.some((a) => a.pageIndex === props.pageIndex))
        .map((highlight) => (
          <div key={highlight.id}>
            {highlight.highlightAreas
              .filter((area) => area.pageIndex === props.pageIndex)
              .map((area, idx) => (
                <div
                  key={idx}
                  className="absolute cursor-pointer bg-yellow-300/40 transition-colors hover:bg-yellow-300/60"
                  style={{
                    left: `${area.left}%`,
                    top: `${area.top}%`,
                    width: `${area.width}%`,
                    height: `${area.height}%`,
                  }}
                  onClick={() => onHighlightClick?.(highlight)}
                  title={highlight.content || highlight.quote}
                />
              ))}
          </div>
        ))}
    </div>
  ), [highlights, onHighlightClick]);

  // Initialize plugins - memoize to prevent recreation on every render
  const pageNavigationPluginInstance = useMemo(() => pageNavigationPlugin(), []);
  const { jumpToPage } = pageNavigationPluginInstance;

  const highlightPluginInstance = useMemo(() => highlightPlugin({
    renderHighlightTarget,
    renderHighlightContent,
    renderHighlights,
  }), [renderHighlightContent, renderHighlights]);

  const defaultLayoutPluginInstance = useMemo(() => defaultLayoutPlugin({
    sidebarTabs: (defaultTabs) => [defaultTabs[0]], // Only thumbnails tab
  }), []);

  // Store jumpToPage in a ref so we can use it in effects without dependency issues
  const jumpToPageRef = useRef(jumpToPage);
  jumpToPageRef.current = jumpToPage;

  // Navigate to page when ready or when currentPage/navigationTrigger changes
  useEffect(() => {
    if (!isReady || currentPage === undefined) return;

    // Small delay to ensure PDF layout is complete after becoming visible
    const timeoutId = setTimeout(() => {
      jumpToPageRef.current(currentPage);
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [currentPage, navigationTrigger, isReady]);

  return (
    <div ref={containerRef} className="h-full w-full">
      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
        <Viewer
          fileUrl={fileUrl}
          plugins={[defaultLayoutPluginInstance, highlightPluginInstance, pageNavigationPluginInstance]}
          initialPage={initialPage}
          defaultScale={SpecialZoomLevel.PageWidth}
          onPageChange={handlePageChange}
          onDocumentLoad={() => setIsReady(true)}
        />
      </Worker>
    </div>
  );
}
