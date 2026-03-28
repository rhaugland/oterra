import { NextResponse } from "next/server";
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

  // Placeholder — future settings will be stored and returned here
  return NextResponse.json({});
}
