import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/integrations/status
 * Returns connection status for all providers.
 */
export async function GET() {
  const integrations = await prisma.integration.findMany({
    select: { provider: true, senderEmail: true, metadata: true, createdAt: true },
  });

  const byProvider = new Map(integrations.map((i) => [i.provider, i]));

  const calendlyEntry = byProvider.get("calendly");
  const calendlyMeta = calendlyEntry?.metadata as { schedulingUrl?: string } | null;

  return NextResponse.json({
    microsoft: byProvider.has("microsoft")
      ? { connected: true, email: byProvider.get("microsoft")!.senderEmail }
      : { connected: false },
    docusign: byProvider.has("docusign")
      ? { connected: true }
      : { connected: false },
    calendly: calendlyEntry
      ? { connected: true, email: calendlyEntry.senderEmail, schedulingUrl: calendlyMeta?.schedulingUrl }
      : { connected: false },
  });
}
