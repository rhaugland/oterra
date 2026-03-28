import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole, AuthError } from "@/lib/auth-admin";
import { z } from "zod";
import bcryptjs from "bcryptjs";
import { Resend } from "resend";

const BCRYPT_ROUNDS = 10;

const inviteTeamMemberSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["admin", "member"]),
});

function getResend(): Resend {
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM = () => process.env.EMAIL_FROM ?? "noreply@example.com";

export async function GET(request: Request) {
  try {
    await requireAdminRole(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  let adminUser;
  try {
    adminUser = await requireAdminRole(request);
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

  const parsed = inviteTeamMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 }
    );
  }

  // Generate a random temporary password
  const tempPassword = crypto.randomUUID().replace(/-/g, "") + "Aa1!";
  const passwordHash = await bcryptjs.hash(tempPassword, BCRYPT_ROUNDS);

  const newUser = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      role: parsed.data.role,
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  // Send invitation email via Resend
  try {
    const resend = getResend();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    await resend.emails.send({
      from: FROM(),
      to: newUser.email,
      subject: "You've been invited to the Data Room admin team",
      html: `
        <p>Hi ${newUser.name},</p>
        <p>You have been invited by <strong>${adminUser.name}</strong> to join the Data Room admin team as a <strong>${newUser.role}</strong>.</p>
        <p>Your temporary password is: <code>${tempPassword}</code></p>
        <p>Please log in and change your password immediately.</p>
        <p><a href="${appUrl}/admin/login">Log In</a></p>
        <p>If you did not expect this invitation, you can ignore this email.</p>
      `,
    });
  } catch {
    // Email failure is non-fatal — the user was created successfully
  }

  return NextResponse.json(newUser, { status: 201 });
}

export async function DELETE(request: Request) {
  let adminUser;
  try {
    adminUser = await requireAdminRole(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  if (userId === adminUser.id) {
    return NextResponse.json(
      { error: "You cannot remove yourself" },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Delete sessions first, then the user
  await prisma.session.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ success: true });
}
