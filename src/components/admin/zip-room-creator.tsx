"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import JSZip from "jszip";

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

const EXT_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  csv: "text/csv",
  txt: "text/plain",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

interface FileEntry {
  name: string;
  blob: Blob;
  mimeType: string;
}

export function ZipRoomCreator() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<"idle" | "naming" | "uploading" | "done">("idle");
  const [roomName, setRoomName] = useState("");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  async function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) await processZip(file);
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await processZip(file);
    e.target.value = "";
  }

  async function processZip(file: File) {
    if (!file.name.endsWith(".zip")) {
      setError("Please drop a .zip file");
      return;
    }

    setError(null);

    try {
      const zip = await JSZip.loadAsync(file);
      const entries: FileEntry[] = [];

      for (const [path, entry] of Object.entries(zip.files)) {
        if (entry.dir) continue;
        // Skip __MACOSX and hidden files
        if (path.startsWith("__MACOSX") || path.includes("/._") || path.startsWith(".")) continue;

        const fileName = path.split("/").pop() || path;
        const ext = fileName.split(".").pop()?.toLowerCase() || "";
        const mimeType = EXT_TO_MIME[ext];

        if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType)) continue;

        const blob = await entry.async("blob");
        entries.push({ name: fileName, blob, mimeType });
      }

      if (entries.length === 0) {
        setError("No supported files found in the zip (PDF, XLSX, DOCX, PPTX, CSV, TXT, PNG, JPEG)");
        return;
      }

      // Default room name from zip file name (without .zip)
      setRoomName(file.name.replace(/\.zip$/i, ""));
      setFiles(entries);
      setPhase("naming");
    } catch {
      setError("Failed to read zip file");
    }
  }

  async function handleCreate() {
    if (!roomName.trim()) return;

    setPhase("uploading");
    setTotalFiles(files.length);
    setProgress(0);

    try {
      // Step 1: Create the room
      const roomRes = await fetch("/api/admin/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: roomName.trim() }),
      });

      if (!roomRes.ok) {
        const data = await roomRes.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Failed to create room");
      }

      const room = (await roomRes.json()) as { id: string };

      // Step 2: Upload each file
      for (let i = 0; i < files.length; i++) {
        const f = files[i];

        // Initiate upload
        const initRes = await fetch(`/api/admin/rooms/${room.id}/files`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: f.name, size: f.blob.size, mimeType: f.mimeType }),
        });

        if (!initRes.ok) continue;

        const { fileId, uploadUrl } = (await initRes.json()) as { fileId: string; uploadUrl: string };

        // Upload to S3
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Type", f.mimeType);
          xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject());
          xhr.onerror = () => reject();
          xhr.send(f.blob);
        });

        // Confirm
        await fetch(`/api/admin/rooms/${room.id}/files/${fileId}/confirm`, { method: "POST" });

        setProgress(i + 1);
      }

      setPhase("done");

      // Navigate to the new room after a brief pause
      setTimeout(() => {
        router.push(`/admin/rooms/${room.id}`);
        router.refresh();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
      setPhase("idle");
    }
  }

  function handleCancel() {
    setPhase("idle");
    setFiles([]);
    setRoomName("");
    setError(null);
  }

  if (phase === "naming") {
    return (
      <div className="border-2 border-dashed border-ottera-red-600/30 rounded-lg p-6 bg-ottera-red-50/30">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Create Data Room from ZIP</h3>

        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">Room Name</label>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-ottera-red-600/30 focus:border-ottera-red-600 outline-none"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
        </div>

        <div className="mb-4">
          <p className="text-xs font-medium text-gray-600 mb-1">
            {files.length} file{files.length !== 1 ? "s" : ""} found:
          </p>
          <div className="max-h-32 overflow-y-auto bg-white rounded-md border border-gray-200 divide-y divide-gray-100">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-gray-400 shrink-0">
                  <path fillRule="evenodd" d="M4 2a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5V6.621a1.5 1.5 0 0 0-.44-1.06L9.94 2.439A1.5 1.5 0 0 0 8.878 2H4Z" clipRule="evenodd" />
                </svg>
                <span className="truncate">{f.name}</span>
                <span className="ml-auto text-gray-400 shrink-0">{(f.blob.size / 1024).toFixed(0)} KB</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCreate}
            disabled={!roomName.trim()}
            className="px-4 py-2 bg-ottera-red-600 text-white text-sm font-medium rounded-md hover:bg-ottera-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Create Room & Upload Files
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
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Creating &ldquo;{roomName}&rdquo;</h3>
        <p className="text-xs text-gray-500 mb-3">
          Uploading file {progress} of {totalFiles}...
        </p>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-ottera-red-600 h-2 rounded-full transition-all"
            style={{ width: `${totalFiles > 0 ? (progress / totalFiles) * 100 : 0}%` }}
          />
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="border-2 border-dashed border-green-300 rounded-lg p-6 bg-green-50/30 text-center">
        <p className="text-sm font-semibold text-green-700">
          Room created with {totalFiles} file{totalFiles !== 1 ? "s" : ""}! Redirecting...
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
          accept=".zip"
          className="hidden"
          onChange={handleFileChange}
        />
        <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <p className="text-sm font-medium text-gray-700">
          Drop a ZIP file to create a new data room
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Files inside will be automatically uploaded to the room
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
