import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// No auth required — accessId is a UUID (hard to guess) and only exposes NDA status.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ accessId: string }> }
): Promise<NextResponse> {
  const { accessId } = await params;

  const access = await prisma.dataRoomAccess.findUnique({
    where: { id: accessId },
    select: { ndaStatus: true },
  });

  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ndaStatus: access.ndaStatus });
}
