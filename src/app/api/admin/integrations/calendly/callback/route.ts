import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";

/**
 * GET /api/admin/integrations/calendly/callback
 * Handles the OAuth2 redirect from Calendly after user consents.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/admin/integrations/calendly/callback`;

  if (error) {
    const desc = req.nextUrl.searchParams.get("error_description") || error;
    return NextResponse.redirect(
      `${appUrl}/admin/settings?tab=connections&error=${encodeURIComponent(desc)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${appUrl}/admin/settings?tab=connections&error=${encodeURIComponent("No authorization code received")}`
    );
  }

  const clientId = process.env.CALENDLY_CLIENT_ID!;
  const clientSecret = process.env.CALENDLY_CLIENT_SECRET!;

  // Exchange code for tokens
  const tokenRes = await fetch("https://auth.calendly.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    console.error("Calendly token exchange failed:", text);
    return NextResponse.redirect(
      `${appUrl}/admin/settings?tab=connections&error=${encodeURIComponent("Failed to connect Calendly account")}`
    );
  }

  const tokenData = await tokenRes.json();

  // Get the user's info to store their scheduling link
  const meRes = await fetch("https://api.calendly.com/users/me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  let schedulingUrl = "";
  let userEmail = "";
  if (meRes.ok) {
    const meData = await meRes.json();
    schedulingUrl = meData.resource?.scheduling_url || "";
    userEmail = meData.resource?.email || "";
  }

  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000)
    : null;

  await prisma.integration.upsert({
    where: { provider: "calendly" },
    update: {
      accessToken: encrypt(tokenData.access_token),
      refreshToken: tokenData.refresh_token
        ? encrypt(tokenData.refresh_token)
        : null,
      expiresAt,
      senderEmail: userEmail,
      metadata: { schedulingUrl },
    },
    create: {
      provider: "calendly",
      accessToken: encrypt(tokenData.access_token),
      refreshToken: tokenData.refresh_token
        ? encrypt(tokenData.refresh_token)
        : null,
      expiresAt,
      senderEmail: userEmail,
      metadata: { schedulingUrl },
    },
  });

  return NextResponse.redirect(
    `${appUrl}/admin/settings?tab=connections&connected=calendly`
  );
}
