import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireContact } from "@/lib/auth-contact";
import { AuthError } from "@/lib/auth-admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  let contact;
  try {
    contact = await requireContact(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const { roomId } = await params;

  const access = await prisma.dataRoomAccess.findUnique({
    where: {
      contactId_dataRoomId: {
        contactId: contact.id,
        dataRoomId: roomId,
      },
    },
    include: {
      dataRoom: true,
    },
  });

  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { dataRoom: room } = access;

  const isFullyApproved =
    access.ndaStatus === "signed" &&
    access.approvalStatus === "approved" &&
    room.status === "active";

  if (isFullyApproved) {
    const files = await prisma.file.findMany({
      where: { dataRoomId: roomId, status: "ready" },
      include: {
        tags: {
          include: { tag: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const allTagIds = new Set<string>();
    const filesWithTags = files.map((file) => {
      const fileTags = file.tags.map((ft) => ft.tag);
      fileTags.forEach((t) => allTagIds.add(t.id));
      return {
        id: file.id,
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
        createdAt: file.createdAt,
        tags: fileTags,
      };
    });

    const allTags = await prisma.tag.findMany({
      where: { id: { in: Array.from(allTagIds) } },
    });

    return NextResponse.json({
      room: {
        id: room.id,
        name: room.name,
        description: room.description,
        status: room.status,
      },
      access: {
        id: access.id,
        ndaStatus: access.ndaStatus,
        approvalStatus: access.approvalStatus,
      },
      files: filesWithTags,
      tags: allTags,
    });
  }

  // Not fully approved — return access record so UI can show gate state
  return NextResponse.json({
    room: {
      id: room.id,
      name: room.name,
      description: room.description,
      status: room.status,
    },
    access: {
      id: access.id,
      ndaStatus: access.ndaStatus,
      approvalStatus: access.approvalStatus,
    },
  });
}
