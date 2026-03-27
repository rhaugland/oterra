import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth-admin";
import { createRoomSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const rooms = await prisma.dataRoom.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      files: {
        where: { status: "ready" },
        select: { id: true },
      },
      accesses: {
        select: { approvalStatus: true, contactId: true },
      },
    },
  });

  const result = rooms.map((room) => {
    const approvedCount = room.accesses.filter(
      (a) => a.approvalStatus === "approved"
    ).length;
    const pendingCount = room.accesses.filter(
      (a) => a.approvalStatus === "pending"
    ).length;
    const deniedCount = room.accesses.filter(
      (a) => a.approvalStatus === "denied"
    ).length;
    const uniqueContactIds = new Set(room.accesses.map((a) => a.contactId));

    return {
      id: room.id,
      name: room.name,
      description: room.description,
      status: room.status,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      fileCount: room.files.length,
      contactCount: uniqueContactIds.size,
      approvalCounts: {
        approved: approvedCount,
        pending: pendingCount,
        denied: deniedCount,
      },
    };
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  let user;
  try {
    user = await requireAdmin(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createRoomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const room = await prisma.dataRoom.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      createdById: user.id,
    },
  });

  await logAudit({
    action: "room.created",
    actorType: "user",
    actorId: user.id,
    resourceType: "DataRoom",
    resourceId: room.id,
    metadata: { name: room.name },
  });

  return NextResponse.json(room, { status: 201 });
}
