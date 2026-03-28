import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { contactRegisterSchema } from "@/lib/validations";

const SYSTEM_USER_EMAIL = "system@internal";

async function getOrCreateSystemUser(): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { email: SYSTEM_USER_EMAIL },
  });

  if (existing) return existing.id;

  // Bootstrap system user
  const created = await prisma.user.create({
    data: {
      email: SYSTEM_USER_EMAIL,
      name: "System",
      passwordHash: "",
      role: "member",
    },
  });

  return created.id;
}

export async function POST(request: Request) {
  // Rate limit: 5 per IP per hour
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const rateLimit = checkRateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfter ?? 60) },
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = contactRegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { name, email, company } = parsed.data;

  // Check if contact already exists — don't leak info, just return success
  const existing = await prisma.contact.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({
      message:
        "You're registered. You'll receive an email when you've been assigned to a data room.",
    });
  }

  const systemUserId = await getOrCreateSystemUser();

  await prisma.contact.create({
    data: {
      name,
      email,
      company,
      status: "invited",
      createdById: systemUserId,
    },
  });

  return NextResponse.json({
    message:
      "You're registered. You'll receive an email when you've been assigned to a data room.",
  });
}
