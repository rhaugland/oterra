import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteObject } from "@/lib/storage";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const staleFiles = await prisma.file.findMany({
    where: {
      status: "uploading",
      createdAt: { lt: cutoff },
    },
    select: { id: true, storageKey: true },
  });

  let cleaned = 0;
  for (const file of staleFiles) {
    try {
      await deleteObject(file.storageKey);
    } catch {
      // Storage object may not exist — proceed to delete DB record
    }
    await prisma.file.delete({ where: { id: file.id } });
    cleaned++;
  }

  return NextResponse.json({ cleaned });
}
