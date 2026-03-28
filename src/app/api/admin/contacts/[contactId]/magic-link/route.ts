import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth-admin";
import { logAudit } from "@/lib/audit";
import crypto from "crypto";

const MAGIC_LINK_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function POST(
  request: Request,
  { params }: { params: Promise<{ contactId: string }> }
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

  const { contactId } = await params;

  let body: { roomId?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { roomId } = body;

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { id: true, email: true, name: true },
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  // If roomId provided, verify access exists
  if (roomId) {
    const access = await prisma.dataRoomAccess.findUnique({
      where: { contactId_dataRoomId: { contactId, dataRoomId: roomId } },
    });
    if (!access) {
      return NextResponse.json(
        { error: "Contact does not have access to this room" },
        { status: 404 }
      );
    }
  }

  // Generate magic link token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MS);

  await prisma.magicLink.create({
    data: {
      token,
      contactId,
      type: "invite",
      expiresAt,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const magicLinkUrl = roomId
    ? `${appUrl}/portal/auth?token=${token}&room=${roomId}`
    : `${appUrl}/portal/auth?token=${token}`;

  await logAudit({
    action: "magic_link.created",
    actorType: "user",
    actorId: user.id,
    resourceType: "Contact",
    resourceId: contactId,
    metadata: {
      contactEmail: contact.email,
      roomId: roomId ?? null,
    },
  });

  return NextResponse.json({ magicLinkUrl, token, expiresAt: expiresAt.toISOString() });
}
