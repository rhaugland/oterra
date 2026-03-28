import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth-admin";
import type { ActorType, Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const { searchParams } = new URL(request.url);

  const cursor = searchParams.get("cursor");
  const limitParam = searchParams.get("limit");
  const action = searchParams.get("action");
  const actorType = searchParams.get("actorType");
  const resourceType = searchParams.get("resourceType");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const limit = Math.min(
    Math.max(1, limitParam ? parseInt(limitParam, 10) || 50 : 50),
    100
  );

  const where: Prisma.AuditLogWhereInput = {};

  if (action) {
    where.action = action;
  }

  if (actorType) {
    where.actorType = actorType as ActorType;
  }

  if (resourceType) {
    where.resourceType = resourceType;
  }

  const dateFilter: Prisma.DateTimeFilter = {};
  if (from) {
    dateFilter.gte = new Date(from);
  }
  if (to) {
    dateFilter.lte = new Date(to);
  }
  if (cursor) {
    dateFilter.lt = new Date(cursor);
  }

  if (Object.keys(dateFilter).length > 0) {
    where.createdAt = dateFilter;
  }

  const entries = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
  });

  let nextCursor: string | null = null;
  if (entries.length > limit) {
    const lastEntry = entries.pop();
    if (lastEntry) {
      nextCursor = lastEntry.createdAt.toISOString();
    }
  }

  return NextResponse.json({ entries, nextCursor });
}
