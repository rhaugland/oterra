"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ArchiveButtonClientProps {
  roomId: string;
  isArchived: boolean;
}

export function ArchiveButtonClient({ roomId, isArchived }: ArchiveButtonClientProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleToggle() {
    setLoading(true);
    try {
      await fetch(`/api/admin/rooms/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: isArchived ? "active" : "archived" }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`text-sm px-3 py-1.5 rounded-md border transition-colors disabled:opacity-50 ${
        isArchived
          ? "border-green-300 text-green-700 hover:bg-green-50"
          : "border-gray-300 text-gray-600 hover:bg-gray-50"
      }`}
    >
      {loading ? "..." : isArchived ? "Unarchive" : "Archive"}
    </button>
  );
}
