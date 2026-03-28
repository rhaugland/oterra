const GRAPH_API = "https://graph.microsoft.com/v1.0";
const LOGIN_URL = "https://login.microsoftonline.com";

interface GraphConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  senderEmail: string;
}

function getConfig(): GraphConfig {
  const tenantId = process.env.MS_GRAPH_TENANT_ID;
  const clientId = process.env.MS_GRAPH_CLIENT_ID;
  const clientSecret = process.env.MS_GRAPH_CLIENT_SECRET;
  const senderEmail = process.env.MS_GRAPH_SENDER_EMAIL;

  if (!tenantId || !clientId || !clientSecret || !senderEmail) {
    throw new Error(
      "Microsoft Graph not configured — set MS_GRAPH_TENANT_ID, MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET, and MS_GRAPH_SENDER_EMAIL"
    );
  }

  return { tenantId, clientId, clientSecret, senderEmail };
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const config = getConfig();
  const tokenUrl = `${LOGIN_URL}/${config.tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Microsoft Graph token error ${res.status}: ${text}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}

export interface SendEmailParams {
  to: { name: string; email: string };
  subject: string;
  bodyHtml: string;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const config = getConfig();
  const token = await getAccessToken();

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

  const res = await fetch(
    `${GRAPH_API}/users/${config.senderEmail}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Microsoft Graph sendMail error ${res.status}: ${text}`);
  }
}

export function isConfigured(): boolean {
  return !!(
    process.env.MS_GRAPH_TENANT_ID &&
    process.env.MS_GRAPH_CLIENT_ID &&
    process.env.MS_GRAPH_CLIENT_SECRET &&
    process.env.MS_GRAPH_SENDER_EMAIL
  );
}
