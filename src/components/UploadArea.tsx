"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useGetUploadUrlMutation } from "@/store/api/generatedApi";

interface UploadAreaProps {
  onUploadComplete: (documentId: string) => void;
}

export function UploadArea({ onUploadComplete }: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "getting-url" | "uploading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [getUploadUrl] = useGetUploadUrlMutation();

  const resetState = () => {
    setUploadProgress(0);
    setUploadStatus("idle");
    setErrorMessage("");
    setSelectedFile(null);
  };

  const uploadFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setErrorMessage("Only PDF files are allowed");
      setUploadStatus("error");
      return;
    }

    setSelectedFile(file);
    setUploadStatus("getting-url");
    setErrorMessage("");

    try {
      const result = await getUploadUrl({ filename: file.name }).unwrap();

      if (!result.uploadUrl || !result.documentId) {
        throw new Error("No upload URL received");
      }

      setUploadStatus("uploading");

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

      setUploadStatus("success");

      // Navigate to the document after a brief delay
      setTimeout(() => {
        onUploadComplete(result.documentId!);
      }, 500);
    } catch (error) {
      console.error("Upload error:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Upload failed"
      );
      setUploadStatus("error");
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

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="max-w-md w-full text-center">
        <div className="mb-6 text-6xl">📄</div>
        <h2 className="mb-2 text-2xl font-semibold">Upload a Document</h2>
        <p className="mb-8 text-muted-foreground">
          Upload a PDF document to start asking questions about its content.
        </p>

        {uploadStatus === "idle" && (
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

        {(uploadStatus === "getting-url" || uploadStatus === "uploading") && (
          <div className="border rounded-lg p-8 space-y-4">
            <div className="flex items-center gap-3 justify-center">
              <div className="text-2xl">📄</div>
              <div className="text-left">
                <p className="text-sm font-medium truncate max-w-[200px]">
                  {selectedFile?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {uploadStatus === "getting-url"
                    ? "Preparing upload..."
                    : `Uploading... ${uploadProgress}%`}
                </p>
              </div>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {uploadStatus === "success" && (
          <div className="border rounded-lg p-8">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-sm font-medium text-green-600">
              Upload complete! Opening document...
            </p>
          </div>
        )}

        {uploadStatus === "error" && (
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
