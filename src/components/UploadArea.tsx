"use client";

import { useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useGetUploadUrlMutation, api } from "@/store/api/generatedApi";
import { useIndexingStatus } from "@/hooks/useIndexingStatus";

interface UploadAreaProps {
  onUploadComplete: (documentId: string) => void;
}

type UploadPhase =
  | "idle"
  | "getting-url"
  | "uploading"
  | "indexing"
  | "ready"
  | "error";

export function UploadArea({ onUploadComplete }: UploadAreaProps) {
  const dispatch = useDispatch();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);

  const [getUploadUrl] = useGetUploadUrlMutation();

  const {
    status: indexingStatus,
    progress: indexingProgress,
    message: indexingMessage,
    isComplete: indexingComplete,
    isError: indexingError,
    error: indexingErrorMessage,
  } = useIndexingStatus(documentId, {
    enabled: phase === "indexing",
    onComplete: () => {
      setPhase("ready");
      // Invalidate documents cache to refresh the sidebar list
      dispatch(api.util.invalidateTags(["Documents"]));
      // Navigate to the document after a brief delay
      setTimeout(() => {
        if (documentId) {
          onUploadComplete(documentId);
        }
      }, 500);
    },
    onError: (error) => {
      setErrorMessage(error);
      setPhase("error");
    },
  });

  const resetState = () => {
    setUploadProgress(0);
    setPhase("idle");
    setErrorMessage("");
    setSelectedFile(null);
    setDocumentId(null);
  };

  const uploadFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setErrorMessage("Only PDF files are allowed");
      setPhase("error");
      return;
    }

    setSelectedFile(file);
    setPhase("getting-url");
    setErrorMessage("");

    try {
      const result = await getUploadUrl({ filename: file.name }).unwrap();

      if (!result.uploadUrl || !result.documentId) {
        throw new Error("No upload URL received");
      }

      setDocumentId(result.documentId);
      setPhase("uploading");

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      });

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("Upload failed"));

        xhr.open("PUT", result.uploadUrl!);
        xhr.setRequestHeader("x-ms-blob-type", "BlockBlob");
        xhr.setRequestHeader("Content-Type", "application/pdf");
        xhr.send(file);
      });

      // Upload complete, now wait for indexing
      setPhase("indexing");
    } catch (error) {
      console.error("Upload error:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Upload failed"
      );
      setPhase("error");
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      uploadFile(file);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  // Calculate total progress across upload and indexing phases
  const getTotalProgress = () => {
    if (phase === "getting-url") return 0;
    if (phase === "uploading") return Math.round(uploadProgress * 0.3); // Upload is 30%
    if (phase === "indexing") return 30 + Math.round(indexingProgress * 0.7); // Indexing is 70%
    if (phase === "ready") return 100;
    return 0;
  };

  const getStatusMessage = () => {
    switch (phase) {
      case "getting-url":
        return "Preparing upload...";
      case "uploading":
        return `Uploading... ${uploadProgress}%`;
      case "indexing":
        return indexingMessage || `Processing... ${indexingProgress}%`;
      case "ready":
        return "Ready! Opening document...";
      default:
        return "";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="max-w-md w-full text-center">
        <div className="mb-6 text-6xl">📄</div>
        <h2 className="mb-2 text-2xl font-semibold">Upload a Document</h2>
        <p className="mb-8 text-muted-foreground">
          Upload a PDF document to start asking questions about its content.
        </p>

        {phase === "idle" && (
          <div
            className={`border-2 border-dashed rounded-lg p-12 transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop your PDF here, or click to select
            </p>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button variant="secondary" asChild>
                <span>Select File</span>
              </Button>
            </label>
          </div>
        )}

        {(phase === "getting-url" ||
          phase === "uploading" ||
          phase === "indexing") && (
          <div className="border rounded-lg p-8 space-y-4 overflow-hidden">
            <div className="flex items-center gap-3 justify-center overflow-hidden">
              <div className="text-2xl shrink-0">📄</div>
              <div className="text-left min-w-0 overflow-hidden">
                <p
                  className="text-sm font-medium truncate"
                  title={selectedFile?.name}
                >
                  {selectedFile?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getStatusMessage()}
                </p>
              </div>
            </div>
            <Progress value={getTotalProgress()} className="h-2" />
            {phase === "indexing" && (
              <div className="flex justify-center gap-1 pt-2">
                <StepIndicator
                  label="Upload"
                  active={false}
                  complete={true}
                />
                <StepIndicator
                  label="Extract"
                  active={indexingStatus?.status === "extracting"}
                  complete={
                    indexingStatus?.status !== "pending" &&
                    indexingStatus?.status !== "extracting"
                  }
                />
                <StepIndicator
                  label="Chunk"
                  active={indexingStatus?.status === "chunking"}
                  complete={
                    indexingStatus?.status !== "pending" &&
                    indexingStatus?.status !== "extracting" &&
                    indexingStatus?.status !== "chunking"
                  }
                />
                <StepIndicator
                  label="Embed"
                  active={indexingStatus?.status === "embedding"}
                  complete={
                    indexingStatus?.status !== "pending" &&
                    indexingStatus?.status !== "extracting" &&
                    indexingStatus?.status !== "chunking" &&
                    indexingStatus?.status !== "embedding"
                  }
                />
                <StepIndicator
                  label="Index"
                  active={indexingStatus?.status === "indexing"}
                  complete={indexingStatus?.status === "ready"}
                />
              </div>
            )}
          </div>
        )}

        {phase === "ready" && (
          <div className="border rounded-lg p-8">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-sm font-medium text-green-600">
              Ready! Opening document...
            </p>
          </div>
        )}

        {phase === "error" && (
          <div className="border rounded-lg p-8 space-y-4">
            <div className="text-4xl mb-2">❌</div>
            <p className="text-sm font-medium text-red-600">{errorMessage}</p>
            <Button variant="outline" onClick={resetState}>
              Try Again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function StepIndicator({
  label,
  active,
  complete,
}: {
  label: string;
  active: boolean;
  complete: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-2">
      <div
        className={`w-2 h-2 rounded-full transition-colors ${
          complete
            ? "bg-green-500"
            : active
              ? "bg-primary animate-pulse"
              : "bg-muted-foreground/30"
        }`}
      />
      <span
        className={`text-[10px] ${
          active ? "text-primary font-medium" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
