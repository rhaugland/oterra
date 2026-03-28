import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth-admin";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const updateRoomSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(["active", "archived"]).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    await requireAdmin(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const { roomId } = await params;

  const room = await prisma.dataRoom.findUnique({
    where: { id: roomId },
    include: {
      files: {
        where: { status: "ready" },
        include: {
          tags: { include: { tag: true } },
        },
      },
      tags: true,
      accesses: {
        include: { contact: true },
      },
    },
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  // Gather file IDs and contact IDs for this room
  const fileIds = room.files.map((f) => f.id);
  const contactIds = room.accesses.map((a) => a.contactId);

  // Fetch file.download audit entries for this room's files
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

  // Group by contactId
  const logsByContact = new Map<string, typeof auditLogs>();
  for (const log of auditLogs) {
    const existing = logsByContact.get(log.actorId) ?? [];
    existing.push(log);
    logsByContact.set(log.actorId, existing);
  }

  const accessesWithViews = room.accesses.map((a) => {
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
      ...a,
      viewCount: logs.length,
      recentViews,
    };
  });

  return NextResponse.json({ ...room, accesses: accessesWithViews });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  let user;
  try {
    user = await requireAdmin(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  // Suppress unused variable warning — user available for future audit logging
  void user;

  const { roomId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateRoomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.dataRoom.findUnique({ where: { id: roomId } });
  if (!existing) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const room = await prisma.dataRoom.update({
    where: { id: roomId },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.description !== undefined && {
        description: parsed.data.description,
      }),
      ...(parsed.data.status !== undefined && { status: parsed.data.status }),
    },
  });

  return NextResponse.json(room);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  let user;
  try {
    user = await requireAdmin(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const { roomId } = await params;

  const room = await prisma.dataRoom.findUnique({ where: { id: roomId } });
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    const files = await tx.file.findMany({ where: { dataRoomId: roomId }, select: { id: true } });
    const fileIds = files.map((f) => f.id);
    if (fileIds.length > 0) {
      await tx.fileTag.deleteMany({ where: { fileId: { in: fileIds } } });
      await tx.file.deleteMany({ where: { dataRoomId: roomId } });
    }
    await tx.dataRoomAccess.deleteMany({ where: { dataRoomId: roomId } });
    await tx.tag.deleteMany({ where: { dataRoomId: roomId } });
    await tx.dataRoom.delete({ where: { id: roomId } });
  });

  await logAudit({
    action: "data_room.deleted",
    actorType: "user",
    actorId: user.id,
    resourceType: "DataRoom",
    resourceId: roomId,
    metadata: { roomName: room.name },
  });

  return NextResponse.json({ success: true });
}
