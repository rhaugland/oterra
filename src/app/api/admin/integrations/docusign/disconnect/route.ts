import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/integrations/docusign/disconnect
 * Removes the stored DocuSign OAuth tokens.
 */
export async function POST() {
  await prisma.integration.deleteMany({ where: { provider: "docusign" } });
  return NextResponse.json({ ok: true });
}
