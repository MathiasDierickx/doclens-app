"use client";

import { Button } from "@/components/ui/button";
import {
  useListDocumentsQuery,
  useDeleteDocumentMutation,
} from "@/store/api/generatedApi";

interface SidebarProps {
  selectedDocumentId: string | null;
  onSelectDocument: (documentId: string | null) => void;
}

export function Sidebar({ selectedDocumentId, onSelectDocument }: SidebarProps) {
  const { data, isLoading } = useListDocumentsQuery();
  const [deleteDocument] = useDeleteDocumentMutation();

  const handleDelete = async (e: React.MouseEvent, documentId: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this document?")) {
      await deleteDocument({ documentId });
      if (selectedDocumentId === documentId) {
        onSelectDocument(null);
      }
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <aside className="w-72 bg-sidebar text-sidebar-foreground flex flex-col shadow-xl">
      {/* Sidebar Header */}
      <div className="p-5 border-b border-sidebar-border">
        <h2 className="text-lg font-semibold mb-4 text-sidebar-foreground/90">Documents</h2>
        <Button
          className="w-full justify-center gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity text-white font-medium shadow-lg"
          onClick={() => onSelectDocument(null)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          Upload New
        </Button>
      </div>

      {/* Documents List */}
      <div className="flex-1 overflow-auto p-3">
        {isLoading ? (
          <div className="p-4 text-sm text-sidebar-foreground/60 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            Loading...
          </div>
        ) : !data?.documents || data.documents.length === 0 ? (
          <div className="p-6 text-sm text-sidebar-foreground/50 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-sidebar-accent/50 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-sidebar-foreground/40"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p>No documents yet</p>
            <p className="text-xs mt-1 text-sidebar-foreground/40">Upload your first PDF to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.documents.map((doc) => (
              <div
                key={doc.documentId}
                className={`group relative rounded-xl p-3 cursor-pointer transition-all duration-200 ${
                  selectedDocumentId === doc.documentId
                    ? "bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 shadow-md"
                    : "hover:bg-sidebar-accent/70 border border-transparent"
                }`}
                onClick={() => doc.documentId && onSelectDocument(doc.documentId)}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    selectedDocumentId === doc.documentId
                      ? "bg-primary/30"
                      : "bg-sidebar-accent"
                  }`}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={selectedDocumentId === doc.documentId ? "text-primary" : "text-sidebar-foreground/60"}
                    >
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-sidebar-foreground">{doc.filename}</p>
                    <p className="text-xs text-sidebar-foreground/50 mt-0.5">
                      {formatDate(doc.uploadedAt)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => doc.documentId && handleDelete(e, doc.documentId)}
                  className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-all duration-200 text-sidebar-foreground/40 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10"
                  title="Delete document"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
