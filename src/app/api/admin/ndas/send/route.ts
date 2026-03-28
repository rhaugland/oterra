import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth-admin";
import { sendEnvelope } from "@/lib/docusign";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const sendNdaSchema = z.object({
  accessId: z.string().uuid(),
});

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = sendNdaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const access = await prisma.dataRoomAccess.findUnique({
    where: { id: parsed.data.accessId },
    include: {
      contact: true,
      dataRoom: true,
    },
  });

  if (!access) {
    return NextResponse.json({ error: "Access record not found" }, { status: 404 });
  }

  if (access.ndaStatus === "signed") {
    return NextResponse.json({ error: "NDA already signed" }, { status: 409 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const returnUrl = `${appUrl}/room/docusign-callback`;

  try {
    const { envelopeId } = await sendEnvelope(
      { email: access.contact.email, name: access.contact.name },
      access.dataRoom.name,
      returnUrl
    );

    await prisma.dataRoomAccess.update({
      where: { id: access.id },
      data: {
        ndaStatus: "sent",
        docusignEnvelopeId: envelopeId,
      },
    });

    await logAudit({
      action: "nda.sent",
      actorType: "user",
      actorId: user.id,
      resourceType: "DataRoomAccess",
      resourceId: access.id,
      metadata: {
        contactEmail: access.contact.email,
        roomName: access.dataRoom.name,
        envelopeId,
      },
    });

    return NextResponse.json({ success: true, envelopeId }, { status: 200 });
  } catch (err) {
    console.error("Failed to send NDA via DocuSign:", err);
    return NextResponse.json(
      { error: "Failed to send NDA. Check DocuSign configuration." },
      { status: 502 }
    );
  }
}
