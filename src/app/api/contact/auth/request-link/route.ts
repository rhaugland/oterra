import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMagicLinkEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { requestMagicLinkSchema } from "@/lib/validations";

const MAGIC_LINK_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = requestMagicLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { email } = parsed.data;

  // Rate limit: 1 per minute per email
  const rateLimit = checkRateLimit(`magic-link:${email}`, 1, 60 * 1000);
  if (!rateLimit.allowed) {
    // Still return 200 to avoid leaking info, but don't send anything
    return NextResponse.json({
      message: "If an account exists, a login link has been sent.",
    });
  }

  const contact = await prisma.contact.findUnique({ where: { email } });

  if (contact) {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MS);

    await prisma.magicLink.create({
      data: {
        token,
        contactId: contact.id,
        type: "login",
        expiresAt,
      },
    });

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const magicLinkUrl = `${appUrl}/room/auth?token=${token}`;

    await sendMagicLinkEmail(contact, magicLinkUrl).catch(() => {
      // Silently ignore email errors — don't leak whether send succeeded
    });
  }

  // Always return 200 — never reveal whether the contact exists
  return NextResponse.json({
    message: "If an account exists, a login link has been sent.",
  });
}
