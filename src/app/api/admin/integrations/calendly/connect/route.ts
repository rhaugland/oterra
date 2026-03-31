import { NextResponse } from "next/server";

/**
 * GET /api/admin/integrations/calendly/connect
 * Redirects the user to Calendly's OAuth consent screen.
 */
export async function GET() {
  const clientId = process.env.CALENDLY_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/admin/integrations/calendly/callback`;

  if (!clientId) {
    return NextResponse.json(
      { error: "CALENDLY_CLIENT_ID not configured" },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
  });

  const authUrl = `https://auth.calendly.com/oauth/authorize?${params}`;

  return NextResponse.redirect(authUrl);
}
