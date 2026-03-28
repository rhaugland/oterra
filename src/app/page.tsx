import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "session_token";

export default async function RootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    const session = await prisma.session
      .findUnique({
        where: { token },
        select: {
          expiresAt: true,
          userId: true,
          contactId: true,
        },
      })
      .catch(() => null);

    if (session && session.expiresAt > new Date()) {
      if (session.userId) {
        redirect("/admin");
      }
      if (session.contactId) {
        redirect("/room");
      }
    }
  }

  redirect("/admin/login");
}
