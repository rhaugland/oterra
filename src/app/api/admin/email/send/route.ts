import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth-admin";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/microsoft-graph";
import type { NdaStatus } from "@prisma/client";

const SENDABLE_STATUSES: NdaStatus[] = ["not_sent", "declined", "voided"];

export async function POST(request: Request) {
  let user;
  try {
    user = await requireAdmin(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const body = await request.json();
  const { contactId, action, subject, bodyHtml } = body as {
    contactId: string;
    action: "nda" | "calendly" | "magic-link";
    subject: string;
    bodyHtml: string;
  };

  if (!contactId || !action || !subject || !bodyHtml) {
    return NextResponse.json(
      { error: "contactId, action, subject, and bodyHtml are required" },
      { status: 400 }
    );
  }

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { id: true, email: true, name: true },
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  // Send the email via Microsoft Graph
  try {
    await sendEmail({
      to: { name: contact.name, email: contact.email },
      subject,
      bodyHtml,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // If NDA action, update NDA status globally for the contact
  if (action === "nda") {
    const accesses = await prisma.dataRoomAccess.findMany({
      where: { contactId },
      select: { ndaStatus: true },
    });

    const alreadySigned = accesses.some((a) => a.ndaStatus === "signed");
    if (!alreadySigned) {
      const alreadySent = accesses.some((a) => a.ndaStatus === "sent");
      if (!alreadySent) {
        // Only update to sent if there's something to send
        const hasSendable = accesses.some((a) =>
          SENDABLE_STATUSES.includes(a.ndaStatus)
        );
        if (hasSendable) {
          await prisma.dataRoomAccess.updateMany({
            where: { contactId, ndaStatus: { in: SENDABLE_STATUSES } },
            data: { ndaStatus: "sent" },
          });
        }
      }
    }
  }

  await logAudit({
    action: `email.${action}.sent`,
    actorType: "user",
    actorId: user.id,
    resourceType: "Contact",
    resourceId: contactId,
    metadata: {
      contactEmail: contact.email,
      emailAction: action,
      subject,
    },
  });

  return NextResponse.json({
    ok: true,
    ndaStatus: action === "nda" ? "sent" : undefined,
  });
}
