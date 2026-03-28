import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth-admin";
import { deleteObject } from "@/lib/storage";
import { logAudit } from "@/lib/audit";

export async function DELETE(
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

  const file = await prisma.file.findUnique({
    where: { id: fileId },
  });

  if (!file || file.dataRoomId !== roomId) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  await deleteObject(file.storageKey);

  await prisma.file.delete({ where: { id: fileId } });

  await logAudit({
    action: "file.deleted",
    actorType: "user",
    actorId: user.id,
    resourceType: "file",
    resourceId: fileId,
    metadata: { fileName: file.name, roomId },
  });

  return new NextResponse(null, { status: 204 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roomId: string; fileId: string }> }
) {
  try {
    await requireAdmin(request);
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { tagIds } = body as { tagIds: string[] };

  if (!Array.isArray(tagIds)) {
    return NextResponse.json(
      { error: "tagIds must be an array" },
      { status: 400 }
    );
  }

  // Replace all tags: delete existing, create new
  await prisma.$transaction([
    prisma.fileTag.deleteMany({ where: { fileId } }),
    ...(tagIds.length > 0
      ? [
          prisma.fileTag.createMany({
            data: tagIds.map((tagId) => ({ fileId, tagId })),
          }),
        ]
      : []),
  ]);

  const updated = await prisma.file.findUnique({
    where: { id: fileId },
    include: { tags: { include: { tag: true } } },
  });

  return NextResponse.json(updated);
}
