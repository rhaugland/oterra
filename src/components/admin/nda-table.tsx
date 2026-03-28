"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface NdaRow {
  accessId: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  contactCompany?: string | null;
  roomId: string;
  roomName: string;
  ndaStatus: string;
  approvalStatus: string;
  envelopeId?: string | null;
  createdAt: string;
}

interface NdaTableProps {
  rows: NdaRow[];
}

const ndaBadge: Record<string, { label: string; cls: string }> = {
  not_sent: { label: "Not Sent", cls: "bg-gray-100 text-gray-600" },
  sent: { label: "Pending", cls: "bg-yellow-100 text-yellow-800" },
  signed: { label: "Signed", cls: "bg-green-100 text-green-800" },
  declined: { label: "Declined", cls: "bg-red-100 text-red-700" },
  voided: { label: "Voided", cls: "bg-gray-100 text-gray-500" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function dispatchMagicLink(row: NdaRow) {
  window.dispatchEvent(
    new CustomEvent("email-fab:open", {
      detail: {
        contactId: row.contactId,
        contactName: row.contactName,
        contactEmail: row.contactEmail,
        contactCompany: row.contactCompany,
        action: "magic-link",
        roomId: row.roomId,
        roomName: row.roomName,
      },
    })
  );
}

export function NdaTable({ rows }: NdaTableProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      // Exclude signed from this table — they go in the Complete section
      if (r.ndaStatus === "signed") return false;
      if (filter && r.ndaStatus !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          r.contactName.toLowerCase().includes(q) ||
          r.contactEmail.toLowerCase().includes(q) ||
          (r.contactCompany ?? "").toLowerCase().includes(q) ||
          r.roomName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rows, filter, search]);

  async function handleSendNda(accessId: string) {
    if (!confirm("Send NDA via DocuSign to this contact?")) return;

    setSendingId(accessId);
    try {
      const res = await fetch("/api/admin/ndas/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert((data as { error?: string }).error ?? "Failed to send NDA");
      } else {
        router.refresh();
      }
    } finally {
      setSendingId(null);
    }
  }

  function getMailtoLink(row: NdaRow) {
    const subject = encodeURIComponent(`NDA for ${row.roomName}`);
    const body = encodeURIComponent(
      `Hi ${row.contactName},\n\nPlease find attached the NDA for the data room "${row.roomName}". ` +
      `Once you have reviewed and signed, your access will be activated.\n\nBest regards`
    );
    return `mailto:${row.contactEmail}?subject=${subject}&body=${body}`;
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search contacts or rooms..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ottera-red-600"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-ottera-red-600 bg-white"
        >
          <option value="">All statuses</option>
          <option value="not_sent">Not Sent</option>
          <option value="sent">Pending</option>
          <option value="declined">Declined</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">
            {search || filter ? "No NDAs match your filters." : "No pending NDAs. All contacts are either signed or not yet assigned."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Data Room
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  NDA Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Assigned
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((row) => {
                const badge = ndaBadge[row.ndaStatus] ?? ndaBadge.not_sent;
                const canSend = row.ndaStatus === "not_sent" || row.ndaStatus === "declined" || row.ndaStatus === "voided";
                const canResend = row.ndaStatus === "sent";
                const isSending = sendingId === row.accessId;

                return (
                  <tr key={row.accessId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/admin/contacts/${row.contactId}`} className="block">
                        <p className="text-sm font-medium text-gray-900">{row.contactName}</p>
                        <p className="text-xs text-gray-500">
                          {row.contactEmail}
                          {row.contactCompany && ` · ${row.contactCompany}`}
                        </p>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/rooms/${row.roomId}`} className="text-sm text-ottera-red-600 hover:text-ottera-red-700">
                        {row.roomName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">{formatDate(row.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {(canSend || canResend) && (
                          <button
                            onClick={() => handleSendNda(row.accessId)}
                            disabled={isSending}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-lg bg-ottera-red-600 text-white hover:bg-ottera-red-700 disabled:opacity-50 transition-colors"
                          >
                            {isSending ? "Sending..." : canResend ? "Resend NDA" : "Send NDA"}
                          </button>
                        )}
                        {(canSend || canResend) && (
                          <a
                            href={getMailtoLink(row)}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                            title="Open in email client (Outlook)"
                          >
                            Email
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Complete section — signed NDAs with resend access ────────────────────────

export function CompletedNdaTable({ rows }: NdaTableProps) {
  const signed = rows.filter((r) => r.ndaStatus === "signed");

  if (signed.length === 0) return null;

  return (
    <div className="mt-10">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Complete</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Signed NDAs — resend data room access if a contact needs a reminder
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Data Room
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                NDA Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Signed
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {signed.map((row) => (
              <tr key={row.accessId} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/admin/contacts/${row.contactId}`} className="block">
                    <p className="text-sm font-medium text-gray-900">{row.contactName}</p>
                    <p className="text-xs text-gray-500">
                      {row.contactEmail}
                      {row.contactCompany && ` · ${row.contactCompany}`}
                    </p>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/rooms/${row.roomId}`} className="text-sm text-ottera-red-600 hover:text-ottera-red-700">
                    {row.roomName}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Signed
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-500">{formatDate(row.createdAt)}</span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => dispatchMagicLink(row)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Resend Data Room Access
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
