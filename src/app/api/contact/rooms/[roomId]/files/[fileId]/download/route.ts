import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireContact } from "@/lib/auth-contact";
import { AuthError } from "@/lib/auth-admin";
import { getDownloadUrl } from "@/lib/storage";
import { logAudit } from "@/lib/audit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string; fileId: string }> }
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

  const { roomId, fileId } = await params;

  // Verify contact has approved access to this room
  const access = await prisma.dataRoomAccess.findUnique({
    where: {
      contactId_dataRoomId: {
        contactId: contact.id,
        dataRoomId: roomId,
      },
    },
    include: { dataRoom: true },
  });

  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (access.ndaStatus !== "signed" || access.approvalStatus !== "approved") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (access.dataRoom.status !== "active") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify file belongs to this room and is ready
  const file = await prisma.file.findFirst({
    where: { id: fileId, dataRoomId: roomId, status: "ready" },
  });

  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = await getDownloadUrl(file.storageKey, 300);

  await logAudit({
    action: "file.download",
    actorType: "contact",
    actorId: contact.id,
    resourceType: "File",
    resourceId: file.id,
    metadata: { fileName: file.name, roomId },
  });

  return NextResponse.json({ url });
}
