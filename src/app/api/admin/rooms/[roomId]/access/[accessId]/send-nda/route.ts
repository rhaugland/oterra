import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth-admin";
import { logAudit } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string; accessId: string }> }
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

  const { roomId, accessId } = await params;

  const access = await prisma.dataRoomAccess.findUnique({
    where: { id: accessId },
  });

  if (!access || access.dataRoomId !== roomId) {
    return NextResponse.json({ error: "Access record not found" }, { status: 404 });
  }

  // STUB: Update ndaStatus to sent without calling DocuSign (DocuSign integration in Task 8)
  const updated = await prisma.dataRoomAccess.update({
    where: { id: accessId },
    data: { ndaStatus: "sent" },
  });

  await logAudit({
    action: "access.nda_sent",
    actorType: "user",
    actorId: user.id,
    resourceType: "DataRoomAccess",
    resourceId: accessId,
    metadata: { contactId: access.contactId, dataRoomId: roomId, stub: true },
  });

  return NextResponse.json({ message: "NDA sent", ndaStatus: updated.ndaStatus });
}
