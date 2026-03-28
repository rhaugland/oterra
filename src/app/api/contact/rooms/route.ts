import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireContact } from "@/lib/auth-contact";
import { AuthError } from "@/lib/auth-admin";

export async function GET(request: Request) {
  let contact;
  try {
    contact = await requireContact(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const accesses = await prisma.dataRoomAccess.findMany({
    where: { contactId: contact.id },
    include: {
      dataRoom: {
        include: {
          files: {
            where: { status: "ready" },
            select: { id: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = accesses.map((access) => ({
    accessId: access.id,
    ndaStatus: access.ndaStatus,
    approvalStatus: access.approvalStatus,
    room: {
      id: access.dataRoom.id,
      name: access.dataRoom.name,
      description: access.dataRoom.description,
      status: access.dataRoom.status,
      fileCount: access.dataRoom.files.length,
    },
  }));

  return NextResponse.json(result);
}
