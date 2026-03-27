import { getSession } from "@/lib/auth";
import type { User } from "@prisma/client";

const MUTATION_METHODS = new Set(["POST", "PATCH", "DELETE", "PUT"]);

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: number = 401
  ) {
    super(message);
    this.name = "AuthError";
  }
}

function checkCsrf(request: Request): void {
  if (!MUTATION_METHODS.has(request.method.toUpperCase())) return;

  const origin = request.headers.get("origin");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) return; // skip in environments without APP_URL configured

  if (!origin || origin !== appUrl) {
    throw new AuthError("CSRF check failed", 403);
  }
}

export async function requireAdmin(request: Request): Promise<User> {
  checkCsrf(request);

  const session = await getSession(request);

  if (!session || session.type !== "user") {
    throw new AuthError("Unauthorized", 401);
  }

  return session.user;
}

export async function requireAdminRole(request: Request): Promise<User> {
  const user = await requireAdmin(request);

  if (user.role !== "admin") {
    throw new AuthError("Forbidden: admin role required", 403);
  }

  return user;
}
