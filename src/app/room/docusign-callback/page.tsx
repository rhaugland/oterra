"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type SigningEvent = "signing_complete" | "cancel" | "decline" | "exception" | string;

type PollingState =
  | { phase: "polling" }
  | { phase: "signed" }
  | { phase: "processing" }
  | { phase: "fallback" };

async function fetchNdaStatus(accessId: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/contact/nda-status/${encodeURIComponent(accessId)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { ndaStatus: string };
    return data.ndaStatus;
  } catch {
    return null;
  }
}

function useNdaStatusPolling(
  accessId: string | null,
  enabled: boolean
): PollingState {
  const [state, setState] = useState<PollingState>({ phase: "polling" });

  useEffect(() => {
    if (!enabled || !accessId) return;

    let attempts = 0;
    const MAX_ATTEMPTS = 3;
    const INTERVAL_MS = 2000;

    const poll = async () => {
      attempts += 1;
      const status = await fetchNdaStatus(accessId);

      if (status === "signed") {
        setState({ phase: "signed" });
        return;
      }

      if (attempts < MAX_ATTEMPTS) {
        setTimeout(poll, INTERVAL_MS);
      } else if (attempts === MAX_ATTEMPTS) {
        setState({ phase: "processing" });
        // After showing "processing" briefly, fall back
        setTimeout(() => {
          setState({ phase: "fallback" });
        }, 3000);
      }
    };

    // Start first poll after initial delay
    setTimeout(poll, INTERVAL_MS);
  }, [enabled, accessId]);

  return state;
}

export default function DocuSignCallbackPage() {
  const searchParams = useSearchParams();
  const event = (searchParams.get("event") ?? "") as SigningEvent;
  const accessId = searchParams.get("accessId");

  const isSigningComplete = event === "signing_complete";
  const pollingState = useNdaStatusPolling(accessId, isSigningComplete);

  if (event === "signing_complete") {
    if (pollingState.phase === "polling") {
      return (
        <CallbackLayout title="Processing…">
          <p className="text-gray-600">Verifying your signature, please wait…</p>
        </CallbackLayout>
      );
    }

    if (pollingState.phase === "signed") {
      return (
        <CallbackLayout title="NDA Signed">
          <p className="text-gray-700">
            Thank you. Your NDA has been signed and is awaiting approval.
          </p>
          <PortalLink />
        </CallbackLayout>
      );
    }

    if (pollingState.phase === "processing") {
      return (
        <CallbackLayout title="Processing Your Signature…">
          <p className="text-gray-600">Processing your signature…</p>
        </CallbackLayout>
      );
    }

    // fallback
    return (
      <CallbackLayout title="NDA Received">
        <p className="text-gray-700">
          Your NDA has been received and is being processed. You will be notified
          once it has been reviewed.
        </p>
        <PortalLink />
      </CallbackLayout>
    );
  }

  if (event === "cancel") {
    return (
      <CallbackLayout title="Signing Cancelled">
        <p className="text-gray-700">
          You cancelled signing. You can retry when you are ready.
        </p>
        <PortalLink label="Return to portal to retry" />
      </CallbackLayout>
    );
  }

  if (event === "decline") {
    return (
      <CallbackLayout title="NDA Declined">
        <p className="text-gray-700">You declined to sign the NDA.</p>
        <p className="text-gray-500 text-sm mt-2">
          If you have questions about the agreement, please contact the deal team
          directly.
        </p>
        <PortalLink />
      </CallbackLayout>
    );
  }

  if (event === "exception") {
    return (
      <CallbackLayout title="Something Went Wrong">
        <p className="text-gray-700">
          An error occurred during the signing process. Please try again.
        </p>
        <PortalLink label="Return to portal to retry" />
      </CallbackLayout>
    );
  }

  // Unknown event — generic fallback
  return (
    <CallbackLayout title="Signing Complete">
      <p className="text-gray-700">
        Thank you. Your response has been recorded.
      </p>
      <PortalLink />
    </CallbackLayout>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function CallbackLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-xl font-semibold text-gray-900 mb-4">{title}</h1>
        {children}
      </div>
    </div>
  );
}

function PortalLink({ label = "Return to portal" }: { label?: string }) {
  return (
    <div className="mt-6">
      <Link
        href="/portal"
        className="text-sm text-blue-600 hover:text-blue-800 underline underline-offset-2"
      >
        {label}
      </Link>
    </div>
  );
}
