"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useListDocumentsQuery,
  useDeleteDocumentMutation,
} from "@/store/api/generatedApi";

export function DocumentsList() {
  const { data, isLoading, isError } = useListDocumentsQuery();
  const [deleteDocument, { isLoading: isDeleting }] =
    useDeleteDocumentMutation();

  const handleDelete = async (documentId: string) => {
    if (confirm("Are you sure you want to delete this document?")) {
      await deleteDocument({ documentId });
    }
  };

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">Loading documents...</div>
    );
  }

  if (isError) {
    return (
      <div className="text-sm text-red-500">Failed to load documents</div>
    );
  }

  if (!data?.documents || data.documents.length === 0) {
    return null;
  }

  const formatFileSize = (bytes: number | null | undefined) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">
        Uploaded Documents
      </h3>
      {data.documents.map((doc) => (
        <Card key={doc.documentId} className="group">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="text-2xl">📄</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{doc.filename}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(doc.size)} • {formatDate(doc.uploadedAt)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={() => doc.documentId && handleDelete(doc.documentId)}
              disabled={isDeleting}
            >
              Delete
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
