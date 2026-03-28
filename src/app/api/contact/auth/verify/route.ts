import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      new URL("/room/login?error=missing-token", url.origin)
    );
  }

  const magicLink = await prisma.magicLink.findUnique({
    where: { token },
    include: { contact: true },
  });

  // Validate: must exist, not expired, not used
  if (
    !magicLink ||
    magicLink.expiresAt < new Date() ||
    magicLink.usedAt !== null
  ) {
    return NextResponse.redirect(
      new URL("/room/login?error=invalid-token", url.origin)
    );
  }

  // Mark as used
  await prisma.magicLink.update({
    where: { id: magicLink.id },
    data: { usedAt: new Date() },
  });

  // Transition contact status from invited -> active
  if (magicLink.contact.status === "invited") {
    await prisma.contact.update({
      where: { id: magicLink.contact.id },
      data: { status: "active" },
    });
  }

  // Create session (sets cookie)
  await createSession("contact", magicLink.contact.id);

  // Redirect to room portal
  redirect("/room");
}
