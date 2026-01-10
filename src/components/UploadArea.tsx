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
    <div className="flex flex-col items-center justify-center h-full p-8 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="max-w-lg w-full text-center">
        {/* Icon */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-xl shadow-primary/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" x2="12" y1="18" y2="12" />
              <line x1="9" x2="15" y1="15" y2="15" />
            </svg>
          </div>
        </div>

        {phase === "idle" && (
          <>
            <h2 className="mb-3 text-3xl font-bold text-foreground">Upload a Document</h2>
            <p className="mb-8 text-muted-foreground text-lg">
              Upload a PDF to start asking questions about its content
            </p>
            <div
              className={`border-2 border-dashed rounded-2xl p-12 transition-all duration-300 bg-white/50 backdrop-blur-sm ${
                isDragging
                  ? "border-primary bg-primary/10 scale-[1.02] shadow-xl shadow-primary/10"
                  : "border-primary/30 hover:border-primary/60 hover:bg-white/80 hover:shadow-lg"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" x2="12" y1="3" y2="15" />
                </svg>
              </div>
              <p className="text-base text-foreground font-medium mb-2">
                Drag and drop your PDF here
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                or click to browse your files
              </p>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity text-white font-medium px-8 py-2 shadow-lg shadow-primary/20" asChild>
                  <span>Select PDF File</span>
                </Button>
              </label>
            </div>
          </>
        )}

        {(phase === "getting-url" ||
          phase === "uploading" ||
          phase === "indexing") && (
          <div className="border-2 border-primary/20 rounded-2xl p-8 space-y-6 overflow-hidden bg-white/80 backdrop-blur-sm shadow-xl">
            <div className="flex items-center gap-4 justify-center overflow-hidden">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div className="text-left min-w-0 overflow-hidden">
                <p
                  className="text-base font-semibold text-foreground truncate"
                  title={selectedFile?.name}
                >
                  {selectedFile?.name}
                </p>
                <p className="text-sm text-primary font-medium">
                  {getStatusMessage()}
                </p>
              </div>
            </div>
            <div className="relative">
              <Progress value={getTotalProgress()} className="h-3 bg-muted" />
              <div className="absolute inset-0 h-3 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary via-accent to-primary animate-gradient transition-all duration-300 relative"
                  style={{ width: `${getTotalProgress()}%` }}
                >
                  {/* Animated shimmer overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-progress-shimmer" />
                </div>
              </div>
            </div>
            {phase === "indexing" && (
              <div className="flex justify-center gap-2 pt-2">
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
          <div className="border-2 border-green-200 rounded-2xl p-8 bg-gradient-to-br from-green-50 to-emerald-50 shadow-xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-green-700">
              Ready! Opening document...
            </p>
          </div>
        )}

        {phase === "error" && (
          <div className="border-2 border-red-200 rounded-2xl p-8 space-y-4 bg-gradient-to-br from-red-50 to-rose-50 shadow-xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" x2="6" y1="6" y2="18" />
                <line x1="6" x2="18" y1="6" y2="18" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-red-700">{errorMessage}</p>
            <Button
              className="bg-gradient-to-r from-red-500 to-rose-500 hover:opacity-90 text-white font-medium px-6"
              onClick={resetState}
            >
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
    <div className="flex flex-col items-center gap-1.5 px-3">
      <div
        className={`w-3 h-3 rounded-full transition-all duration-300 relative overflow-hidden ${
          complete
            ? "bg-gradient-to-br from-green-400 to-emerald-500 shadow-sm"
            : active
              ? "shadow-md shadow-primary/50"
              : "bg-muted"
        }`}
      >
        {active && (
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-shimmer" />
        )}
      </div>
      <span
        className={`text-xs font-medium ${
          complete
            ? "text-green-600"
            : active
              ? "text-primary"
              : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
