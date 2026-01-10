"use client";

import { useEffect, useState, useCallback } from "react";
import { ApiHealthIndicator } from "@/components/ApiHealthIndicator";
import { Sidebar } from "@/components/Sidebar";
import { UploadArea } from "@/components/UploadArea";
import { DocumentViewer } from "@/components/DocumentViewer";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState(0); // Key to force UploadArea reset
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Read document ID from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const docId = params.get("doc");
    if (docId) {
      setSelectedDocumentId(docId);
    }
  }, []);

  // Close sidebar when switching to desktop
  useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  // Update URL when document changes
  const handleSelectDocument = useCallback((documentId: string | null) => {
    setSelectedDocumentId(documentId);
    // Close sidebar on mobile when selecting a document
    setSidebarOpen(false);

    // If going back to upload area, increment key to reset the component
    if (documentId === null) {
      setUploadKey((k) => k + 1);
    }

    const url = new URL(window.location.href);
    if (documentId) {
      url.searchParams.set("doc", documentId);
    } else {
      url.searchParams.delete("doc");
    }
    window.history.pushState({}, "", url.toString());
  }, []);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Hidden on mobile unless opened */}
      <div
        className={`
          ${isMobile ? "fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out" : ""}
          ${isMobile && !sidebarOpen ? "-translate-x-full" : "translate-x-0"}
        `}
      >
        <Sidebar
          selectedDocumentId={selectedDocumentId}
          onSelectDocument={handleSelectDocument}
          onClose={isMobile ? () => setSidebarOpen(false) : undefined}
          isMobile={isMobile}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b border-border/50 px-3 sm:px-6 py-2 sm:py-3 bg-white/80 backdrop-blur-sm safe-top">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {/* Mobile Menu Button */}
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-9 w-9"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              )}
              {/* DocLens Logo */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="sm:w-5 sm:h-5"
                  >
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <circle cx="11.5" cy="14.5" r="2.5" />
                    <path d="M13.3 16.3 15 18" />
                  </svg>
                </div>
                <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent truncate">
                  DocLens
                </h1>
              </div>
              <div className="hidden sm:block h-6 w-px bg-border/50" />
              <div className="hidden sm:block">
                <ApiHealthIndicator />
              </div>
            </div>
            {/* Mobile: show API indicator on the right */}
            {isMobile && (
              <div className="shrink-0">
                <ApiHealthIndicator compact />
              </div>
            )}
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-hidden">
          {selectedDocumentId ? (
            <DocumentViewer documentId={selectedDocumentId} />
          ) : (
            <UploadArea key={uploadKey} onUploadComplete={handleSelectDocument} />
          )}
        </main>
      </div>
    </div>
  );
}
