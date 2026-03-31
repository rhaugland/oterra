import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEmbeddedSigningUrl, sendEnvelope } from "@/lib/docusign";

/**
 * GET /api/nda/sign/[accessId]
 *
 * Public endpoint (no auth required — linked from NDA emails).
 * Generates a fresh DocuSign embedded signing URL and redirects the contact.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accessId: string }> }
) {
  const { accessId } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const access = await prisma.dataRoomAccess.findUnique({
    where: { id: accessId },
    include: {
      contact: { select: { id: true, name: true, email: true } },
      dataRoom: { select: { id: true, name: true } },
    },
  });

  if (!access) {
    return NextResponse.redirect(
      `${appUrl}/room/docusign-callback?event=exception&error=not_found`
    );
  }

  if (access.ndaStatus === "signed") {
    return NextResponse.redirect(
      `${appUrl}/room/docusign-callback?event=signing_complete&accessId=${accessId}`
    );
  }

  // If no envelope exists yet, create one now
  if (!access.docusignEnvelopeId) {
    try {
      const returnUrl = `${appUrl}/room/docusign-callback?accessId=${accessId}`;
      const { envelopeId } = await sendEnvelope(
        { email: access.contact.email, name: access.contact.name },
        access.dataRoom.name,
        returnUrl
      );

      await prisma.dataRoomAccess.updateMany({
        where: { contactId: access.contactId },
        data: {
          ndaStatus: "sent",
          docusignEnvelopeId: envelopeId,
        },
      });

      // Re-read to get updated envelopeId
      const updated = await prisma.dataRoomAccess.findUnique({
        where: { id: accessId },
      });

      if (!updated?.docusignEnvelopeId) {
        return NextResponse.redirect(
          `${appUrl}/room/docusign-callback?event=exception&error=envelope_creation_failed`
        );
      }

      const returnUrlWithAccess = `${appUrl}/room/docusign-callback?accessId=${accessId}`;
      const { url } = await getEmbeddedSigningUrl(
        updated.docusignEnvelopeId,
        { email: access.contact.email, name: access.contact.name },
        returnUrlWithAccess
      );

      return NextResponse.redirect(url);
    } catch (err) {
      console.error("Failed to create DocuSign envelope:", err);
      return NextResponse.redirect(
        `${appUrl}/room/docusign-callback?event=exception&error=envelope_failed`
      );
    }
  }

  // Envelope exists — generate a fresh signing URL
  try {
    const returnUrl = `${appUrl}/room/docusign-callback?accessId=${accessId}`;
    const { url } = await getEmbeddedSigningUrl(
      access.docusignEnvelopeId,
      { email: access.contact.email, name: access.contact.name },
      returnUrl
    );

    return NextResponse.redirect(url);
  } catch (err) {
    console.error("Failed to get signing URL:", err);
    return NextResponse.redirect(
      `${appUrl}/room/docusign-callback?event=exception&error=signing_url_failed`
    );
  }
}
