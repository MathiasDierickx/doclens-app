"use client";

import { useEffect, useState, useCallback } from "react";
import { ApiHealthIndicator } from "@/components/ApiHealthIndicator";
import { Sidebar } from "@/components/Sidebar";
import { UploadArea } from "@/components/UploadArea";
import { DocumentViewer } from "@/components/DocumentViewer";

export default function Home() {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState(0); // Key to force UploadArea reset

  // Read document ID from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const docId = params.get("doc");
    if (docId) {
      setSelectedDocumentId(docId);
    }
  }, []);

  // Update URL when document changes
  const handleSelectDocument = useCallback((documentId: string | null) => {
    setSelectedDocumentId(documentId);

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
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar
        selectedDocumentId={selectedDocumentId}
        onSelectDocument={handleSelectDocument}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-border/50 px-6 py-3 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* DocLens Logo */}
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md shadow-primary/20">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <circle cx="11.5" cy="14.5" r="2.5" />
                    <path d="M13.3 16.3 15 18" />
                  </svg>
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  DocLens
                </h1>
              </div>
              <div className="h-6 w-px bg-border/50" />
              <ApiHealthIndicator />
            </div>
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
