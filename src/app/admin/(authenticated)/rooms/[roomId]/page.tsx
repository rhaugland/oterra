import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RoomDetailClient } from "@/components/admin/room-detail-client";
import { ArchiveButtonClient } from "@/components/admin/archive-button-client";

interface RoomDetailPageProps {
  params: Promise<{ roomId: string }>;
}

export default async function RoomDetailPage({ params }: RoomDetailPageProps) {
  const { roomId } = await params;

  const room = await prisma.dataRoom.findUnique({
    where: { id: roomId },
    include: {
      files: {
        where: { status: "ready" },
        include: {
          tags: { include: { tag: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      tags: {
        orderBy: { name: "asc" },
      },
      accesses: {
        include: { contact: true },
      },
    },
  });

  if (!room) {
    notFound();
  }

  const initialFiles = room.files.map((f) => ({
    id: f.id,
    name: f.name,
    size: f.size,
    mimeType: f.mimeType,
    status: f.status,
    createdAt: f.createdAt.toISOString(),
    tags: f.tags.map((ft) => ({
      tag: {
        id: ft.tag.id,
        name: ft.tag.name,
        color: ft.tag.color,
      },
    })),
  }));

  const initialTags = room.tags.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
  }));

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Room header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/admin/rooms"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Rooms
              </Link>
              <span className="text-gray-300">/</span>
              <span className="text-sm text-gray-700 font-medium">{room.name}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{room.name}</h1>
            {room.description && (
              <p className="text-sm text-gray-500 mt-1">{room.description}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {room.status === "archived" && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                Archived
              </span>
            )}
            <ArchiveButtonClient
              roomId={roomId}
              isArchived={room.status === "archived"}
            />
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
          <span>
            {room.files.length} {room.files.length === 1 ? "file" : "files"}
          </span>
          <span className="text-gray-300">•</span>
          <span>
            {room.accesses.length}{" "}
            {room.accesses.length === 1 ? "contact" : "contacts"}
          </span>
          <span className="text-gray-300">•</span>
          <span>Created {new Date(room.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Client-side interactive section: tags, upload, file list */}
      <RoomDetailClient
        roomId={roomId}
        initialFiles={initialFiles}
        initialTags={initialTags}
      />
    </div>
  );
}
