"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Viewer, Worker, SpecialZoomLevel } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { pageNavigationPlugin } from "@react-pdf-viewer/page-navigation";

import "@react-pdf-viewer/page-navigation/lib/styles/index.css";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

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
  // Highlight functionality temporarily disabled due to library bug
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onHighlightCreate,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  highlights = [],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onHighlightClick,
}: PdfViewerProps) {
  const [isReady, setIsReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track page changes
  const handlePageChange = (e: { currentPage: number }) => {
    onPageChange?.(e.currentPage);
  };

  // Initialize plugins once
  const pageNavigationPluginInstance = useMemo(() => pageNavigationPlugin(), []);
  const { jumpToPage } = pageNavigationPluginInstance;

  const defaultLayoutPluginInstance = useMemo(() => defaultLayoutPlugin({
    sidebarTabs: (defaultTabs) => defaultTabs?.length > 0 ? [defaultTabs[0]] : [], // Only thumbnails tab
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
          plugins={[defaultLayoutPluginInstance, pageNavigationPluginInstance]}
          initialPage={initialPage}
          defaultScale={SpecialZoomLevel.PageWidth}
          onPageChange={handlePageChange}
          onDocumentLoad={() => setIsReady(true)}
        />
      </Worker>
    </div>
  );
}
