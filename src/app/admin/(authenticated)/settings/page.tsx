"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: "admin" | "member";
  createdAt: string;
}

interface CurrentUserInfo {
  id: string;
  role: "admin" | "member";
}

type Tab = "team" | "nda";

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("team");

  // Team state
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUserInfo | null>(null);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [teamError, setTeamError] = useState<string | null>(null);

  // Invite form state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Remove state
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const fetchTeam = useCallback(async () => {
    setTeamError(null);
    try {
      const res = await fetch("/api/admin/settings/team");
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setTeamError(data.error ?? "Failed to load team");
        return;
      }
      const data = (await res.json()) as TeamMember[];
      setTeam(data);
    } catch {
      setTeamError("Network error");
    } finally {
      setLoadingTeam(false);
    }
  }, []);

  // Fetch current user info via auth endpoint
  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/auth/me");
      if (res.ok) {
        const data = (await res.json()) as CurrentUserInfo;
        setCurrentUser(data);
      }
    } catch {
      // ignore — we'll infer from team list if needed
    }
  }, []);

  useEffect(() => {
    void fetchTeam();
    void fetchCurrentUser();
  }, [fetchTeam, fetchCurrentUser]);

  const isAdmin = currentUser?.role === "admin";

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);
    setInviteSubmitting(true);
    try {
      const res = await fetch("/api/admin/settings/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: inviteName, email: inviteEmail, role: inviteRole }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setInviteError(data.error ?? "Failed to invite team member");
        return;
      }
      setInviteSuccess(`${inviteName} has been invited. They will receive an email with login instructions.`);
      setInviteName("");
      setInviteEmail("");
      setInviteRole("member");
      setShowInviteForm(false);
      await fetchTeam();
      router.refresh();
    } finally {
      setInviteSubmitting(false);
    }
  }

  async function handleRemove(userId: string) {
    setRemoveError(null);
    setRemovingId(userId);
    try {
      const res = await fetch(`/api/admin/settings/team?userId=${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setRemoveError(data.error ?? "Failed to remove team member");
        return;
      }
      await fetchTeam();
      router.refresh();
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your team and application configuration</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-6">
          {(["team", "nda"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab === "team" ? "Team" : "NDA Template"}
            </button>
          ))}
        </nav>
      </div>

      {/* Team Tab */}
      {activeTab === "team" && (
        <div>
          {!isAdmin && !loadingTeam && (
            <div className="mb-6 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              You need admin access to manage team members.
            </div>
          )}

          {teamError && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {teamError}
            </div>
          )}

          {removeError && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {removeError}
            </div>
          )}

          {inviteSuccess && (
            <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              {inviteSuccess}
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
            {isAdmin && (
              <button
                onClick={() => { setShowInviteForm(true); setInviteError(null); setInviteSuccess(null); }}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
              >
                + Invite Team Member
              </button>
            )}
          </div>

          {loadingTeam ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
              Loading...
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {team.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <p className="text-base font-medium text-gray-500">No team members yet</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      {isAdmin && (
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {team.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {member.name}
                          {currentUser?.id === member.id && (
                            <span className="ml-2 text-xs text-gray-400">(you)</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{member.email}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              member.role === "admin"
                                ? "bg-indigo-100 text-indigo-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {member.role}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4">
                            {currentUser?.id !== member.id ? (
                              <button
                                onClick={() => void handleRemove(member.id)}
                                disabled={removingId === member.id}
                                className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors"
                              >
                                {removingId === member.id ? "Removing..." : "Remove"}
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Invite Form Modal */}
          {showInviteForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Invite Team Member</h2>
                <form onSubmit={(e) => void handleInvite(e)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  {inviteError && (
                    <p className="text-sm text-red-600">{inviteError}</p>
                  )}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => { setShowInviteForm(false); setInviteError(null); }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={inviteSubmitting}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {inviteSubmitting ? "Inviting..." : "Send Invite"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* NDA Template Tab */}
      {activeTab === "nda" && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">NDA Template</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-2xl">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">DocuSign NDA Template</h3>
                <p className="text-sm text-gray-600 mb-4">
                  The NDA template used for data room access is configured directly in your DocuSign account.
                  All NDA signing workflows are managed through DocuSign&apos;s envelope system.
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  To update the NDA template, log in to your DocuSign admin console and modify the template
                  associated with your data room integration. Changes to the template will apply to all future
                  NDA requests.
                </p>
                <a
                  href="https://admin.docusign.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Open DocuSign Admin Console
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <p className="mt-4 text-xs text-gray-400">
                  Future: custom NDA template upload will be available here.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
