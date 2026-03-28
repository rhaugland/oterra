import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RoomCard } from "@/components/admin/room-card";

export default async function RoomsPage() {
  const [rooms, allContacts] = await Promise.all([
    prisma.dataRoom.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        files: {
          where: { status: "ready" },
          select: { id: true, name: true },
        },
        accesses: {
          select: {
            approvalStatus: true,
            ndaStatus: true,
            contactId: true,
            contact: {
              select: { id: true, name: true, email: true, investorType: true, geography: true, checkSize: true },
            },
          },
        },
      },
    }),
    prisma.contact.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);

  // Fetch view logs per room from audit logs
  const allFileIds = rooms.flatMap((r) => r.files.map((f) => f.id));
  const viewLogs = allFileIds.length > 0
    ? await prisma.auditLog.findMany({
        where: {
          action: "file.download",
          actorType: "contact",
          resourceId: { in: allFileIds },
        },
        select: { actorId: true, resourceId: true },
      })
    : [];

  // Build fileId -> { roomId, fileName }
  const fileInfo = new Map<string, { roomId: string; name: string }>();
  for (const room of rooms) {
    for (const f of room.files) {
      fileInfo.set(f.id, { roomId: room.id, name: f.name });
    }
  }

  // Build contactId -> contact info
  const contactInfoMap = new Map<string, {
    name: string;
    investorType: string | null;
    geography: string | null;
    checkSize: string | null;
  }>();
  for (const room of rooms) {
    for (const a of room.accesses) {
      contactInfoMap.set(a.contact.id, {
        name: a.contact.name,
        investorType: a.contact.investorType,
        geography: a.contact.geography,
        checkSize: a.contact.checkSize,
      });
    }
  }

  // Build roomId -> contactId -> { views, fileNames }
  type ViewerEntry = {
    name: string;
    investorType: string | null;
    geography: string | null;
    checkSize: string | null;
    views: number;
    filesViewed: string[];
  };
  const roomViewers = new Map<string, Map<string, ViewerEntry>>();
  for (const log of viewLogs) {
    const fi = fileInfo.get(log.resourceId);
    if (!fi) continue;
    const contact = contactInfoMap.get(log.actorId);
    if (!contact) continue;

    if (!roomViewers.has(fi.roomId)) roomViewers.set(fi.roomId, new Map());
    const viewers = roomViewers.get(fi.roomId)!;
    if (!viewers.has(log.actorId)) {
      viewers.set(log.actorId, {
        name: contact.name,
        investorType: contact.investorType,
        geography: contact.geography,
        checkSize: contact.checkSize,
        views: 0,
        filesViewed: [],
      });
    }
    const entry = viewers.get(log.actorId)!;
    entry.views += 1;
    if (!entry.filesViewed.includes(fi.name)) {
      entry.filesViewed.push(fi.name);
    }
  }

  function groupBy(
    accesses: typeof rooms[number]["accesses"],
    getter: (a: typeof accesses[number]) => string | null
  ): Record<string, string[]> {
    const groups: Record<string, string[]> = {};
    for (const a of accesses) {
      const val = getter(a);
      if (val) {
        if (!groups[val]) groups[val] = [];
        groups[val].push(a.contact.name);
      }
    }
    return groups;
  }

  const roomsData = rooms.map((room) => {
    const uniqueContactIds = new Set(room.accesses.map((a) => a.contactId));
    const existingContactIds = room.accesses.map((a) => a.contact.id);

    const ndaGroups: Record<string, string[]> = {};
    for (const a of room.accesses) {
      if (!ndaGroups[a.ndaStatus]) ndaGroups[a.ndaStatus] = [];
      ndaGroups[a.ndaStatus].push(a.contact.name);
    }

    // View data with full contact details
    const viewers = roomViewers.get(room.id);
    const viewData = viewers
      ? Array.from(viewers.values())
      : [];

    // Available contacts (not already in this room)
    const availableContacts = allContacts.filter((c) => !existingContactIds.includes(c.id));

    return {
      id: room.id,
      name: room.name,
      description: room.description,
      status: room.status as "active" | "archived",
      fileCount: room.files.length,
      fileNames: room.files.map((f) => f.name),
      contactCount: uniqueContactIds.size,
      ndaGroups,
      investorTypeGroups: groupBy(room.accesses, (a) => a.contact.investorType),
      geographyGroups: groupBy(room.accesses, (a) => a.contact.geography),
      checkSizeGroups: groupBy(room.accesses, (a) => a.contact.checkSize),
      viewData,
      availableContacts,
    };
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Rooms</h1>
          <p className="text-sm text-gray-500 mt-1">
            {rooms.length} {rooms.length === 1 ? "room" : "rooms"} total
          </p>
        </div>
        <Link
          href="/admin/rooms/new"
          className="inline-flex items-center px-4 py-2 bg-ottera-red-600 text-white text-sm font-medium rounded-md hover:bg-ottera-red-700 transition-colors"
        >
          + New Room
        </Link>
      </div>

      {roomsData.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No data rooms yet</p>
          <p className="text-sm mt-1">Create your first room to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roomsData.map((room) => (
            <RoomCard key={room.id} {...room} />
          ))}
        </div>
      )}
    </div>
  );
}
