"use client";

import { useState, FormEvent } from "react";

interface Tag {
  id: string;
  name: string;
  color?: string | null;
}

interface TagManagerProps {
  roomId: string;
  tags: Tag[];
  onTagsChange: () => void;
}

const DEFAULT_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#ef4444", // red
  "#14b8a6", // teal
];

export function TagManager({ roomId, tags, onTagsChange }: TagManagerProps) {
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(DEFAULT_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newTagName.trim()) return;

    setIsCreating(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/rooms/${roomId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Failed to create tag");
      }

      setNewTagName("");
      onTagsChange();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create tag");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDelete(tagId: string) {
    try {
      const res = await fetch(
        `/api/admin/rooms/${roomId}/tags?tagId=${tagId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Failed to delete tag");
      }

      onTagsChange();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete tag");
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Tags</h3>

      {/* Existing tags */}
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: tag.color ?? "#6366f1" }}
            >
              {tag.name}
              <button
                onClick={() => handleDelete(tag.id)}
                className="ml-0.5 opacity-70 hover:opacity-100 transition-opacity"
                title="Remove tag"
              >
                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 mb-4">No tags yet.</p>
      )}

      {/* Create new tag */}
      <form onSubmit={handleCreate} className="flex items-center gap-2">
        <input
          type="text"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          placeholder="New tag name"
          maxLength={100}
          className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <div className="flex items-center gap-1">
          {DEFAULT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setNewTagColor(color)}
              className={`w-5 h-5 rounded-full transition-transform ${
                newTagColor === color ? "scale-125 ring-2 ring-offset-1 ring-gray-400" : ""
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
        <button
          type="submit"
          disabled={isCreating || !newTagName.trim()}
          className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isCreating ? "Adding..." : "Add"}
        </button>
      </form>

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
