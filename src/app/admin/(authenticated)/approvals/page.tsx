"use client";

import { useState, useCallback, useEffect } from "react";
import { ApprovalRow } from "@/components/admin/approval-row";
import type { ApprovalRecord } from "@/components/admin/approval-row";

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApprovals = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/approvals");
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Failed to load approvals");
        return;
      }
      const data = (await res.json()) as ApprovalRecord[];
      setApprovals(data);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchApprovals();
  }, [fetchApprovals]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Approval Queue</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review pending data room access requests
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
          Loading...
        </div>
      ) : approvals.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg flex flex-col items-center justify-center py-16 text-gray-400">
          <p className="text-base font-medium text-gray-500">No pending approvals</p>
          <p className="text-sm mt-1">All access requests have been reviewed.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Room
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  NDA Status
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {approvals.map((approval) => (
                <ApprovalRow
                  key={approval.id}
                  approval={approval}
                  onRefresh={fetchApprovals}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
