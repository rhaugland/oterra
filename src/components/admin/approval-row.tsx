"use client";

import { useState } from "react";

interface ApprovalContact {
  id: string;
  name: string;
  email: string;
  company?: string | null;
}

interface ApprovalDataRoom {
  id: string;
  name: string;
}

export interface ApprovalRecord {
  id: string;
  contactId: string;
  dataRoomId: string;
  ndaStatus: string;
  approvalStatus: string;
  contact: ApprovalContact;
  dataRoom: ApprovalDataRoom;
}

interface ApprovalRowProps {
  approval: ApprovalRecord;
  onRefresh: () => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-indigo-500",
    "bg-purple-500",
    "bg-blue-500",
    "bg-teal-500",
    "bg-emerald-500",
    "bg-orange-500",
    "bg-rose-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % colors.length;
  }
  return colors[hash];
}

function NdaBadge({ status }: { status: string }) {
  if (status === "signed") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        NDA Signed ✓
      </span>
    );
  }
  if (status === "sent") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        NDA Sent
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      NDA Not Sent
    </span>
  );
}

export function ApprovalRow({ approval, onRefresh }: ApprovalRowProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(action: "approved" | "denied") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/rooms/${approval.dataRoomId}/access/${approval.id}`,
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

  const initials = getInitials(approval.contact.name);
  const avatarColor = getAvatarColor(approval.contact.name);
  const canApprove = approval.ndaStatus === "signed";

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex-shrink-0 w-9 h-9 rounded-full ${avatarColor} flex items-center justify-center text-white text-xs font-semibold`}
          >
            {initials}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{approval.contact.name}</p>
            <p className="text-xs text-gray-500">{approval.contact.email}</p>
            {approval.contact.company && (
              <p className="text-xs text-gray-400">{approval.contact.company}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className="text-sm text-gray-900">{approval.dataRoom.name}</span>
      </td>
      <td className="px-6 py-4">
        <NdaBadge status={approval.ndaStatus} />
      </td>
      <td className="px-6 py-4">
        {error && <p className="text-xs text-red-600 mb-1">{error}</p>}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleAction("approved")}
            disabled={loading || !canApprove}
            title={!canApprove ? "NDA must be signed before approving" : "Approve access"}
            className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Approve
          </button>
          <button
            onClick={() => handleAction("denied")}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            Deny
          </button>
        </div>
      </td>
    </tr>
  );
}
