import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth-admin";
import { logAudit } from "@/lib/audit";
import { sendEnvelope, getEmbeddedSigningUrl } from "@/lib/docusign";
import type { NdaStatus } from "@prisma/client";

const RESENDABLE_STATUSES: NdaStatus[] = ["not_sent", "declined", "voided"];

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
    include: {
      contact: { select: { email: true, name: true } },
      dataRoom: { select: { name: true } },
    },
  });

  if (!access || access.dataRoomId !== roomId) {
    return NextResponse.json({ error: "Access record not found" }, { status: 404 });
  }

  if (!RESENDABLE_STATUSES.includes(access.ndaStatus)) {
    return NextResponse.json(
      { error: `Cannot send NDA when status is '${access.ndaStatus}'` },
      { status: 409 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  // Build the return URL — DocuSign replaces {event} with the actual signing event name
  const returnUrl = `${appUrl}/room/docusign-callback?event={{event}}&accessId=${accessId}`;

  const { envelopeId } = await sendEnvelope(
    { email: access.contact.email, name: access.contact.name },
    access.dataRoom.name,
    returnUrl
  );

  const { url: signingUrl } = await getEmbeddedSigningUrl(
    envelopeId,
    { email: access.contact.email, name: access.contact.name },
    returnUrl
  );

  await prisma.dataRoomAccess.update({
    where: { id: accessId },
    data: {
      ndaStatus: "sent",
      docusignEnvelopeId: envelopeId,
    },
  });

  await logAudit({
    action: "access.nda_sent",
    actorType: "user",
    actorId: user.id,
    resourceType: "DataRoomAccess",
    resourceId: accessId,
    metadata: {
      contactId: access.contactId,
      dataRoomId: roomId,
      envelopeId,
    },
  });

  return NextResponse.json({ signingUrl, ndaStatus: "sent" });
}
