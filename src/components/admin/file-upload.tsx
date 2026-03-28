"use client";

import { useRef, useState, DragEvent, ChangeEvent } from "react";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/csv",
  "text/plain",
  "image/png",
  "image/jpeg",
];

const MAX_SIZE = 524288000; // 500MB

interface UploadState {
  fileName: string;
  progress: number;
  error?: string;
}

interface FileUploadProps {
  roomId: string;
  onUploadComplete: () => void;
}

export function FileUpload({ roomId, onUploadComplete }: FileUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(uploadFile);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    files.forEach(uploadFile);
    // Reset input so same file can be re-uploaded if needed
    e.target.value = "";
  }

  function addUpload(fileName: string): number {
    const idx = uploads.length;
    setUploads((prev) => [...prev, { fileName, progress: 0 }]);
    return idx;
  }

  function updateUpload(
    fileName: string,
    patch: Partial<Omit<UploadState, "fileName">>
  ) {
    setUploads((prev) =>
      prev.map((u) => (u.fileName === fileName ? { ...u, ...patch } : u))
    );
  }

  async function uploadFile(file: File) {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setUploads((prev) => [
        ...prev,
        {
          fileName: file.name,
          progress: 0,
          error: `File type "${file.type || "unknown"}" is not allowed.`,
        },
      ]);
      return;
    }

    if (file.size > MAX_SIZE) {
      setUploads((prev) => [
        ...prev,
        {
          fileName: file.name,
          progress: 0,
          error: "File exceeds 500MB size limit.",
        },
      ]);
      return;
    }

    addUpload(file.name);

    try {
      // Step 1: Get pre-signed upload URL
      const initRes = await fetch(`/api/admin/rooms/${roomId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          mimeType: file.type,
        }),
      });

      if (!initRes.ok) {
        const data = await initRes.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Failed to initiate upload");
      }

      const { fileId, uploadUrl } = (await initRes.json()) as {
        fileId: string;
        uploadUrl: string;
      };

      // Step 2: PUT file directly to pre-signed S3 URL with progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 90); // reserve last 10% for confirm
            updateUpload(file.name, { progress: pct });
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Storage upload failed: ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(file);
      });

      // Step 3: Confirm upload
      const confirmRes = await fetch(
        `/api/admin/rooms/${roomId}/files/${fileId}/confirm`,
        { method: "POST" }
      );

      if (!confirmRes.ok) {
        const data = await confirmRes.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Failed to confirm upload");
      }

      updateUpload(file.name, { progress: 100 });

      // Step 4: Refresh file list
      onUploadComplete();

      // Clean up completed upload after a short delay
      setTimeout(() => {
        setUploads((prev) => prev.filter((u) => u.fileName !== file.name));
      }, 2000);
    } catch (err: unknown) {
      updateUpload(file.name, {
        error: err instanceof Error ? err.message : "Upload failed",
      });
    }
  }

  const activeUploads = uploads.filter((u) => !u.error);
  const failedUploads = uploads.filter((u) => u.error);

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          dragging
            ? "border-ottera-red-600 bg-ottera-red-50"
            : "border-gray-300 hover:border-ottera-red-600/30 hover:bg-gray-50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ALLOWED_MIME_TYPES.join(",")}
          className="hidden"
          onChange={handleFileChange}
        />
        <svg
          className="mx-auto h-10 w-10 text-gray-400 mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <p className="text-sm font-medium text-gray-700">
          Drop files here or click to upload
        </p>
        <p className="text-xs text-gray-400 mt-1">
          PDF, XLSX, DOCX, PPTX, CSV, TXT, PNG, JPEG — max 500MB
        </p>
      </div>

      {activeUploads.length > 0 && (
        <div className="space-y-2">
          {activeUploads.map((u) => (
            <div key={u.fileName} className="bg-white border border-gray-200 rounded-md p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700 truncate max-w-xs">{u.fileName}</span>
                <span className="text-xs text-gray-500">{u.progress}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-ottera-red-600 h-1.5 rounded-full transition-all"
                  style={{ width: `${u.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {failedUploads.length > 0 && (
        <div className="space-y-2">
          {failedUploads.map((u) => (
            <div
              key={u.fileName}
              className="flex items-start justify-between bg-red-50 border border-red-200 rounded-md p-3"
            >
              <div>
                <p className="text-sm font-medium text-red-800">{u.fileName}</p>
                <p className="text-xs text-red-600 mt-0.5">{u.error}</p>
              </div>
              <button
                onClick={() =>
                  setUploads((prev) => prev.filter((x) => x.fileName !== u.fileName))
                }
                className="ml-3 text-red-400 hover:text-red-600"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
