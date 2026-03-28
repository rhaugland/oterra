"use client";

import { useState, useCallback, useEffect } from "react";
import type { ActorType } from "@prisma/client";

interface AuditEntry {
  id: string;
  action: string;
  actorType: ActorType;
  actorId: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface AuditResponse {
  entries: AuditEntry[];
  nextCursor: string | null;
}

const ACTION_OPTIONS = [
  "access.approved",
  "access.denied",
  "access.revoked",
  "nda.sent",
  "room.created",
  "room.updated",
  "room.archived",
  "file.uploaded",
  "file.deleted",
  "contact.created",
  "contact.updated",
];

const RESOURCE_TYPE_OPTIONS = [
  "DataRoomAccess",
  "DataRoom",
  "File",
  "Contact",
];

const ACTOR_TYPE_OPTIONS: ActorType[] = ["user", "contact", "system"];

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ActionBadge({ action }: { action: string }) {
  const isApprove = action.includes("approved");
  const isDeny = action.includes("denied") || action.includes("revoked");
  const baseClass = "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium";
  const colorClass = isApprove
    ? "bg-green-100 text-green-800"
    : isDeny
    ? "bg-red-100 text-red-700"
    : "bg-ottera-red-100 text-ottera-red-700";
  return <span className={`${baseClass} ${colorClass}`}>{action}</span>;
}

export function AuditTable() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterAction, setFilterAction] = useState("");
  const [filterActorType, setFilterActorType] = useState("");
  const [filterResourceType, setFilterResourceType] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  function buildUrl(cursor?: string) {
    const params = new URLSearchParams();
    if (filterAction) params.set("action", filterAction);
    if (filterActorType) params.set("actorType", filterActorType);
    if (filterResourceType) params.set("resourceType", filterResourceType);
    if (filterFrom) params.set("from", filterFrom);
    if (filterTo) params.set("to", filterTo);
    if (cursor) params.set("cursor", cursor);
    params.set("limit", "50");
    return `/api/admin/audit?${params.toString()}`;
  }

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    setEntries([]);
    setNextCursor(null);
    try {
      const res = await fetch(buildUrl());
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Failed to load audit log");
        return;
      }
      const data = (await res.json()) as AuditResponse;
      setEntries(data.entries);
      setNextCursor(data.nextCursor);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterAction, filterActorType, filterResourceType, filterFrom, filterTo]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await fetch(buildUrl(nextCursor));
      if (!res.ok) return;
      const data = (await res.json()) as AuditResponse;
      setEntries((prev) => [...prev, ...data.entries]);
      setNextCursor(data.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div>
      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Action</label>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ottera-red-600"
          >
            <option value="">All actions</option>
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Actor Type</label>
          <select
            value={filterActorType}
            onChange={(e) => setFilterActorType(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ottera-red-600"
          >
            <option value="">All actor types</option>
            {ACTOR_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Resource Type</label>
          <select
            value={filterResourceType}
            onChange={(e) => setFilterResourceType(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ottera-red-600"
          >
            <option value="">All resources</option>
            {RESOURCE_TYPE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">From</label>
          <input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ottera-red-600"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">To</label>
          <input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ottera-red-600"
          />
        </div>

        {(filterAction || filterActorType || filterResourceType || filterFrom || filterTo) && (
          <button
            onClick={() => {
              setFilterAction("");
              setFilterActorType("");
              setFilterResourceType("");
              setFilterFrom("");
              setFilterTo("");
            }}
            className="px-3 py-1.5 text-sm text-gray-500 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Action
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Actor
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Resource
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-400">
                  No audit log entries found.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-3">
                    <ActionBadge action={entry.action} />
                  </td>
                  <td className="px-6 py-3">
                    <p className="text-sm text-gray-900 font-medium capitalize">
                      {entry.actorType}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">{entry.actorId.slice(0, 8)}...</p>
                  </td>
                  <td className="px-6 py-3">
                    <p className="text-sm text-gray-900">{entry.resourceType}</p>
                    <p className="text-xs text-gray-400 font-mono">{entry.resourceId.slice(0, 8)}...</p>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {formatDate(entry.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {nextCursor && (
          <div className="px-6 py-4 border-t border-gray-100 flex justify-center">
            <button
              onClick={() => void loadMore()}
              disabled={loadingMore}
              className="px-4 py-2 text-sm font-medium text-ottera-red-600 border border-ottera-red-600/30 rounded-md hover:bg-ottera-red-50 disabled:opacity-50 transition-colors"
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
