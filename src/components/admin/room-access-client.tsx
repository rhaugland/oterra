"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

interface Contact {
  id: string;
  name: string;
  email: string;
  company?: string | null;
}

interface AccessRecord {
  id: string;
  contactId: string;
  ndaStatus: string;
  approvalStatus: string;
  contact: Contact;
}

interface AllContact {
  id: string;
  name: string;
  email: string;
  company?: string | null;
}

interface RoomAccessClientProps {
  roomId: string;
  initialAccesses: AccessRecord[];
  allContacts: AllContact[];
}

function NdaBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    not_sent: "bg-gray-100 text-gray-600",
    sent: "bg-yellow-100 text-yellow-800",
    signed: "bg-green-100 text-green-800",
    declined: "bg-red-100 text-red-700",
    voided: "bg-gray-100 text-gray-500",
  };
  const labels: Record<string, string> = {
    not_sent: "NDA Not Sent",
    sent: "NDA Sent",
    signed: "NDA Signed",
    declined: "NDA Declined",
    voided: "NDA Voided",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function ApprovalBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    denied: "bg-red-100 text-red-700",
    revoked: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {status}
    </span>
  );
}

interface AccessRowProps {
  access: AccessRecord;
  roomId: string;
  onRefresh: () => void;
}

function AccessRow({ access, roomId, onRefresh }: AccessRowProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(action: "approved" | "denied" | "revoked") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/rooms/${roomId}/access/${access.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Action failed");
        return;
      }
      onRefresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleSendNda() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/rooms/${roomId}/access/${access.id}/send-nda`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Failed to send NDA");
        return;
      }
      onRefresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/contacts/${access.contact.id}`}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            {access.contact.name}
          </Link>
          <NdaBadge status={access.ndaStatus} />
          <ApprovalBadge status={access.approvalStatus} />
        </div>
        <p className="text-xs text-gray-500">{access.contact.email}</p>
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {access.ndaStatus === "not_sent" && (
          <button
            onClick={handleSendNda}
            disabled={loading}
            className="px-2.5 py-1 text-xs font-medium border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Send NDA
          </button>
        )}
        {access.approvalStatus === "pending" && (
          <>
            <button
              onClick={() => handleAction("approved")}
              disabled={loading}
              title={access.ndaStatus !== "signed" ? "NDA must be signed first" : ""}
              className="px-2.5 py-1 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => handleAction("denied")}
              disabled={loading}
              className="px-2.5 py-1 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              Deny
            </button>
          </>
        )}
        {access.approvalStatus === "approved" && (
          <button
            onClick={() => handleAction("revoked")}
            disabled={loading}
            className="px-2.5 py-1 text-xs font-medium border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Revoke
          </button>
        )}
      </div>
    </div>
  );
}

interface AssignContactFormProps {
  roomId: string;
  allContacts: AllContact[];
  assignedContactIds: Set<string>;
  onAssigned: () => void;
}

function AssignContactForm({
  roomId,
  allContacts,
  assignedContactIds,
  onAssigned,
}: AssignContactFormProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const available = allContacts.filter(
    (c) =>
      !assignedContactIds.has(c.id) &&
      (c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase()))
  );

  async function assignContact(contactId: string) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/rooms/${roomId}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Failed to assign contact");
        return;
      }
      setOpen(false);
      setSearch("");
      onAssigned();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 px-3 py-1.5 text-xs font-medium border border-dashed border-indigo-400 text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors"
      >
        + Assign Contact
      </button>
    );
  }

  return (
    <div className="mt-3 border border-gray-200 rounded-lg p-3 bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-700">Assign a Contact</span>
        <button
          onClick={() => { setOpen(false); setSearch(""); setError(null); }}
          className="text-gray-400 hover:text-gray-600 text-xs"
        >
          Cancel
        </button>
      </div>
      <input
        type="text"
        placeholder="Search by name or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 mb-2"
      />
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      {available.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-2">
          {search ? "No matching contacts." : "All contacts are already assigned."}
        </p>
      ) : (
        <div className="max-h-48 overflow-y-auto space-y-1">
          {available.map((contact) => (
            <button
              key={contact.id}
              onClick={() => assignContact(contact.id)}
              disabled={submitting}
              className="w-full text-left px-2.5 py-2 text-xs rounded-md hover:bg-white border border-transparent hover:border-gray-200 disabled:opacity-50 transition-colors"
            >
              <p className="font-medium text-gray-900">{contact.name}</p>
              <p className="text-gray-500">{contact.email}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function RoomAccessClient({
  roomId,
  initialAccesses,
  allContacts,
}: RoomAccessClientProps) {
  const [accesses, setAccesses] = useState<AccessRecord[]>(initialAccesses);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/admin/rooms/${roomId}/access`);
    if (res.ok) {
      const data = await res.json();
      setAccesses(data as AccessRecord[]);
    }
  }, [roomId]);

  const assignedContactIds = new Set(accesses.map((a) => a.contactId));

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">
          Contacts ({accesses.length})
        </h3>
      </div>
      <div className="px-4 pb-3">
        {accesses.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            No contacts assigned yet.
          </p>
        ) : (
          <div>
            {accesses.map((access) => (
              <AccessRow
                key={access.id}
                access={access}
                roomId={roomId}
                onRefresh={refresh}
              />
            ))}
          </div>
        )}
        <AssignContactForm
          roomId={roomId}
          allContacts={allContacts}
          assignedContactIds={assignedContactIds}
          onAssigned={refresh}
        />
      </div>
    </div>
  );
}
