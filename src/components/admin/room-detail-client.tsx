"use client";

import { useState, useCallback } from "react";
import { FileUpload } from "./file-upload";
import { FileList } from "./file-list";

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

interface RoomDetailClientProps {
  roomId: string;
  initialFiles: FileRecord[];
  initialTags: Tag[];
}

export function RoomDetailClient({
  roomId,
  initialFiles,
  initialTags,
}: RoomDetailClientProps) {
  const [files, setFiles] = useState<FileRecord[]>(initialFiles);
  const [tags, setTags] = useState<Tag[]>(initialTags);

  const refreshFiles = useCallback(async () => {
    const res = await fetch(`/api/admin/rooms/${roomId}/files`);
    if (res.ok) {
      const data = await res.json();
      setFiles(data as FileRecord[]);
    }
  }, [roomId]);

  const refreshTags = useCallback(async () => {
    const res = await fetch(`/api/admin/rooms/${roomId}/tags`);
    if (res.ok) {
      const data = await res.json();
      setTags(data as Tag[]);
    }
  }, [roomId]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Upload Files</h2>
        <FileUpload roomId={roomId} onUploadComplete={refreshFiles} />
      </div>

      <FileList
        roomId={roomId}
        files={files}
        allTags={tags}
        onFileDeleted={refreshFiles}
        onTagsChanged={refreshFiles}
      />
    </div>
  );
}
