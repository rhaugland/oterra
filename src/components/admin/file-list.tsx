"use client";

import { useState } from "react";

interface Tag {
  id: string;
  name: string;
  color?: string | null;
}

interface FileTag {
  tag: Tag;
}

interface FileRecord {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  status: string;
  createdAt: string;
  tags: FileTag[];
}

interface FileListProps {
  roomId: string;
  files: FileRecord[];
  allTags: Tag[];
  onFileDeleted: () => void;
  onTagsChanged: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getMimeLabel(mimeType: string): string {
  const map: Record<string, string> = {
    "application/pdf": "PDF",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
    "text/csv": "CSV",
    "text/plain": "TXT",
    "image/png": "PNG",
    "image/jpeg": "JPEG",
  };
  return map[mimeType] ?? mimeType;
}

interface FileRowProps {
  file: FileRecord;
  roomId: string;
  allTags: Tag[];
  onFileDeleted: () => void;
  onTagsChanged: () => void;
}

function FileRow({ file, roomId, allTags, onFileDeleted, onTagsChanged }: FileRowProps) {
  const [deleting, setDeleting] = useState(false);
  const [updatingTags, setUpdatingTags] = useState(false);

  const currentTagIds = new Set(file.tags.map((ft) => ft.tag.id));

  async function handleDelete() {
    if (!confirm(`Delete "${file.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/rooms/${roomId}/files/${file.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onFileDeleted();
      }
    } finally {
      setDeleting(false);
    }
  }

  async function toggleTag(tagId: string) {
    setUpdatingTags(true);
    const newTagIds = currentTagIds.has(tagId)
      ? [...currentTagIds].filter((id) => id !== tagId)
      : [...currentTagIds, tagId];

    try {
      await fetch(`/api/admin/rooms/${roomId}/files/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagIds: newTagIds }),
      });
      onTagsChanged();
    } finally {
      setUpdatingTags(false);
    }
  }

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="shrink-0 w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
        <span className="text-xs font-semibold text-gray-500">
          {getMimeLabel(file.mimeType)}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
        <p className="text-xs text-gray-400">
          {formatFileSize(file.size)} &middot;{" "}
          {new Date(file.createdAt).toLocaleDateString()}
        </p>

        {/* Tags on this file */}
        <div className="flex flex-wrap gap-1 mt-2">
          {file.tags.map((ft) => (
            <button
              key={ft.tag.id}
              onClick={() => toggleTag(ft.tag.id)}
              disabled={updatingTags}
              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium text-white hover:opacity-75 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: ft.tag.color ?? "#6366f1" }}
              title="Click to remove tag"
            >
              {ft.tag.name}
              <svg className="h-2.5 w-2.5 ml-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          ))}

          {/* Add tags not already on file */}
          {allTags
            .filter((t) => !currentTagIds.has(t.id))
            .map((tag) => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                disabled={updatingTags}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border border-dashed text-gray-500 hover:border-gray-400 transition-colors disabled:opacity-50"
                style={{ borderColor: tag.color ?? "#6366f1" }}
                title="Click to add tag"
              >
                + {tag.name}
              </button>
            ))}
        </div>
      </div>

      <button
        onClick={handleDelete}
        disabled={deleting}
        className="shrink-0 text-gray-400 hover:text-red-500 disabled:opacity-50 transition-colors"
        title="Delete file"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}

export function FileList({
  roomId,
  files,
  allTags,
  onFileDeleted,
  onTagsChanged,
}: FileListProps) {
  if (files.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-sm text-gray-400">No files uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">
          Files ({files.length})
        </h3>
      </div>
      <div className="px-4">
        {files.map((file) => (
          <FileRow
            key={file.id}
            file={file}
            roomId={roomId}
            allTags={allTags}
            onFileDeleted={onFileDeleted}
            onTagsChanged={onTagsChanged}
          />
        ))}
      </div>
    </div>
  );
}
