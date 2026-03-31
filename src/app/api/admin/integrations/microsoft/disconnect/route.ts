import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/integrations/microsoft/disconnect
 * Removes the stored Microsoft OAuth tokens.
 */
export async function POST() {
  await prisma.integration.deleteMany({ where: { provider: "microsoft" } });
  return NextResponse.json({ ok: true });
}
