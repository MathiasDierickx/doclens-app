"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
  fileUrl: string;
  initialPage?: number;
  currentPage?: number;
  navigationTrigger?: number;
  onPageChange?: (pageIndex: number) => void;
  onHighlightCreate?: (highlight: Omit<Highlight, "id">) => void;
  highlights?: Highlight[];
  onHighlightClick?: (highlight: Highlight) => void;
}

// Custom highlight overlay component that renders on top of PDF pages
function HighlightOverlay({
  highlights,
  currentPageIndex,
  onHighlightClick,
}: {
  highlights: Highlight[];
  currentPageIndex: number;
  onHighlightClick?: (highlight: Highlight) => void;
}) {
  // Filter highlights for current page
  const pageHighlights = highlights.filter((h) =>
    h.highlightAreas?.some((a) => a.pageIndex === currentPageIndex)
  );

  if (pageHighlights.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      {pageHighlights.map((highlight) =>
        highlight.highlightAreas
          ?.filter((area) => area.pageIndex === currentPageIndex)
          .map((area, idx) => (
            <div
              key={`${highlight.id}-${idx}`}
              onClick={() => onHighlightClick?.(highlight)}
              title={highlight.content || highlight.quote}
              style={{
                position: "absolute",
                left: `${area.left}%`,
                top: `${area.top}%`,
                width: `${area.width}%`,
                height: `${area.height}%`,
                backgroundColor: "rgba(255, 235, 59, 0.5)",
                border: "2px solid rgba(255, 193, 7, 0.8)",
                borderRadius: "2px",
                cursor: "pointer",
                pointerEvents: "auto",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 235, 59, 0.7)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 235, 59, 0.5)";
              }}
            />
          ))
      )}
    </div>
  );
}

export function PdfViewer({
  fileUrl,
  initialPage = 0,
  currentPage,
  navigationTrigger,
  onPageChange,
  highlights = [],
  onHighlightClick,
}: PdfViewerProps) {
  const [isReady, setIsReady] = useState(false);
  const [visiblePageIndex, setVisiblePageIndex] = useState(initialPage);
  const containerRef = useRef<HTMLDivElement>(null);
  const jumpToPageRef = useRef<((pageIndex: number) => void) | null>(null);

  // Create plugins
  const pageNav = pageNavigationPlugin();
  const defaultLayout = defaultLayoutPlugin({
    sidebarTabs: (defaultTabs) => defaultTabs?.length > 0 ? [defaultTabs[0]] : [],
  });

  // Update jumpToPage ref
  useEffect(() => {
    jumpToPageRef.current = pageNav.jumpToPage;
  }, [pageNav]);

  // Navigate to page when ready or when currentPage/navigationTrigger changes
  useEffect(() => {
    if (!isReady || currentPage === undefined || !jumpToPageRef.current) return;

    if (currentPage < 0) {
      return;
    }

    const timeoutId = setTimeout(() => {
      jumpToPageRef.current?.(currentPage);
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [currentPage, navigationTrigger, isReady]);

  // Track page changes
  const handlePageChange = useCallback((e: { currentPage: number }) => {
    if (e.currentPage >= 0 && e.currentPage < 10000 && isReady) {
      setVisiblePageIndex(e.currentPage);
      onPageChange?.(e.currentPage);
    }
  }, [isReady, onPageChange]);

  // Inject highlight overlays into page layers after render
  useEffect(() => {
    if (!isReady || highlights.length === 0) return;

    // Find all page layers in the PDF viewer
    const injectHighlights = () => {
      const pageContainers = containerRef.current?.querySelectorAll('.rpv-core__page-layer');

      pageContainers?.forEach((pageContainer, index) => {
        // Remove any existing highlight overlays
        const existingOverlay = pageContainer.querySelector('.custom-highlight-overlay');
        if (existingOverlay) {
          existingOverlay.remove();
        }

        // Get highlights for this page
        const pageHighlights = highlights.filter((h) =>
          h.highlightAreas?.some((a) => a.pageIndex === index)
        );

        if (pageHighlights.length === 0) return;

        // Create overlay container
        const overlay = document.createElement('div');
        overlay.className = 'custom-highlight-overlay';
        overlay.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 10;';

        // Add highlight rectangles
        pageHighlights.forEach((highlight) => {
          highlight.highlightAreas
            ?.filter((area) => area.pageIndex === index)
            .forEach((area, idx) => {
              const rect = document.createElement('div');
              rect.style.cssText = `
                position: absolute;
                left: ${area.left}%;
                top: ${area.top}%;
                width: ${area.width}%;
                height: ${area.height}%;
                background-color: rgba(255, 235, 59, 0.5);
                border: 2px solid rgba(255, 193, 7, 0.8);
                border-radius: 2px;
                cursor: pointer;
                pointer-events: auto;
                transition: background-color 0.2s;
              `;
              rect.title = highlight.content || highlight.quote || '';

              rect.addEventListener('mouseenter', () => {
                rect.style.backgroundColor = 'rgba(255, 235, 59, 0.7)';
              });
              rect.addEventListener('mouseleave', () => {
                rect.style.backgroundColor = 'rgba(255, 235, 59, 0.5)';
              });
              rect.addEventListener('click', () => {
                onHighlightClick?.(highlight);
              });

              overlay.appendChild(rect);
            });
        });

        // Make page container position relative if not already
        const computedStyle = window.getComputedStyle(pageContainer);
        if (computedStyle.position === 'static') {
          (pageContainer as HTMLElement).style.position = 'relative';
        }

        pageContainer.appendChild(overlay);
      });
    };

    // Run immediately and also after a short delay to catch any late renders
    injectHighlights();
    const timeoutId = setTimeout(injectHighlights, 100);
    const timeoutId2 = setTimeout(injectHighlights, 500);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(timeoutId2);
    };
  }, [isReady, highlights, onHighlightClick, visiblePageIndex]);

  return (
    <div ref={containerRef} className="h-full w-full">
      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
        <Viewer
          fileUrl={fileUrl}
          plugins={[defaultLayout, pageNav]}
          initialPage={initialPage}
          defaultScale={SpecialZoomLevel.PageWidth}
          onPageChange={handlePageChange}
          onDocumentLoad={() => setIsReady(true)}
        />
      </Worker>
    </div>
  );
}
