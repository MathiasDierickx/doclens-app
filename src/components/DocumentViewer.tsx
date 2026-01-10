"use client";

import { useState, useCallback, useMemo } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { ChatArea, SourceReference } from "@/components/ChatArea";
import { PdfViewer, Highlight } from "@/components/pdf/PdfViewer";
import { SplitView } from "@/components/layout/SplitView";
import { BottomSheet } from "@/components/layout/BottomSheet";
import { useGetDocumentQuery, useGetDownloadUrlQuery } from "@/store/api/generatedApi";
import { Button } from "@/components/ui/button";
import { FileText, X } from "lucide-react";

interface DocumentViewerProps {
  documentId: string;
}

export function DocumentViewer({ documentId }: DocumentViewerProps) {
  const { data: document } = useGetDocumentQuery({ documentId });
  const { data: downloadUrlData, isLoading: isLoadingUrl } = useGetDownloadUrlQuery({ documentId });
  const isMobile = useMediaQuery("(max-width: 768px)");

  // PDF viewer state
  const [pdfVisible, setPdfVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [sheetState, setSheetState] = useState<"collapsed" | "half" | "expanded">(
    "collapsed"
  );

  // Handle source click from chat - navigate to page and highlight regions
  const handleSourceClick = useCallback((source: SourceReference) => {
    setPdfVisible(true);
    if (isMobile) {
      setSheetState("half");
    }

    // Convert source positions to PDF highlights
    if (source.positions && source.positions.length > 0) {
      const validPositions = source.positions.filter((pos) => pos.boundingBox);

      if (validPositions.length > 0) {
        // Navigate to the first position's page (0-indexed)
        const targetPageIndex = validPositions[0].pageNumber - 1;
        setCurrentPage(targetPageIndex);

        const newHighlight: Highlight = {
          id: `source-${Date.now()}`,
          pageIndex: targetPageIndex,
          content: "",
          quote: source.text,
          highlightAreas: validPositions.map((pos) => ({
            pageIndex: pos.pageNumber - 1,
            // Convert from inches to percentage of page
            // The bounding box from Document Intelligence is in inches
            // Using standard US Letter page size (8.5 x 11 inches)
            left: (pos.boundingBox!.x / 8.5) * 100,
            top: (pos.boundingBox!.y / 11) * 100,
            width: (pos.boundingBox!.width / 8.5) * 100,
            height: (pos.boundingBox!.height / 11) * 100,
          })),
        };

        // Replace existing source highlights with new one
        setHighlights((prev) => {
          const filtered = prev.filter((h) => !h.id.startsWith("source-"));
          return [...filtered, newHighlight];
        });
      } else {
        // Fallback: navigate to source.page if no valid positions
        setCurrentPage(source.page - 1);
      }
    } else {
      // No positions available, just navigate to the page
      setCurrentPage(source.page - 1);
    }
  }, [isMobile]);

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

  // PDF panel with close button
  const pdfPanel = isLoadingUrl ? (
    <div className="flex h-full items-center justify-center">
      <p className="text-muted-foreground">Loading PDF...</p>
    </div>
  ) : pdfUrl ? (
    <div className="relative h-full">
      {/* Close button (desktop only) */}
      {!isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 z-10"
          onClick={() => setPdfVisible(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      <PdfViewer
        key={documentId}
        fileUrl={pdfUrl}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        highlights={highlights}
        onHighlightCreate={handleHighlightCreate}
        onHighlightClick={handleHighlightClick}
      />
    </div>
  ) : (
    <div className="flex h-full items-center justify-center">
      <p className="text-muted-foreground">No PDF available</p>
    </div>
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
