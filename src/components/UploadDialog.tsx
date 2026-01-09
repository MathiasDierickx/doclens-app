"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useGetUploadUrlMutation } from "@/store/api/generatedApi";

interface UploadDialogProps {
  onUploadComplete?: () => void;
}

export function UploadDialog({ onUploadComplete }: UploadDialogProps) {
  const [open, setOpen] = useState(false);
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

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetState();
    }
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
      // Step 1: Get the SAS URL from the backend
      const result = await getUploadUrl({ filename: file.name }).unwrap();

      if (!result.uploadUrl) {
        throw new Error("No upload URL received");
      }

      // Step 2: Upload directly to Azure Blob Storage
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
      onUploadComplete?.();

      // Close dialog after success
      setTimeout(() => {
        handleOpenChange(false);
      }, 1500);
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Upload PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload PDF Document</DialogTitle>
          <DialogDescription>
            Upload a PDF document to ask questions about its content.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {uploadStatus === "idle" && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="text-4xl mb-2">📄</div>
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
                <Button variant="secondary" size="sm" asChild>
                  <span>Select File</span>
                </Button>
              </label>
            </div>
          )}

          {(uploadStatus === "getting-url" || uploadStatus === "uploading") && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3">
                <div className="text-2xl">📄</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
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
            <div className="text-center py-8">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-sm font-medium text-green-600">
                Upload complete!
              </p>
            </div>
          )}

          {uploadStatus === "error" && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="text-4xl mb-2">❌</div>
                <p className="text-sm font-medium text-red-600">
                  {errorMessage}
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={resetState}
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
