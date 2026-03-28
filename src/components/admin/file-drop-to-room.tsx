"use client";

import { useRef, useState, DragEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";

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

interface Room {
  id: string;
  name: string;
}

interface FileDropToRoomProps {
  rooms: Room[];
}

export function FileDropToRoom({ rooms }: FileDropToRoomProps) {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [phase, setPhase] = useState<"idle" | "picked" | "uploading" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
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
    const dropped = Array.from(e.dataTransfer.files).filter(
      (f) => ALLOWED_MIME_TYPES.includes(f.type) && f.size <= 524288000
    );
    if (dropped.length === 0) {
      setError("No supported files found (PDF, XLSX, DOCX, PPTX, CSV, TXT, PNG, JPEG)");
      return;
    }
    setFiles(dropped);
    setPhase("picked");
    setError(null);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const picked = Array.from(e.target.files).filter(
      (f) => ALLOWED_MIME_TYPES.includes(f.type) && f.size <= 524288000
    );
    if (picked.length === 0) {
      setError("No supported files selected");
      return;
    }
    setFiles(picked);
    setPhase("picked");
    setError(null);
    e.target.value = "";
  }

  async function handleUpload() {
    if (!selectedRoomId || files.length === 0) return;

    setPhase("uploading");
    setProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        const initRes = await fetch(`/api/admin/rooms/${selectedRoomId}/files`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, size: file.size, mimeType: file.type }),
        });

        if (!initRes.ok) continue;

        const { fileId, uploadUrl } = (await initRes.json()) as { fileId: string; uploadUrl: string };

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject());
          xhr.onerror = () => reject();
          xhr.send(file);
        });

        await fetch(`/api/admin/rooms/${selectedRoomId}/files/${fileId}/confirm`, { method: "POST" });

        setProgress(i + 1);
      }

      setPhase("done");
      setTimeout(() => {
        setPhase("idle");
        setFiles([]);
        setSelectedRoomId("");
        router.refresh();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPhase("idle");
    }
  }

  function handleCancel() {
    setPhase("idle");
    setFiles([]);
    setSelectedRoomId("");
    setError(null);
  }

  if (phase === "picked") {
    return (
      <div className="border-2 border-dashed border-ottera-red-600/30 rounded-lg p-6 bg-ottera-red-50/30">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Add {files.length} file{files.length !== 1 ? "s" : ""} to a data room
        </h3>

        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">Select Room</label>
          <select
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-ottera-red-600/30 focus:border-ottera-red-600 outline-none bg-white"
          >
            <option value="">Choose a room...</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <p className="text-xs font-medium text-gray-600 mb-1">Files:</p>
          <div className="max-h-32 overflow-y-auto bg-white rounded-md border border-gray-200 divide-y divide-gray-100">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-gray-400 shrink-0">
                  <path fillRule="evenodd" d="M4 2a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5V6.621a1.5 1.5 0 0 0-.44-1.06L9.94 2.439A1.5 1.5 0 0 0 8.878 2H4Z" clipRule="evenodd" />
                </svg>
                <span className="truncate">{f.name}</span>
                <span className="ml-auto text-gray-400 shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleUpload}
            disabled={!selectedRoomId}
            className="px-4 py-2 bg-ottera-red-600 text-white text-sm font-medium rounded-md hover:bg-ottera-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Upload to Room
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (phase === "uploading") {
    return (
      <div className="border-2 border-dashed border-ottera-red-600/30 rounded-lg p-6 bg-ottera-red-50/30">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Uploading files...</h3>
        <p className="text-xs text-gray-500 mb-3">
          File {progress} of {files.length}
        </p>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-ottera-red-600 h-2 rounded-full transition-all"
            style={{ width: `${files.length > 0 ? (progress / files.length) * 100 : 0}%` }}
          />
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="border-2 border-dashed border-green-300 rounded-lg p-6 bg-green-50/30 text-center">
        <p className="text-sm font-semibold text-green-700">
          {files.length} file{files.length !== 1 ? "s" : ""} uploaded successfully!
        </p>
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
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
        <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-sm font-medium text-gray-700">
          Drop files here to add to an existing data room
        </p>
        <p className="text-xs text-gray-400 mt-1">
          PDF, XLSX, DOCX, PPTX, CSV, TXT, PNG, JPEG — max 500MB
        </p>
      </div>

      {error && (
        <div className="mt-2 flex items-center justify-between bg-red-50 border border-red-200 rounded-md px-3 py-2">
          <p className="text-xs text-red-600">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-2">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
