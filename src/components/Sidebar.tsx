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
    <aside className="w-64 border-r bg-muted/30 flex flex-col">
      <div className="p-4 border-b">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => onSelectDocument(null)}
        >
          <span className="text-lg">+</span>
          New Document
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {isLoading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading...</div>
        ) : !data?.documents || data.documents.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">
            No documents yet
          </div>
        ) : (
          <div className="space-y-1">
            {data.documents.map((doc) => (
              <div
                key={doc.documentId}
                className={`group relative rounded-lg p-3 cursor-pointer transition-colors ${
                  selectedDocumentId === doc.documentId
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted"
                }`}
                onClick={() => doc.documentId && onSelectDocument(doc.documentId)}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg shrink-0">📄</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(doc.uploadedAt)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => doc.documentId && handleDelete(e, doc.documentId)}
                  className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 p-1"
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
