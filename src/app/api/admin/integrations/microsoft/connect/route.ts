import { NextResponse } from "next/server";

/**
 * GET /api/admin/integrations/microsoft/connect
 * Redirects the user to Microsoft's OAuth consent screen.
 */
export async function GET() {
  const clientId = process.env.MS_GRAPH_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/admin/integrations/microsoft/callback`;

  if (!clientId) {
    return NextResponse.json(
      { error: "MS_GRAPH_CLIENT_ID not configured" },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: "offline_access Mail.Send User.Read",
    prompt: "consent",
  });

  const tenantId = process.env.MS_GRAPH_TENANT_ID || "common";
  const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params}`;

  return NextResponse.redirect(authUrl);
}
