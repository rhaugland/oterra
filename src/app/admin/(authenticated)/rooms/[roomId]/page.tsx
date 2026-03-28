import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RoomDetailClient } from "@/components/admin/room-detail-client";
import { ArchiveButtonClient } from "@/components/admin/archive-button-client";
import { RoomAccessClient } from "@/components/admin/room-access-client";

interface RoomDetailPageProps {
  params: Promise<{ roomId: string }>;
}

export default async function RoomDetailPage({ params }: RoomDetailPageProps) {
  const { roomId } = await params;

  const [room, allContacts] = await Promise.all([
    prisma.dataRoom.findUnique({
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
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.contact.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, company: true },
    }),
  ]);

  if (!room) {
    notFound();
  }

  // Fetch per-contact view counts for files in this room
  const fileIds = room.files.map((f) => f.id);
  const contactIds = room.accesses.map((a) => a.contactId);

  const auditLogs =
    fileIds.length > 0 && contactIds.length > 0
      ? await prisma.auditLog.findMany({
          where: {
            actorType: "contact",
            actorId: { in: contactIds },
            action: "file.download",
            resourceId: { in: fileIds },
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

  const fileMap = new Map(room.files.map((f) => [f.id, f]));

  const logsByContact = new Map<string, typeof auditLogs>();
  for (const log of auditLogs) {
    const existing = logsByContact.get(log.actorId) ?? [];
    existing.push(log);
    logsByContact.set(log.actorId, existing);
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

  const initialAccesses = room.accesses.map((a) => {
    const logs = logsByContact.get(a.contactId) ?? [];
    const recentViews = logs.slice(0, 10).map((l) => {
      const file = fileMap.get(l.resourceId);
      return {
        id: l.id,
        fileId: l.resourceId,
        fileName: file?.name ?? "Unknown file",
        timestamp: l.createdAt.toISOString(),
      };
    });
    return {
      id: a.id,
      contactId: a.contactId,
      ndaStatus: a.ndaStatus as string,
      approvalStatus: a.approvalStatus as string,
      contact: {
        id: a.contact.id,
        name: a.contact.name,
        email: a.contact.email,
        company: a.contact.company,
      },
      viewCount: logs.length,
      recentViews,
    };
  });

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

      {/* Contact access management */}
      <RoomAccessClient
        roomId={roomId}
        initialAccesses={initialAccesses}
        allContacts={allContacts}
      />

      {/* File list + drag-and-drop upload at bottom */}
      <div className="mt-6">
        <RoomDetailClient
          roomId={roomId}
          initialFiles={initialFiles}
          initialTags={initialTags}
        />
      </div>
    </div>
  );
}
