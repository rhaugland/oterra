import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";

/**
 * GET /api/admin/integrations/microsoft/callback
 * Handles the OAuth2 redirect from Microsoft after user consents.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/admin/integrations/microsoft/callback`;

  if (error) {
    const desc = req.nextUrl.searchParams.get("error_description") || error;
    return NextResponse.redirect(
      `${appUrl}/admin/settings?error=${encodeURIComponent(desc)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${appUrl}/admin/settings?error=${encodeURIComponent("No authorization code received")}`
    );
  }

  const clientId = process.env.MS_GRAPH_CLIENT_ID!;
  const clientSecret = process.env.MS_GRAPH_CLIENT_SECRET!;
  const tenantId = process.env.MS_GRAPH_TENANT_ID || "common";

  // Exchange code for tokens
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        scope: "offline_access Mail.Send User.Read",
      }).toString(),
    }
  );

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    console.error("Microsoft token exchange failed:", text);
    return NextResponse.redirect(
      `${appUrl}/admin/settings?error=${encodeURIComponent("Failed to connect Microsoft account")}`
    );
  }

  const tokenData = await tokenRes.json();

  // Get the user's email address via /me
  const meRes = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  let senderEmail = "";
  if (meRes.ok) {
    const meData = await meRes.json();
    senderEmail = meData.mail || meData.userPrincipalName || "";
  }

  // Store encrypted tokens
  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000)
    : null;

  await prisma.integration.upsert({
    where: { provider: "microsoft" },
    update: {
      accessToken: encrypt(tokenData.access_token),
      refreshToken: tokenData.refresh_token
        ? encrypt(tokenData.refresh_token)
        : null,
      expiresAt,
      senderEmail,
    },
    create: {
      provider: "microsoft",
      accessToken: encrypt(tokenData.access_token),
      refreshToken: tokenData.refresh_token
        ? encrypt(tokenData.refresh_token)
        : null,
      expiresAt,
      senderEmail,
    },
  });

  return NextResponse.redirect(
    `${appUrl}/admin/settings?connected=microsoft`
  );
}
