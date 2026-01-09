"use client";

import { useState, useCallback } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { ChatArea } from "@/components/ChatArea";
import { PdfViewer, Highlight } from "@/components/pdf/PdfViewer";
import { SplitView } from "@/components/layout/SplitView";
import { BottomSheet } from "@/components/layout/BottomSheet";
import { useGetDocumentQuery } from "@/store/api/generatedApi";
import { Button } from "@/components/ui/button";
import { FileText, X } from "lucide-react";

interface DocumentViewerProps {
  documentId: string;
}

export function DocumentViewer({ documentId }: DocumentViewerProps) {
  const { data: document } = useGetDocumentQuery({ documentId });
  const isMobile = useMediaQuery("(max-width: 768px)");

  // PDF viewer state
  const [pdfVisible, setPdfVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [sheetState, setSheetState] = useState<"collapsed" | "half" | "expanded">(
    "collapsed"
  );

  // Handle page navigation from chat (when user clicks a source)
  const handleNavigateToPage = useCallback((pageIndex: number) => {
    setCurrentPage(pageIndex);
    setPdfVisible(true);
    if (isMobile) {
      setSheetState("half");
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

  // Get PDF URL from document
  // TODO: Backend needs to return a SAS URL for viewing the PDF
  // For now, we construct a potential URL pattern that will need to be implemented
  const pdfUrl = document?.documentId
    ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:7071/api"}/documents/${document.documentId}/content`
    : "";

  // Chat panel with PDF toggle button
  const chatPanel = (
    <div className="relative h-full">
      <ChatArea
        documentId={documentId}
        onSourceClick={handleNavigateToPage}
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
  const pdfPanel = pdfUrl ? (
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
