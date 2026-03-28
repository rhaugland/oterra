"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface RoomEntry {
  accessId: string;
  ndaStatus: string;
  approvalStatus: string;
  room: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    fileCount: number;
  };
}

interface RoomSidebarProps {
  currentRoomId: string;
}

function statusDot(entry: RoomEntry): string {
  if (
    entry.ndaStatus === "signed" &&
    entry.approvalStatus === "approved" &&
    entry.room.status === "active"
  ) {
    return "bg-green-400";
  }
  if (
    entry.approvalStatus === "denied" ||
    entry.approvalStatus === "revoked"
  ) {
    return "bg-red-400";
  }
  if (entry.ndaStatus === "not_sent") {
    return "bg-gray-300";
  }
  // sent, signed+pending
  return "bg-yellow-400";
}

export function RoomSidebar({ currentRoomId }: RoomSidebarProps) {
  const [rooms, setRooms] = useState<RoomEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/contact/rooms")
      .then((res) => res.json())
      .then((data: RoomEntry[]) => setRooms(data))
      .catch(() => {
        // fail silently — sidebar is non-critical
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <nav className="w-64 flex-shrink-0 bg-white border-r border-amber-200 min-h-screen">
      <div className="px-4 py-5 border-b border-amber-200">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-600">
          Data Rooms
        </h2>
      </div>
      <ul className="py-2">
        {loading && (
          <li className="px-4 py-3 text-sm text-amber-500">Loading…</li>
        )}
        {!loading && rooms.length === 0 && (
          <li className="px-4 py-3 text-sm text-amber-500">No rooms assigned.</li>
        )}
        {rooms.map((entry) => {
          const isActive = entry.room.id === currentRoomId;
          return (
            <li key={entry.room.id}>
              <Link
                href={`/room/${entry.room.id}`}
                className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                  isActive
                    ? "bg-amber-50 text-amber-900 font-medium border-r-2 border-amber-600"
                    : "text-gray-700 hover:bg-amber-50 hover:text-amber-900"
                }`}
              >
                <span
                  className={`flex-shrink-0 w-2 h-2 rounded-full ${statusDot(entry)}`}
                />
                <span className="truncate">{entry.room.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
