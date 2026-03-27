import { getSession } from "@/lib/auth";
import { AuthError } from "@/lib/auth-admin";
import type { Contact } from "@prisma/client";

export async function requireContact(request: Request): Promise<Contact> {
  const session = await getSession(request);

  if (!session || session.type !== "contact") {
    throw new AuthError("Unauthorized", 401);
  }

  return session.contact;
}
