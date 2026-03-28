import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/docusign";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { NdaStatus } from "@prisma/client";

// DocuSign Connect sends JSON payloads. The envelope status event structure
// uses envelopeId and status fields at the top level.
interface DocuSignConnectEvent {
  event?: string;
  apiVersion?: string;
  uri?: string;
  retryCount?: number;
  configurationId?: number;
  generatedDateTime?: string;
  data?: {
    accountId?: string;
    envelopeId?: string;
    envelopeSummary?: {
      envelopeId?: string;
      status?: string;
      [key: string]: unknown;
    };
  };
}

const EVENT_TO_STATUS: Record<string, NdaStatus> = {
  "envelope-completed": "signed",
  "envelope-declined": "declined",
  "envelope-voided": "voided",
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Read raw body for signature verification
  const rawBody = await request.text();

  const signature = request.headers.get("x-docusign-signature-1") ?? "";

  // Verify HMAC signature — return 401 if invalid
  let valid: boolean;
  try {
    valid = verifyWebhookSignature(rawBody, signature);
  } catch {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: DocuSignConnectEvent;
  try {
    event = JSON.parse(rawBody) as DocuSignConnectEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const eventType = event.event;
  const envelopeId =
    event.data?.envelopeId ?? event.data?.envelopeSummary?.envelopeId;

  if (!eventType || !envelopeId) {
    // Not an event we can act on — acknowledge and move on
    return NextResponse.json({ ok: true });
  }

  const targetStatus = EVENT_TO_STATUS[eventType];
  if (!targetStatus) {
    // Unrecognised event type — acknowledge
    return NextResponse.json({ ok: true });
  }

  // Find the DataRoomAccess by envelope ID
  const access = await prisma.dataRoomAccess.findFirst({
    where: { docusignEnvelopeId: envelopeId },
  });

  if (!access) {
    // No matching record — acknowledge to prevent DocuSign retries
    return NextResponse.json({ ok: true });
  }

  // Idempotency: skip if already in the target state
  if (access.ndaStatus === targetStatus) {
    return NextResponse.json({ ok: true });
  }

  // Only transition from "sent" (or "voided" allows re-triggering)
  const allowedSourceStatuses: NdaStatus[] =
    targetStatus === "voided" ? ["sent", "signed", "declined"] : ["sent"];

  if (!allowedSourceStatuses.includes(access.ndaStatus)) {
    // Already in a terminal/unexpected state — acknowledge without re-logging
    return NextResponse.json({ ok: true });
  }

  // Perform the transition — propagate to ALL accesses for the same contact (NDA is global)
  await prisma.dataRoomAccess.updateMany({
    where: { contactId: access.contactId },
    data: { ndaStatus: targetStatus },
  });

  const actionMap: Record<NdaStatus, string> = {
    signed: "access.nda_signed",
    declined: "access.nda_declined",
    voided: "access.nda_voided",
    sent: "access.nda_sent",
    not_sent: "access.nda_not_sent",
  };

  await logAudit({
    action: actionMap[targetStatus],
    actorType: "system",
    actorId: access.id, // system actor — use access id as a stable identifier
    resourceType: "DataRoomAccess",
    resourceId: access.id,
    metadata: {
      envelopeId,
      previousStatus: access.ndaStatus,
      newStatus: targetStatus,
      event: eventType,
    },
  });

  return NextResponse.json({ ok: true });
}
