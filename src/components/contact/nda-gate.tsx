"use client";

import { useState } from "react";

interface AccessRecord {
  id: string;
  ndaStatus: string;
  approvalStatus: string;
}

interface Room {
  id: string;
  name: string;
  status: string;
}

interface NdaGateProps {
  access: AccessRecord;
  room: Room;
}

export function NdaGate({ access, room }: NdaGateProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignNda() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/contact/rooms/${room.id}/sign-nda`);
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Could not retrieve signing URL. Please try again.");
        return;
      }
      const data = (await res.json()) as { url: string };
      window.location.href = data.url;
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (room.status === "archived") {
    return (
      <GateMessage
        title="Data Room Archived"
        message="This data room has been archived."
        variant="gray"
      />
    );
  }

  if (access.approvalStatus === "revoked") {
    return (
      <GateMessage
        title="Access Revoked"
        message="Your access to this data room has been revoked."
        variant="red"
      />
    );
  }

  if (access.approvalStatus === "denied") {
    return (
      <GateMessage
        title="Access Denied"
        message="Access to this data room has been denied."
        variant="red"
      />
    );
  }

  if (access.ndaStatus === "not_sent") {
    return (
      <GateMessage
        title="NDA Being Prepared"
        message="Your NDA is being prepared. You'll be able to sign it shortly."
        variant="yellow"
      />
    );
  }

  if (access.ndaStatus === "sent") {
    return (
      <div className="max-w-md mx-auto text-center">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-8">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-amber-900 mb-2">Sign Your NDA</h2>
          <p className="text-sm text-amber-700 mb-6">
            Please sign the NDA to access this data room.
          </p>
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 mb-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <button
            onClick={handleSignNda}
            disabled={loading}
            className="inline-flex items-center gap-1 px-5 py-2.5 bg-amber-600 text-white text-sm font-medium rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Loading…" : "Sign NDA →"}
          </button>
        </div>
      </div>
    );
  }

  if (access.ndaStatus === "signed" && access.approvalStatus === "pending") {
    return (
      <GateMessage
        title="Awaiting Approval"
        message="Your NDA has been signed. Awaiting admin approval."
        variant="yellow"
      />
    );
  }

  return null;
}

interface GateMessageProps {
  title: string;
  message: string;
  variant: "yellow" | "red" | "gray";
}

function GateMessage({ title, message, variant }: GateMessageProps) {
  const styles = {
    yellow: {
      container: "bg-amber-50 border-amber-200",
      icon: "bg-amber-100",
      iconColor: "text-amber-600",
      title: "text-amber-900",
      text: "text-amber-700",
    },
    red: {
      container: "bg-red-50 border-red-200",
      icon: "bg-red-100",
      iconColor: "text-red-600",
      title: "text-red-900",
      text: "text-red-700",
    },
    gray: {
      container: "bg-gray-50 border-gray-200",
      icon: "bg-gray-100",
      iconColor: "text-gray-500",
      title: "text-gray-800",
      text: "text-gray-600",
    },
  }[variant];

  return (
    <div className="max-w-md mx-auto text-center">
      <div className={`border rounded-lg p-8 ${styles.container}`}>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${styles.icon}`}>
          <svg className={`w-6 h-6 ${styles.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className={`text-lg font-semibold mb-2 ${styles.title}`}>{title}</h2>
        <p className={`text-sm ${styles.text}`}>{message}</p>
      </div>
    </div>
  );
}
