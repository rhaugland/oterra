"use client";

import { useState } from "react";

interface Tag {
  id: string;
  name: string;
  color: string | null;
}

interface FileItem {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
  tags: Tag[];
}

interface FileListProps {
  files: FileItem[];
  roomId: string;
  selectedTagIds: string[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function FileList({ files, roomId, selectedTagIds }: FileListProps) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filteredFiles =
    selectedTagIds.length === 0
      ? files
      : files.filter((file) =>
          file.tags.some((tag) => selectedTagIds.includes(tag.id))
        );

  async function handleDownload(file: FileItem) {
    setDownloading(file.id);
    setErrors((prev) => ({ ...prev, [file.id]: "" }));

    try {
      const res = await fetch(
        `/api/contact/rooms/${roomId}/files/${file.id}/download`
      );

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setErrors((prev) => ({
          ...prev,
          [file.id]: data.error ?? "Download failed. Please try again.",
        }));
        return;
      }

      const { url } = (await res.json()) as { url: string };
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
    } catch {
      setErrors((prev) => ({
        ...prev,
        [file.id]: "An unexpected error occurred.",
      }));
    } finally {
      setDownloading(null);
    }
  }

  if (filteredFiles.length === 0) {
    return (
      <div className="text-center py-12 text-amber-700">
        No files match the selected filters.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-amber-100">
      {filteredFiles.map((file) => (
        <li
          key={file.id}
          className="flex items-center justify-between py-4 gap-4"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-900 truncate">
                {file.name}
              </span>
              {file.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800"
                >
                  {tag.name}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{formatBytes(file.size)}</p>
            {errors[file.id] && (
              <p className="text-xs text-red-600 mt-1">{errors[file.id]}</p>
            )}
          </div>
          <button
            onClick={() => handleDownload(file)}
            disabled={downloading === file.id}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {downloading === file.id ? "Downloading…" : "Download"}
          </button>
        </li>
      ))}
    </ul>
  );
}
