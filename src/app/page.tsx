"use client";

import { useEffect, useState } from "react";
import { ApiHealthIndicator } from "@/components/ApiHealthIndicator";
import { Sidebar } from "@/components/Sidebar";
import { UploadArea } from "@/components/UploadArea";
import { DocumentViewer } from "@/components/DocumentViewer";

export default function Home() {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  // Read document ID from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const docId = params.get("doc");
    if (docId) {
      setSelectedDocumentId(docId);
    }
  }, []);

  // Update URL when document changes
  const handleSelectDocument = (documentId: string | null) => {
    setSelectedDocumentId(documentId);

    const url = new URL(window.location.href);
    if (documentId) {
      url.searchParams.set("doc", documentId);
    } else {
      url.searchParams.delete("doc");
    }
    window.history.pushState({}, "", url.toString());
  };

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
        <header className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold">DocLens</h1>
              <ApiHealthIndicator />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-hidden">
          {selectedDocumentId ? (
            <DocumentViewer documentId={selectedDocumentId} />
          ) : (
            <UploadArea onUploadComplete={handleSelectDocument} />
          )}
        </main>
      </div>
    </div>
  );
}
