"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { ChatArea, SourceReference } from "@/components/ChatArea";
import { PdfViewer, Highlight } from "@/components/pdf/PdfViewer";
import { SplitView } from "@/components/layout/SplitView";
import { BottomSheet } from "@/components/layout/BottomSheet";
import { useGetDocumentQuery, useGetDownloadUrlQuery } from "@/store/api/generatedApi";
import { Button } from "@/components/ui/button";
import { FileText, X } from "lucide-react";

interface PdfPanelProps {
  isLoading: boolean;
  pdfUrl: string;
  isMobile: boolean;
  documentId: string;
  currentPage: number;
  navigationTrigger: number;
  highlights: Highlight[];
  onPageChange: (page: number) => void;
  onHighlightCreate: (highlight: Omit<Highlight, "id">) => void;
  onHighlightClick: (highlight: Highlight) => void;
  onClose: () => void;
  onDocumentReady: () => void;
}

function PdfPanel({
  isLoading,
  pdfUrl,
  isMobile,
  documentId,
  currentPage,
  navigationTrigger,
  highlights,
  onPageChange,
  onHighlightCreate,
  onHighlightClick,
  onClose,
  onDocumentReady,
}: PdfPanelProps) {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading PDF...</p>
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">No PDF available</p>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* Close button (desktop only) */}
      {!isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 z-10"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      <PdfViewer
        key={documentId}
        fileUrl={pdfUrl}
        currentPage={currentPage}
        navigationTrigger={navigationTrigger}
        onPageChange={onPageChange}
        highlights={highlights}
        onHighlightCreate={onHighlightCreate}
        onHighlightClick={onHighlightClick}
        onDocumentReady={onDocumentReady}
      />
    </div>
  );
}

interface DocumentViewerProps {
  documentId: string;
}

export function DocumentViewer({ documentId }: DocumentViewerProps) {
  const { data: document } = useGetDocumentQuery({ documentId });
  const { data: downloadUrlData, isLoading: isLoadingUrl } = useGetDownloadUrlQuery({ documentId });
  const isMobile = useMediaQuery("(max-width: 768px)");

  // PDF viewer state
  const [pdfVisible, setPdfVisible] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [navigationTrigger, setNavigationTrigger] = useState(0); // Force re-navigation
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [sheetState, setSheetState] = useState<"collapsed" | "half" | "expanded">(
    "collapsed"
  );

  // Pending navigation when PDF is opening
  const pendingNavigationRef = useRef<{
    page: number;
    highlights: Highlight[];
  } | null>(null);

  // Wrapper to validate page numbers before setting
  const setCurrentPageWithValidation = useCallback((page: number | ((prev: number) => number)) => {
    // Validate page number before setting
    if (typeof page === 'number') {
      if (page < 0 || page >= 10000) {
        return; // Don't set invalid page numbers
      }
    }
    setCurrentPage(page);
  }, []);

  // Handle source click from chat - navigate to page and highlight regions
  const handleSourceClick = useCallback((source: SourceReference) => {
    console.log("Source clicked:", source);
    console.log("Positions:", source.positions);
    console.log("PDF visible:", pdfVisible, "PDF ready:", pdfReady);

    // Determine target page and highlights
    let targetPageIndex = source.page - 1;
    let newHighlights: Highlight[] = [];

    // Convert source positions to PDF highlights
    if (source.positions && source.positions.length > 0) {
      const validPositions = source.positions.filter((pos) => pos.boundingBox);

      if (validPositions.length > 0) {
        targetPageIndex = validPositions[0].pageNumber - 1;

        const newHighlight: Highlight = {
          id: `source-${Date.now()}`,
          pageIndex: targetPageIndex,
          content: "",
          quote: source.text,
          highlightAreas: validPositions.map((pos) => {
            // Use actual page dimensions from backend, fallback to US Letter
            const pageWidth = pos.pageWidth ?? 8.5;
            const pageHeight = pos.pageHeight ?? 11;

            return {
              pageIndex: pos.pageNumber - 1,
              // Convert from inches to percentage of page
              left: (pos.boundingBox!.x / pageWidth) * 100,
              top: (pos.boundingBox!.y / pageHeight) * 100,
              width: (pos.boundingBox!.width / pageWidth) * 100,
              height: (pos.boundingBox!.height / pageHeight) * 100,
            };
          }),
        };

        console.log("Created highlight:", newHighlight);
        newHighlights = [newHighlight];
      }
    }

    // If PDF is not visible or not ready, store pending navigation
    if (!pdfVisible || !pdfReady) {
      console.log("PDF not ready, storing pending navigation to page:", targetPageIndex);
      pendingNavigationRef.current = {
        page: targetPageIndex,
        highlights: newHighlights,
      };

      // Open the PDF
      setPdfVisible(true);
      if (isMobile) {
        setSheetState("half");
      }

      // Reset pdfReady since we're opening (or reopening) the PDF
      setPdfReady(false);
    } else {
      // PDF is already visible and ready, navigate immediately
      setCurrentPageWithValidation(targetPageIndex);
      setNavigationTrigger((n) => n + 1);

      if (newHighlights.length > 0) {
        setHighlights((prev) => {
          const filtered = prev.filter((h) => !h.id.startsWith("source-"));
          const updated = [...filtered, ...newHighlights];
          console.log("Updated highlights:", updated);
          return updated;
        });
      }
    }
  }, [isMobile, pdfVisible, pdfReady, setCurrentPageWithValidation]);

  // Handle PDF document ready - apply pending navigation
  const handleDocumentReady = useCallback(() => {
    console.log("PDF document ready");
    setPdfReady(true);

    // Apply pending navigation if any
    if (pendingNavigationRef.current) {
      const { page, highlights: pendingHighlights } = pendingNavigationRef.current;
      console.log("Applying pending navigation to page:", page);

      // Small delay to ensure the PDF viewer is fully initialized
      setTimeout(() => {
        setCurrentPageWithValidation(page);
        setNavigationTrigger((n) => n + 1);

        if (pendingHighlights.length > 0) {
          setHighlights((prev) => {
            const filtered = prev.filter((h) => !h.id.startsWith("source-"));
            return [...filtered, ...pendingHighlights];
          });
        }

        // Clear pending navigation
        pendingNavigationRef.current = null;
      }, 100);
    }
  }, [setCurrentPageWithValidation]);

  // Handle highlight creation
  const handleHighlightCreate = useCallback(
    (highlight: Omit<Highlight, "id">) => {
      const newHighlight: Highlight = {
        ...highlight,
        id: crypto.randomUUID(),
      };
      setHighlights((prev) => [...prev, newHighlight]);
    },
    []
  );

  // Handle highlight click
  const handleHighlightClick = useCallback((highlight: Highlight) => {
    // Could show a dialog or navigate to the related chat message
    console.log("Highlight clicked:", highlight);
  }, []);

  // Memoize PDF URL to prevent unnecessary re-fetches
  const pdfUrl = useMemo(() => downloadUrlData?.downloadUrl || "", [downloadUrlData?.downloadUrl]);

  // Chat panel with PDF toggle button
  const chatPanel = (
    <div className="relative h-full">
      <ChatArea
        documentId={documentId}
        onSourceClick={handleSourceClick}
      />

      {/* PDF Toggle Button (desktop only, when PDF is hidden) */}
      {!isMobile && !pdfVisible && pdfUrl && (
        <Button
          className="absolute bottom-20 right-6 shadow-lg"
          onClick={() => setPdfVisible(true)}
        >
          <FileText className="mr-2 h-4 w-4" />
          View PDF
        </Button>
      )}
    </div>
  );

  const handleClosePdf = useCallback(() => {
    setPdfVisible(false);
    setPdfReady(false); // Reset ready state when closing
  }, []);

  const pdfPanel = (
    <PdfPanel
      isLoading={isLoadingUrl}
      pdfUrl={pdfUrl}
      isMobile={isMobile}
      documentId={documentId}
      currentPage={currentPage}
      navigationTrigger={navigationTrigger}
      highlights={highlights}
      onPageChange={setCurrentPageWithValidation}
      onHighlightCreate={handleHighlightCreate}
      onHighlightClick={handleHighlightClick}
      onClose={handleClosePdf}
      onDocumentReady={handleDocumentReady}
    />
  );

  // Mobile layout with bottom sheet
  if (isMobile) {
    return (
      <BottomSheet
        mainContent={chatPanel}
        sheetContent={pdfPanel}
        sheetTitle={document?.filename || "Document"}
        state={sheetState}
        onStateChange={setSheetState}
      />
    );
  }

  // Desktop layout with split view
  return (
    <SplitView
      leftPanel={chatPanel}
      rightPanel={pdfPanel}
      rightPanelVisible={pdfVisible}
      initialRatio={0.5}
      minPanelWidth={350}
    />
  );
}
