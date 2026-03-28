import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth-admin";
import { createContactSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const contacts = await prisma.contact.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      accesses: {
        select: {
          id: true,
          approvalStatus: true,
          ndaStatus: true,
        },
      },
    },
  });

  const result = contacts.map((contact) => ({
    id: contact.id,
    name: contact.name,
    email: contact.email,
    company: contact.company,
    status: contact.status,
    investorType: contact.investorType,
    geography: contact.geography,
    checkSize: contact.checkSize,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
    roomCount: contact.accesses.length,
    approvalCounts: {
      approved: contact.accesses.filter((a) => a.approvalStatus === "approved").length,
      pending: contact.accesses.filter((a) => a.approvalStatus === "pending").length,
      denied: contact.accesses.filter((a) => a.approvalStatus === "denied").length,
    },
  }));

  return NextResponse.json(result);
}

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

  const parsed = createContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.contact.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A contact with this email already exists" },
      { status: 409 }
    );
  }

  const contact = await prisma.contact.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      company: parsed.data.company ?? null,
      investorType: parsed.data.investorType ?? null,
      geography: parsed.data.geography ?? null,
      checkSize: parsed.data.checkSize ?? null,
      createdById: user.id,
    },
  });

  await logAudit({
    action: "contact.created",
    actorType: "user",
    actorId: user.id,
    resourceType: "Contact",
    resourceId: contact.id,
    metadata: { name: contact.name, email: contact.email },
  });

  return NextResponse.json(contact, { status: 201 });
}
