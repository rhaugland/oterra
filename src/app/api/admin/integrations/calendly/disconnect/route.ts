import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/integrations/calendly/disconnect
 * Removes the stored Calendly OAuth tokens.
 */
export async function POST() {
  await prisma.integration.deleteMany({ where: { provider: "calendly" } });
  return NextResponse.json({ ok: true });
}
