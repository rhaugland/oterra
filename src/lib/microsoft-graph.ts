import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";

const GRAPH_API = "https://graph.microsoft.com/v1.0";

/**
 * Refresh the access token using the stored refresh token.
 */
async function refreshAccessToken(integration: {
  id: string;
  refreshToken: string | null;
}): Promise<string> {
  if (!integration.refreshToken) {
    throw new Error("No refresh token — reconnect Microsoft in Settings");
  }

  const clientId = process.env.MS_GRAPH_CLIENT_ID;
  const clientSecret = process.env.MS_GRAPH_CLIENT_SECRET;
  const tenantId = process.env.MS_GRAPH_TENANT_ID || "common";

  if (!clientId || !clientSecret) {
    throw new Error("MS_GRAPH_CLIENT_ID / MS_GRAPH_CLIENT_SECRET not configured");
  }

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: decrypt(integration.refreshToken),
        grant_type: "refresh_token",
        scope: "offline_access Mail.Send User.Read",
      }).toString(),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Microsoft token refresh failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000)
    : null;

  // Update stored tokens
  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      accessToken: encrypt(data.access_token),
      refreshToken: data.refresh_token
        ? encrypt(data.refresh_token)
        : integration.refreshToken,
      expiresAt,
    },
  });

  return data.access_token;
}

/**
 * Get a valid access token — refreshes automatically if expired.
 */
async function getAccessToken(): Promise<{ token: string; senderEmail: string }> {
  const integration = await prisma.integration.findUnique({
    where: { provider: "microsoft" },
  });

  if (!integration) {
    throw new Error("Microsoft not connected — go to Settings to connect your Outlook account");
  }

  const now = new Date();
  const isExpired = integration.expiresAt && integration.expiresAt < now;

  let token: string;
  if (isExpired) {
    token = await refreshAccessToken(integration);
  } else {
    token = decrypt(integration.accessToken);
  }

  return { token, senderEmail: integration.senderEmail || "" };
}

export interface SendEmailParams {
  to: { name: string; email: string };
  subject: string;
  bodyHtml: string;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const { token } = await getAccessToken();

  const message = {
    message: {
      subject: params.subject,
      body: {
        contentType: "HTML",
        content: params.bodyHtml,
      },
      toRecipients: [
        {
          emailAddress: {
            address: params.to.email,
            name: params.to.name,
          },
        },
      ],
    },
    saveToSentItems: true,
  };

  // Use /me/sendMail — sends from whatever account authorized the OAuth flow
  const res = await fetch(`${GRAPH_API}/me/sendMail`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Microsoft Graph sendMail error ${res.status}: ${text}`);
  }
}

export async function isConfigured(): Promise<boolean> {
  const integration = await prisma.integration.findUnique({
    where: { provider: "microsoft" },
  });
  return !!integration;
}
