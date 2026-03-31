import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { User, Contact } from "@prisma/client";

const COOKIE_NAME = "session_token";
const USER_SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const CONTACT_SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const isHttps = (process.env.NEXT_PUBLIC_APP_URL ?? "").startsWith("https://");

export type SessionType = "user" | "contact";

export interface UserSession {
  type: "user";
  user: User;
}

export interface ContactSession {
  type: "contact";
  contact: Contact;
}

export type SessionResult = UserSession | ContactSession | null;

export async function createSession(
  type: SessionType,
  id: string
): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() +
      (type === "user" ? USER_SESSION_EXPIRY_MS : CONTACT_SESSION_EXPIRY_MS)
  );

  await prisma.session.create({
    data: {
      token,
      userId: type === "user" ? id : null,
      contactId: type === "contact" ? id : null,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || isHttps,
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return token;
}

export async function getSession(request: Request): Promise<SessionResult> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = parseCookieToken(cookieHeader);

  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true, contact: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {
        // ignore cleanup errors
      });
    }
    return null;
  }

  if (session.user) {
    return { type: "user", user: session.user };
  }

  if (session.contact) {
    return { type: "contact", contact: session.contact };
  }

  return null;
}

export async function destroySession(request: Request): Promise<void> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = parseCookieToken(cookieHeader);

  if (token) {
    await prisma.session
      .deleteMany({ where: { token } })
      .catch(() => {
        // ignore cleanup errors
      });
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || isHttps,
    sameSite: "lax",
    expires: new Date(0),
    path: "/",
  });
}

function parseCookieToken(cookieHeader: string): string | null {
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    const [name, ...rest] = cookie.split("=");
    if (name.trim() === COOKIE_NAME) {
      return rest.join("=").trim();
    }
  }
  return null;
}
