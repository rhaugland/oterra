import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RoomCard } from "@/components/admin/room-card";

export default async function RoomsPage() {
  const rooms = await prisma.dataRoom.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      files: {
        where: { status: "ready" },
        select: { id: true },
      },
      accesses: {
        select: { approvalStatus: true, ndaStatus: true, contactId: true },
      },
    },
  });

  const roomsWithCounts = rooms.map((room) => {
    const uniqueContactIds = new Set(room.accesses.map((a) => a.contactId));
    return {
      id: room.id,
      name: room.name,
      description: room.description,
      status: room.status as "active" | "archived",
      fileCount: room.files.length,
      contactCount: uniqueContactIds.size,
      ndaCounts: {
        signed: room.accesses.filter((a) => a.ndaStatus === "signed").length,
        sent: room.accesses.filter((a) => a.ndaStatus === "sent").length,
        not_sent: room.accesses.filter((a) => a.ndaStatus === "not_sent").length,
        declined: room.accesses.filter((a) => a.ndaStatus === "declined").length,
      },
      approvalCounts: {
        approved: room.accesses.filter((a) => a.approvalStatus === "approved")
          .length,
        pending: room.accesses.filter((a) => a.approvalStatus === "pending")
          .length,
        denied: room.accesses.filter((a) => a.approvalStatus === "denied")
          .length,
      },
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
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
        >
          + New Room
        </Link>
      </div>

      {roomsWithCounts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No data rooms yet</p>
          <p className="text-sm mt-1">Create your first room to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roomsWithCounts.map((room) => (
            <RoomCard key={room.id} {...room} />
          ))}
        </div>
      )}
    </div>
  );
}
