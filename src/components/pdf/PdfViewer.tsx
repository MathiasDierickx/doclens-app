"use client";

import { useEffect, useRef, useState } from "react";
import { Viewer, Worker, SpecialZoomLevel } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin, DefaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import {
  highlightPlugin,
  HighlightPlugin,
  MessageIcon,
  RenderHighlightContentProps,
  RenderHighlightTargetProps,
  RenderHighlightsProps,
} from "@react-pdf-viewer/highlight";
import { pageNavigationPlugin, PageNavigationPlugin } from "@react-pdf-viewer/page-navigation";
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

// Separate component for highlight content popup
function HighlightContentPopup({
  props,
  onHighlightCreate,
}: {
  props: RenderHighlightContentProps;
  onHighlightCreate?: (highlight: Omit<Highlight, "id">) => void;
}) {
  const [note, setNote] = useState("");

  const handleAdd = () => {
    if (props.highlightAreas && props.highlightAreas.length > 0) {
      onHighlightCreate?.({
        pageIndex: props.highlightAreas[0].pageIndex,
        content: note,
        highlightAreas: props.highlightAreas,
        quote: props.selectedText,
      });
    }
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

  // Store callbacks in refs so plugins can access latest values
  const onHighlightCreateRef = useRef(onHighlightCreate);
  const onHighlightClickRef = useRef(onHighlightClick);
  const highlightsRef = useRef(highlights);

  // Update refs when props change
  onHighlightCreateRef.current = onHighlightCreate;
  onHighlightClickRef.current = onHighlightClick;
  highlightsRef.current = highlights;

  // Track page changes
  const handlePageChange = (e: { currentPage: number }) => {
    onPageChange?.(e.currentPage);
  };

  // Create plugins once using refs (not useMemo to avoid hooks-inside-hooks issue)
  const pageNavPluginRef = useRef<PageNavigationPlugin | null>(null);
  const highlightPluginRef = useRef<HighlightPlugin | null>(null);
  const defaultLayoutPluginRef = useRef<DefaultLayoutPlugin | null>(null);

  // Lazy initialize plugins on first render only
  if (pageNavPluginRef.current === null) {
    pageNavPluginRef.current = pageNavigationPlugin();
  }

  if (highlightPluginRef.current === null) {
    highlightPluginRef.current = highlightPlugin({
      renderHighlightTarget: (props: RenderHighlightTargetProps) => (
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
      ),
      renderHighlightContent: (props: RenderHighlightContentProps) => (
        <HighlightContentPopup
          props={props}
          onHighlightCreate={onHighlightCreateRef.current}
        />
      ),
      renderHighlights: (props: RenderHighlightsProps) => (
        <div>
          {highlightsRef.current
            .filter((h) => h.highlightAreas?.some((a) => a.pageIndex === props.pageIndex))
            .map((highlight) => (
              <div key={highlight.id}>
                {highlight.highlightAreas
                  ?.filter((area) => area.pageIndex === props.pageIndex)
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
                      onClick={() => onHighlightClickRef.current?.(highlight)}
                      title={highlight.content || highlight.quote}
                    />
                  ))}
              </div>
            ))}
        </div>
      ),
    });
  }

  if (defaultLayoutPluginRef.current === null) {
    defaultLayoutPluginRef.current = defaultLayoutPlugin({
      sidebarTabs: (defaultTabs) => defaultTabs.length > 0 ? [defaultTabs[0]] : [],
    });
  }

  const { jumpToPage } = pageNavPluginRef.current;
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
          plugins={[
            defaultLayoutPluginRef.current,
            highlightPluginRef.current,
            pageNavPluginRef.current,
          ]}
          initialPage={initialPage}
          defaultScale={SpecialZoomLevel.PageWidth}
          onPageChange={handlePageChange}
          onDocumentLoad={() => setIsReady(true)}
        />
      </Worker>
    </div>
  );
}
