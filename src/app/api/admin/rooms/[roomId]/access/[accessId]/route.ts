import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth-admin";
import { approvalActionSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import { sendAccessGrantedEmail } from "@/lib/email";

export async function PATCH(
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = approvalActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const access = await prisma.dataRoomAccess.findUnique({
    where: { id: accessId },
    include: {
      contact: true,
      dataRoom: true,
    },
  });

  if (!access || access.dataRoomId !== roomId) {
    return NextResponse.json({ error: "Access record not found" }, { status: 404 });
  }

  const { action } = parsed.data;

  if (action === "approved") {
    if (access.ndaStatus !== "signed") {
      return NextResponse.json(
        { error: "NDA must be signed before approving access" },
        { status: 422 }
      );
    }

    const updated = await prisma.dataRoomAccess.update({
      where: { id: accessId },
      data: {
        approvalStatus: "approved",
        approvedById: user.id,
        approvedAt: new Date(),
      },
    });

    try {
      await sendAccessGrantedEmail(access.contact, access.dataRoom);
    } catch (emailErr) {
      console.error("Failed to send access granted email:", emailErr);
    }

    await logAudit({
      action: "access.approved",
      actorType: "user",
      actorId: user.id,
      resourceType: "DataRoomAccess",
      resourceId: accessId,
      metadata: { contactId: access.contactId, dataRoomId: roomId },
    });

    return NextResponse.json(updated);
  }

  if (action === "denied") {
    const updated = await prisma.dataRoomAccess.update({
      where: { id: accessId },
      data: { approvalStatus: "denied" },
    });

    await logAudit({
      action: "access.denied",
      actorType: "user",
      actorId: user.id,
      resourceType: "DataRoomAccess",
      resourceId: accessId,
      metadata: { contactId: access.contactId, dataRoomId: roomId },
    });

    return NextResponse.json(updated);
  }

  if (action === "revoked") {
    const updated = await prisma.dataRoomAccess.update({
      where: { id: accessId },
      data: { approvalStatus: "revoked" },
    });

    await logAudit({
      action: "access.revoked",
      actorType: "user",
      actorId: user.id,
      resourceType: "DataRoomAccess",
      resourceId: accessId,
      metadata: { contactId: access.contactId, dataRoomId: roomId },
    });

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
