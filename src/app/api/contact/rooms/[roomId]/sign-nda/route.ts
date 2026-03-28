import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireContact } from "@/lib/auth-contact";
import { AuthError } from "@/lib/auth-admin";
import { getEmbeddedSigningUrl } from "@/lib/docusign";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  let contact;
  try {
    contact = await requireContact(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const { roomId } = await params;

  const access = await prisma.dataRoomAccess.findUnique({
    where: {
      contactId_dataRoomId: {
        contactId: contact.id,
        dataRoomId: roomId,
      },
    },
  });

  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (access.ndaStatus !== "sent") {
    return NextResponse.json(
      { error: "NDA is not ready to sign" },
      { status: 400 }
    );
  }

  if (!access.docusignEnvelopeId) {
    return NextResponse.json(
      { error: "No envelope found for this access" },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const returnUrl = `${appUrl}/room/${roomId}`;

  const { url } = await getEmbeddedSigningUrl(
    access.docusignEnvelopeId,
    { email: contact.email, name: contact.name },
    returnUrl
  );

  return NextResponse.json({ url });
}
