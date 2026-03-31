import { NextResponse } from "next/server";

/**
 * GET /api/admin/integrations/docusign/connect
 * Redirects the user to DocuSign's OAuth consent screen.
 */
export async function GET() {
  const clientId = process.env.DOCUSIGN_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/admin/integrations/docusign/callback`;

  if (!clientId) {
    return NextResponse.json(
      { error: "DOCUSIGN_CLIENT_ID not configured" },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    response_type: "code",
    scope: "signature",
    client_id: clientId,
    redirect_uri: redirectUri,
  });

  // Use demo auth server — switch to account.docusign.com for production
  const authUrl = `https://account-d.docusign.com/oauth/auth?${params}`;

  return NextResponse.redirect(authUrl);
}
