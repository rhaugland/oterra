import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth-admin";
import { logAudit } from "@/lib/audit";
import { sendEnvelope, getEmbeddedSigningUrl } from "@/lib/docusign";
import type { NdaStatus } from "@prisma/client";

const SENDABLE_STATUSES: NdaStatus[] = ["not_sent", "declined", "voided"];

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

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { id: true, email: true, name: true },
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  // Get all accesses for this contact
  const accesses = await prisma.dataRoomAccess.findMany({
    where: { contactId },
    include: { dataRoom: { select: { name: true } } },
  });

  if (accesses.length === 0) {
    return NextResponse.json({ error: "Contact has no room access" }, { status: 404 });
  }

  // Check if already signed — if any access is signed, propagate to all
  const alreadySigned = accesses.some((a) => a.ndaStatus === "signed");
  if (alreadySigned) {
    // Propagate signed status to all accesses that aren't already signed
    await prisma.dataRoomAccess.updateMany({
      where: { contactId, ndaStatus: { not: "signed" } },
      data: { ndaStatus: "signed" },
    });
    return NextResponse.json({ ndaStatus: "signed", message: "NDA already signed — synced across all rooms" });
  }

  // Check if already sent — if any access is sent, propagate to all
  const alreadySent = accesses.some((a) => a.ndaStatus === "sent");
  if (alreadySent) {
    await prisma.dataRoomAccess.updateMany({
      where: { contactId, ndaStatus: { in: SENDABLE_STATUSES } },
      data: { ndaStatus: "sent" },
    });
    return NextResponse.json({ ndaStatus: "sent", message: "NDA already sent — synced across all rooms" });
  }

  // Pick the first sendable access to create the DocuSign envelope
  const targetAccess = accesses.find((a) => SENDABLE_STATUSES.includes(a.ndaStatus));
  if (!targetAccess) {
    return NextResponse.json(
      { error: "No sendable NDA — all are already sent or signed" },
      { status: 409 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const returnUrl = `${appUrl}/room/docusign-callback?event={{event}}&accessId=${targetAccess.id}`;

  const { envelopeId } = await sendEnvelope(
    { email: contact.email, name: contact.name },
    targetAccess.dataRoom.name,
    returnUrl
  );

  const { url: signingUrl } = await getEmbeddedSigningUrl(
    envelopeId,
    { email: contact.email, name: contact.name },
    returnUrl
  );

  // Update ALL accesses for this contact to "sent"
  await prisma.dataRoomAccess.updateMany({
    where: { contactId },
    data: {
      ndaStatus: "sent",
      docusignEnvelopeId: envelopeId,
    },
  });

  await logAudit({
    action: "nda.sent",
    actorType: "user",
    actorId: user.id,
    resourceType: "Contact",
    resourceId: contactId,
    metadata: {
      contactEmail: contact.email,
      envelopeId,
      accessCount: accesses.length,
    },
  });

  return NextResponse.json({ signingUrl, ndaStatus: "sent" });
}
