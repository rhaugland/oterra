import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth-admin";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/microsoft-graph";
import { sendEnvelope } from "@/lib/docusign";
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

  let finalBodyHtml = bodyHtml;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // If NDA action, create DocuSign envelope and inject signing link
  if (action === "nda") {
    const accesses = await prisma.dataRoomAccess.findMany({
      where: { contactId },
      select: { id: true, ndaStatus: true, docusignEnvelopeId: true },
      orderBy: { createdAt: "desc" },
    });

    const alreadySigned = accesses.some((a) => a.ndaStatus === "signed");

    if (!alreadySigned) {
      // Find an access that needs an NDA sent
      const targetAccess = accesses.find((a) =>
        SENDABLE_STATUSES.includes(a.ndaStatus)
      ) || accesses.find((a) => a.ndaStatus === "sent");

      if (targetAccess) {
        // Create DocuSign envelope if one doesn't exist
        if (!targetAccess.docusignEnvelopeId) {
          try {
            const returnUrl = `${appUrl}/room/docusign-callback?accessId=${targetAccess.id}`;
            const { envelopeId } = await sendEnvelope(
              { email: contact.email, name: contact.name },
              "Data Room", // generic room name for global NDA
              returnUrl
            );

            await prisma.dataRoomAccess.updateMany({
              where: { contactId, ndaStatus: { in: SENDABLE_STATUSES } },
              data: { ndaStatus: "sent", docusignEnvelopeId: envelopeId },
            });
          } catch (err) {
            console.error("DocuSign envelope creation failed:", err);
            // Continue sending email without signing link — fall through
          }
        } else {
          // Envelope exists, just update status
          await prisma.dataRoomAccess.updateMany({
            where: { contactId, ndaStatus: { in: SENDABLE_STATUSES } },
            data: { ndaStatus: "sent" },
          });
        }

        // Build the signing link (public endpoint, generates fresh DocuSign URL on click)
        const signingLink = `${appUrl}/api/nda/sign/${targetAccess.id}`;
        finalBodyHtml = finalBodyHtml.replace(
          /{{NDA_SIGNING_LINK}}/g,
          signingLink
        );
      }
    }
  }

  // Send the email via Microsoft Graph
  try {
    await sendEmail({
      to: { name: contact.name, email: contact.email },
      subject,
      bodyHtml: finalBodyHtml,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 502 });
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
