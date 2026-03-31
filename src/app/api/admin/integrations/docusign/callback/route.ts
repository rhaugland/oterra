import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";

/**
 * GET /api/admin/integrations/docusign/callback
 * Handles the OAuth2 redirect from DocuSign after user consents.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/admin/integrations/docusign/callback`;

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

  const clientId = process.env.DOCUSIGN_CLIENT_ID!;
  const clientSecret = process.env.DOCUSIGN_CLIENT_SECRET!;

  // DocuSign uses Basic auth for token exchange
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const tokenRes = await fetch(
    "https://account-d.docusign.com/oauth/token",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }).toString(),
    }
  );

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    console.error("DocuSign token exchange failed:", text);
    return NextResponse.redirect(
      `${appUrl}/admin/settings?tab=connections&error=${encodeURIComponent("Failed to connect DocuSign account")}`
    );
  }

  const tokenData = await tokenRes.json();

  // Get user info to store their name/email
  const userInfoRes = await fetch(
    "https://account-d.docusign.com/oauth/userinfo",
    {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    }
  );

  let userEmail = "";
  let accountId = process.env.DOCUSIGN_ACCOUNT_ID || "";
  if (userInfoRes.ok) {
    const userInfo = await userInfoRes.json();
    userEmail = userInfo.email || "";
    // Use the default account if not set via env
    if (!accountId && userInfo.accounts?.length > 0) {
      const defaultAccount =
        userInfo.accounts.find((a: { is_default: boolean }) => a.is_default) ||
        userInfo.accounts[0];
      accountId = defaultAccount.account_id;
    }
  }

  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000)
    : null;

  await prisma.integration.upsert({
    where: { provider: "docusign" },
    update: {
      accessToken: encrypt(tokenData.access_token),
      refreshToken: tokenData.refresh_token
        ? encrypt(tokenData.refresh_token)
        : null,
      expiresAt,
      senderEmail: userEmail,
      metadata: { accountId },
    },
    create: {
      provider: "docusign",
      accessToken: encrypt(tokenData.access_token),
      refreshToken: tokenData.refresh_token
        ? encrypt(tokenData.refresh_token)
        : null,
      expiresAt,
      senderEmail: userEmail,
      metadata: { accountId },
    },
  });

  return NextResponse.redirect(
    `${appUrl}/admin/settings?tab=connections&connected=docusign`
  );
}
