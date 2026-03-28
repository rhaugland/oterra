import { createHmac } from "crypto";

// ─── Token cache ────────────────────────────────────────────────────────────

interface TokenCache {
  accessToken: string;
  expiresAt: number; // ms timestamp
}

let tokenCache: TokenCache | null = null;

// ─── JWT helpers (no external JWT library) ──────────────────────────────────

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function buildJwt(payload: Record<string, unknown>, privateKeyPem: string): Promise<string> {
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${header}.${body}`;

  // Use Node.js crypto to sign with RSA-SHA256
  const { createSign } = await import("crypto");
  const sign = createSign("RSA-SHA256");
  sign.update(signingInput);
  sign.end();
  const signature = base64UrlEncode(sign.sign(privateKeyPem));

  return `${signingInput}.${signature}`;
}

// ─── getAccessToken ──────────────────────────────────────────────────────────

export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  const FIVE_MINUTES = 5 * 60 * 1000;

  if (tokenCache && tokenCache.expiresAt - FIVE_MINUTES > now) {
    return tokenCache.accessToken;
  }

  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
  const privateKeyRaw = process.env.DOCUSIGN_PRIVATE_KEY;
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const baseUrl = process.env.DOCUSIGN_BASE_URL;

  if (!integrationKey || !privateKeyRaw || !accountId || !baseUrl) {
    throw new Error("Missing DocuSign environment variables");
  }

  // DocuSign private keys may be stored with literal \n — expand them
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600; // 1 hour

  const jwtPayload = {
    iss: integrationKey,
    sub: accountId,
    aud: new URL(baseUrl).hostname,
    iat,
    exp,
    scope: "signature impersonation",
  };

  const assertion = await buildJwt(jwtPayload, privateKey);

  const res = await fetch(`${baseUrl}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DocuSign token request failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return tokenCache.accessToken;
}

// ─── sendEnvelope ────────────────────────────────────────────────────────────

export async function sendEnvelope(
  contact: { email: string; name: string },
  roomName: string,
  returnUrl: string
): Promise<{ envelopeId: string }> {
  const accessToken = await getAccessToken();
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID!;
  const baseUrl = process.env.DOCUSIGN_BASE_URL!;

  const ndaText = [
    `NON-DISCLOSURE AGREEMENT`,
    ``,
    `This Non-Disclosure Agreement ("Agreement") is entered into by and between the party`,
    `granting access to the data room for the deal known as "${roomName}" and the`,
    `undersigned recipient.`,
    ``,
    `By signing below, the recipient agrees to keep all information accessed through the`,
    `data room strictly confidential and not to disclose it to any third party without`,
    `prior written consent.`,
    ``,
    `Recipient Name: ${contact.name}`,
    `Recipient Email: ${contact.email}`,
    `Deal / Room: ${roomName}`,
    ``,
    `Signature: ____________________________`,
    ``,
    `Date: ________________________________`,
  ].join("\n");

  const documentBase64 = Buffer.from(ndaText).toString("base64");

  const envelope = {
    emailSubject: `NDA for ${roomName} – Please Sign`,
    documents: [
      {
        documentBase64,
        name: "Non-Disclosure Agreement",
        fileExtension: "txt",
        documentId: "1",
      },
    ],
    recipients: {
      signers: [
        {
          email: contact.email,
          name: contact.name,
          recipientId: "1",
          clientUserId: contact.email, // embedded signing
          tabs: {
            signHereTabs: [
              {
                documentId: "1",
                pageNumber: "1",
                xPosition: "100",
                yPosition: "600",
              },
            ],
            dateSignedTabs: [
              {
                documentId: "1",
                pageNumber: "1",
                xPosition: "100",
                yPosition: "650",
              },
            ],
          },
        },
      ],
    },
    status: "sent",
    eventNotification: {
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/docusign`,
      loggingEnabled: "true",
      requireAcknowledgment: "true",
      useSoapInterface: "false",
      includeDocuments: "false",
      envelopeEvents: [
        { envelopeEventStatusCode: "completed" },
        { envelopeEventStatusCode: "declined" },
        { envelopeEventStatusCode: "voided" },
      ],
      recipientEvents: [],
    },
  };

  const res = await fetch(`${baseUrl}/v2.1/accounts/${accountId}/envelopes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(envelope),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DocuSign createEnvelope failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { envelopeId: string };
  return { envelopeId: data.envelopeId };
}

// ─── getEmbeddedSigningUrl ───────────────────────────────────────────────────

export async function getEmbeddedSigningUrl(
  envelopeId: string,
  contact: { email: string; name: string },
  returnUrl: string
): Promise<{ url: string }> {
  const accessToken = await getAccessToken();
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID!;
  const baseUrl = process.env.DOCUSIGN_BASE_URL!;

  const body = {
    returnUrl,
    authenticationMethod: "none",
    email: contact.email,
    userName: contact.name,
    clientUserId: contact.email,
  };

  const res = await fetch(
    `${baseUrl}/v2.1/accounts/${accountId}/envelopes/${envelopeId}/views/recipient`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DocuSign getEmbeddedSigningUrl failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { url: string };
  return { url: data.url };
}

// ─── verifyWebhookSignature ──────────────────────────────────────────────────

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.DOCUSIGN_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("DOCUSIGN_WEBHOOK_SECRET is not configured");
  }

  const expected = createHmac("sha256", secret).update(payload).digest("base64");
  // Constant-time comparison to prevent timing attacks
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}
