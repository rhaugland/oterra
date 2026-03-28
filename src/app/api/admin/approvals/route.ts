import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth-admin";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const approvals = await prisma.dataRoomAccess.findMany({
    where: { approvalStatus: "pending" },
    orderBy: { createdAt: "desc" },
    include: {
      contact: {
        select: {
          id: true,
          name: true,
          email: true,
          company: true,
        },
      },
      dataRoom: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return NextResponse.json(approvals);
}
