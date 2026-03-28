import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth-admin";
import { objectExists } from "@/lib/storage";
import { logAudit } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string; fileId: string }> }
) {
  let user;
  try {
    user = await requireAdmin(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const { roomId, fileId } = await params;

  const file = await prisma.file.findUnique({ where: { id: fileId } });

  if (!file || file.dataRoomId !== roomId) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if (file.status === "ready") {
    return NextResponse.json(file);
  }

  const exists = await objectExists(file.storageKey);
  if (!exists) {
    return NextResponse.json(
      { error: "File not found in storage. Upload may have failed." },
      { status: 422 }
    );
  }

  const updated = await prisma.file.update({
    where: { id: fileId },
    data: { status: "ready" },
  });

  await logAudit({
    action: "file.uploaded",
    actorType: "user",
    actorId: user.id,
    resourceType: "file",
    resourceId: fileId,
    metadata: { fileName: file.name, roomId, size: file.size },
  });

  return NextResponse.json(updated);
}
