import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth-admin";
import { assignAccessSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import { sendInviteEmail } from "@/lib/email";
import crypto from "crypto";

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

  const room = await prisma.dataRoom.findUnique({ where: { id: roomId } });
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const accesses = await prisma.dataRoomAccess.findMany({
    where: { dataRoomId: roomId },
    include: {
      contact: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(accesses);
}

export async function POST(
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Inject dataRoomId from URL param for validation
  const parsed = assignAccessSchema.safeParse({
    ...(body as Record<string, unknown>),
    dataRoomId: roomId,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const room = await prisma.dataRoom.findUnique({ where: { id: roomId } });
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const contact = await prisma.contact.findUnique({
    where: { id: parsed.data.contactId },
  });
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  // Check for existing access
  const existingAccess = await prisma.dataRoomAccess.findUnique({
    where: {
      contactId_dataRoomId: {
        contactId: parsed.data.contactId,
        dataRoomId: roomId,
      },
    },
  });
  if (existingAccess) {
    return NextResponse.json(
      { error: "Contact already has access to this room" },
      { status: 409 }
    );
  }

  // Inherit NDA status from any existing access (NDA is global per contact)
  const existingNda = await prisma.dataRoomAccess.findFirst({
    where: {
      contactId: parsed.data.contactId,
      ndaStatus: { in: ["signed", "sent"] },
    },
    orderBy: { ndaStatus: "desc" }, // "signed" sorts after "sent"
    select: { ndaStatus: true, docusignEnvelopeId: true },
  });

  const access = await prisma.dataRoomAccess.create({
    data: {
      contactId: parsed.data.contactId,
      dataRoomId: roomId,
      ndaStatus: existingNda?.ndaStatus ?? "not_sent",
      approvalStatus: "pending",
      docusignEnvelopeId: existingNda?.docusignEnvelopeId ?? null,
    },
  });

  // Create magic link (invite, 7-day expiry)
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const magicLink = await prisma.magicLink.create({
    data: {
      token,
      contactId: parsed.data.contactId,
      type: "invite",
      expiresAt,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const magicLinkUrl = `${appUrl}/portal/auth?token=${magicLink.token}`;

  // Send invite email (best-effort)
  try {
    await sendInviteEmail(contact, room, magicLinkUrl);
  } catch (emailErr) {
    console.error("Failed to send invite email:", emailErr);
  }

  await logAudit({
    action: "access.assigned",
    actorType: "user",
    actorId: user.id,
    resourceType: "DataRoomAccess",
    resourceId: access.id,
    metadata: {
      contactId: parsed.data.contactId,
      dataRoomId: roomId,
      roomName: room.name,
      contactEmail: contact.email,
    },
  });

  return NextResponse.json(access, { status: 201 });
}
