import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth-admin";
import { getUploadUrl } from "@/lib/storage";
import { randomUUID } from "crypto";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/csv",
  "text/plain",
  "image/png",
  "image/jpeg",
]);

const MAX_SIZE = 524288000; // 500MB

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    await requireAdmin(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const { roomId } = await params;

  const room = await prisma.dataRoom.findUnique({ where: { id: roomId } });
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const files = await prisma.file.findMany({
    where: { dataRoomId: roomId, status: "ready" },
    include: {
      tags: { include: { tag: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(files);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
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

  const { roomId } = await params;

  const room = await prisma.dataRoom.findUnique({ where: { id: roomId } });
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, size, mimeType } = body as {
    name: string;
    size: number;
    mimeType: string;
  };

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  if (typeof size !== "number" || size <= 0) {
    return NextResponse.json(
      { error: "size must be a positive number" },
      { status: 400 }
    );
  }

  if (size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File size exceeds 500MB limit" },
      { status: 400 }
    );
  }

  if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json(
      { error: "File type not allowed", allowedTypes: [...ALLOWED_MIME_TYPES] },
      { status: 400 }
    );
  }

  const fileId = randomUUID();
  const storageKey = `rooms/${roomId}/${fileId}/${name}`;

  const file = await prisma.file.create({
    data: {
      id: fileId,
      name,
      size,
      mimeType,
      storageKey,
      status: "uploading",
      dataRoomId: roomId,
      uploadedById: user.id,
    },
  });

  const uploadUrl = await getUploadUrl(storageKey, mimeType, size);

  return NextResponse.json({ fileId: file.id, uploadUrl }, { status: 201 });
}
