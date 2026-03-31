"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ── Label maps ──────────────────────────────────────────────────────────────

const ndaLabels: Record<string, string> = {
  signed: "Signed",
  sent: "Pending",
  not_sent: "Not Sent",
  declined: "Declined",
  voided: "Voided",
};

const ndaColors: Record<string, string> = {
  signed: "bg-green-100 text-green-800",
  sent: "bg-yellow-100 text-yellow-800",
  not_sent: "bg-gray-100 text-gray-600",
  declined: "bg-red-100 text-red-800",
  voided: "bg-gray-100 text-gray-500",
};

const investorTypeLabels: Record<string, string> = {
  family_office: "Family Office",
  venture_capital: "VC",
  private_equity: "PE",
  strategic_corporate: "Strategic",
  other: "Other",
};

const geographyLabels: Record<string, string> = {
  us: "US",
  middle_east: "Middle East",
  apac: "APAC",
  europe: "Europe",
  other: "Other",
};

const checkSizeLabels: Record<string, string> = {
  small: "<$500K",
  mid: "$500K–$5M",
  large: "$5M+",
};

// ── Props ───────────────────────────────────────────────────────────────────

interface AvailableContact {
  id: string;
  name: string;
  email: string;
}

interface ViewerData {
  name: string;
  investorType: string | null;
  geography: string | null;
  checkSize: string | null;
  views: number;
  filesViewed: string[];
}

interface RoomCardProps {
  id: string;
  name: string;
  description?: string | null;
  status: "active" | "archived";
  fileCount: number;
  fileNames: string[];
  contactCount: number;
  contactNames: string[];
  ndaGroups: Record<string, { id: string; name: string }[]>;
  investorTypeGroups: Record<string, string[]>;
  geographyGroups: Record<string, string[]>;
  checkSizeGroups: Record<string, string[]>;
  viewData: ViewerData[];
  availableContacts: AvailableContact[];
}

// ── Badge with hover popover ────────────────────────────────────────────────

function HoverBadge({
  label,
  count,
  colorCls,
  names,
}: {
  label: string;
  count: number;
  colorCls: string;
  names: string[];
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium cursor-default ${colorCls}`}
      >
        {count} {label}
      </span>
      {hovered && (
        <span className="absolute z-50 -left-1 top-full pt-1 w-44">
          <span className="block bg-white border border-gray-200 rounded-lg shadow-lg p-2">
            <span className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">{label}</span>
            {names.map((n, i) => (
              <span key={i} className="block text-xs text-gray-700 py-0.5 truncate">{n}</span>
            ))}
          </span>
        </span>
      )}
    </span>
  );
}

function FileHoverBadge({ fileCount, fileNames }: { fileCount: number; fileNames: string[] }) {
  const [hovered, setHovered] = useState(false);

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="cursor-default">
        {fileCount} {fileCount === 1 ? "file" : "files"}
      </span>
      {hovered && fileNames.length > 0 && (
        <span className="absolute z-50 -left-1 top-full pt-1 w-52">
          <span className="block bg-white border border-gray-200 rounded-lg shadow-lg p-2">
            <span className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Files</span>
            {fileNames.slice(0, 10).map((n, i) => (
              <span key={i} className="block text-xs text-gray-700 py-0.5 truncate">{n}</span>
            ))}
            {fileNames.length > 10 && (
              <span className="block text-[10px] text-gray-400 pt-0.5">+{fileNames.length - 10} more</span>
            )}
          </span>
        </span>
      )}
    </span>
  );
}

function ContactHoverBadge({ contactCount, contactNames }: { contactCount: number; contactNames: string[] }) {
  const [hovered, setHovered] = useState(false);

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="cursor-default">
        {contactCount} {contactCount === 1 ? "contact" : "contacts"}
      </span>
      {hovered && contactNames && contactNames.length > 0 && (
        <span className="absolute z-50 -left-1 top-full pt-1 w-52">
          <span className="block bg-white border border-gray-200 rounded-lg shadow-lg p-2">
            <span className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Contacts</span>
            {contactNames.slice(0, 10).map((n, i) => (
              <span key={i} className="block text-xs text-gray-700 py-0.5 truncate">{n}</span>
            ))}
            {contactNames.length > 10 && (
              <span className="block text-[10px] text-gray-400 pt-0.5">+{contactNames.length - 10} more</span>
            )}
          </span>
        </span>
      )}
    </span>
  );
}

// ── NDA badge with send button ───────────────────────────────────────────────

function NdaContactRow({
  contact,
  ndaKey,
  sending,
  onSend,
}: {
  contact: { id: string; name: string };
  ndaKey: string;
  sending: boolean;
  onSend: (contactId: string, e: React.MouseEvent) => void;
}) {
  const canSend = ndaKey === "not_sent" || ndaKey === "sent";

  return (
    <span className="flex items-center justify-between py-1">
      <span className="text-xs text-gray-700 truncate">{contact.name}</span>
      {canSend && (
        <button
          onClick={(e) => onSend(contact.id, e)}
          disabled={sending}
          className="ml-1.5 shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-ottera-red-50 text-ottera-red-700 hover:bg-ottera-red-100 border border-ottera-red-200/60 transition-all disabled:opacity-50"
        >
          {sending ? "..." : ndaKey === "sent" ? "Resend" : "Send NDA"}
        </button>
      )}
    </span>
  );
}

function NdaHoverBadge({
  label,
  ndaKey,
  contacts,
  colorCls,
}: {
  label: string;
  ndaKey: string;
  contacts: { id: string; name: string }[];
  colorCls: string;
}) {
  const [hovered, setHovered] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const router = useRouter();

  async function handleSendNda(contactId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSending(contactId);
    try {
      const res = await fetch(`/api/admin/contacts/${contactId}/send-nda`, {
        method: "POST",
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert((data as { error?: string }).error ?? "Failed to send NDA");
      }
    } finally {
      setSending(null);
    }
  }

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium cursor-default ${colorCls}`}
      >
        {contacts.length} {label}
      </span>
      {hovered && (
        <span className="absolute z-50 -left-1 top-full pt-1 w-52">
          <span
            className="block bg-white border border-gray-200 rounded-lg shadow-lg p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">{label}</span>
            {contacts.map((c) => (
              <NdaContactRow
                key={c.id}
                contact={c}
                ndaKey={ndaKey}
                sending={sending === c.id}
                onSend={handleSendNda}
              />
            ))}
          </span>
        </span>
      )}
    </span>
  );
}

// ── Tag row ─────────────────────────────────────────────────────────────────

function TagRow({
  label,
  groups,
  labelMap,
  colorFn,
}: {
  label: string;
  groups: Record<string, string[]>;
  labelMap: Record<string, string>;
  colorFn?: (key: string) => string;
}) {
  const entries = Object.entries(groups);
  if (entries.length === 0) return null;

  const defaultColor = "bg-gray-100 text-gray-600";

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-12 shrink-0">
        {label}
      </span>
      {entries.map(([key, names]) => (
        <HoverBadge
          key={key}
          label={labelMap[key] ?? key}
          count={names.length}
          colorCls={colorFn ? colorFn(key) : defaultColor}
          names={names}
        />
      ))}
    </div>
  );
}

// ── Card ────────────────────────────────────────────────────────────────────

// ── Icons ──────────────────────────────────────────────────────────────────

function EyeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
      <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
    </svg>
  );
}

// ── Action icon popovers ───────────────────────────────────────────────────

function ViewsSidebar({ viewData, roomName }: { viewData: ViewerData[]; roomName: string }) {
  const [open, setOpen] = useState(false);
  const totalViews = viewData.reduce((sum, v) => sum + v.views, 0);

  return (
    <>
      <span className="relative inline-block">
        <button
          className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          title="Views"
        >
          <EyeIcon />
        </button>
      </span>

      {/* Slide-out sidebar */}
      {open && (
        <div
          className="fixed inset-0 z-[100]"
          onClick={(e) => { e.stopPropagation(); setOpen(false); }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30" />

          {/* Panel */}
          <div
            className="absolute right-0 top-0 h-full w-96 max-w-[90vw] bg-white shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Document Views</h2>
                <p className="text-xs text-gray-500 mt-0.5">{roomName}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(false); }}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>

            {/* Summary bar */}
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-4">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase">Total Views</p>
                <p className="text-lg font-bold text-gray-900">{totalViews}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase">Viewers</p>
                <p className="text-lg font-bold text-gray-900">{viewData.length}</p>
              </div>
            </div>

            {/* Viewer list */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {viewData.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No views yet</p>
              ) : (
                <div className="space-y-4">
                  {viewData.map((v) => (
                    <div key={v.name} className="border border-gray-100 rounded-lg p-3">
                      {/* Name + view count */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-900">{v.name}</span>
                        <span className="text-xs font-medium text-ottera-red-600 bg-ottera-red-50 px-2 py-0.5 rounded-full">
                          {v.views} view{v.views !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Attribute tags */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-2">
                        {v.investorType && (
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700">
                            {investorTypeLabels[v.investorType] ?? v.investorType}
                          </span>
                        )}
                        {v.geography && (
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-50 text-sky-700">
                            {geographyLabels[v.geography] ?? v.geography}
                          </span>
                        )}
                        {v.checkSize && (
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-700">
                            {checkSizeLabels[v.checkSize] ?? v.checkSize}
                          </span>
                        )}
                      </div>

                      {/* Files viewed */}
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Files Viewed</p>
                        {v.filesViewed.map((f) => (
                          <div key={f} className="flex items-center gap-1.5 py-0.5">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-gray-300 shrink-0">
                              <path d="M3.5 2A1.5 1.5 0 002 3.5v9A1.5 1.5 0 003.5 14h9a1.5 1.5 0 001.5-1.5v-7A1.5 1.5 0 0012.5 4H9.621a1.5 1.5 0 01-1.06-.44L7.439 2.44A1.5 1.5 0 006.379 2H3.5z" />
                            </svg>
                            <span className="text-xs text-gray-600 truncate">{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AddContactDropdown({
  roomId,
  availableContacts,
}: {
  roomId: string;
  availableContacts: AvailableContact[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  async function handleAdd(contactId: string) {
    setAdding(contactId);
    try {
      const res = await fetch(`/api/admin/rooms/${roomId}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, dataRoomId: roomId }),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setAdding(null);
    }
  }

  return (
    <span className="relative inline-block">
      <button
        className="p-1 rounded-md text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        title="Add contact"
      >
        <PlusIcon />
      </button>
      {open && (
        <span
          className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 w-52 right-0 top-full mt-1"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Add Contact</span>
          {availableContacts.length === 0 ? (
            <span className="block text-xs text-gray-400 py-0.5">All contacts assigned</span>
          ) : (
            <span className="max-h-40 overflow-y-auto block">
              {availableContacts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleAdd(c.id)}
                  disabled={adding === c.id}
                  className="w-full text-left px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50 rounded disabled:opacity-50 flex items-center justify-between"
                >
                  <span className="truncate">{c.name}</span>
                  {adding === c.id ? (
                    <span className="text-[10px] text-gray-400">Adding...</span>
                  ) : (
                    <span className="text-[10px] text-gray-400">{c.email}</span>
                  )}
                </button>
              ))}
            </span>
          )}
        </span>
      )}
    </span>
  );
}

// ── Card ────────────────────────────────────────────────────────────────────

export function RoomCard({
  id,
  name,
  description,
  status,
  fileCount,
  fileNames,
  contactCount,
  contactNames,
  ndaGroups,
  investorTypeGroups,
  geographyGroups,
  checkSizeGroups,
  viewData,
  availableContacts,
}: RoomCardProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const hasContacts = contactCount > 0;

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete "${name}"? This will remove all files, contacts, and data permanently.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/rooms/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert((data as { error?: string }).error ?? "Failed to delete room");
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      onClick={() => router.push(`/admin/rooms/${id}`)}
      className={`block bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-ottera-red-600/30 transition-all p-5 cursor-pointer ${deleting ? "opacity-50 pointer-events-none" : ""}`}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-base font-semibold text-gray-900 truncate">{name}</h3>
        <div className="flex items-center gap-0.5 shrink-0 ml-2">
          <ViewsSidebar viewData={viewData} roomName={name} />
          <AddContactDropdown roomId={id} availableContacts={availableContacts} />
          <button
            className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            onClick={handleDelete}
            title="Delete room"
          >
            <TrashIcon />
          </button>
          {status === "archived" && (
            <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
              Archived
            </span>
          )}
        </div>
      </div>

      {description && (
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{description}</p>
      )}

      <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
        <FileHoverBadge fileCount={fileCount} fileNames={fileNames} />
        <span className="text-gray-300">&bull;</span>
        <ContactHoverBadge contactCount={contactCount} contactNames={contactNames} />
      </div>

      {hasContacts ? (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-12 shrink-0">
              NDA
            </span>
            {Object.entries(ndaGroups).map(([ndaKey, contacts]) => (
              <NdaHoverBadge
                key={ndaKey}
                label={ndaLabels[ndaKey] ?? ndaKey}
                ndaKey={ndaKey}
                contacts={contacts}
                colorCls={ndaColors[ndaKey] ?? "bg-gray-100 text-gray-600"}
              />
            ))}
          </div>

          <TagRow
            label="Type"
            groups={investorTypeGroups}
            labelMap={investorTypeLabels}
            colorFn={(k) => {
              const m: Record<string, string> = {
                family_office: "bg-purple-100 text-purple-800",
                venture_capital: "bg-blue-100 text-blue-800",
                private_equity: "bg-indigo-100 text-indigo-800",
                strategic_corporate: "bg-teal-100 text-teal-800",
              };
              return m[k] ?? "bg-gray-100 text-gray-600";
            }}
          />
          <TagRow
            label="Geo"
            groups={geographyGroups}
            labelMap={geographyLabels}
            colorFn={(k) => {
              const m: Record<string, string> = {
                us: "bg-sky-100 text-sky-800",
                middle_east: "bg-amber-100 text-amber-800",
                apac: "bg-green-100 text-green-800",
                europe: "bg-rose-100 text-rose-800",
              };
              return m[k] ?? "bg-gray-100 text-gray-600";
            }}
          />
          <TagRow
            label="Size"
            groups={checkSizeGroups}
            labelMap={checkSizeLabels}
            colorFn={(k) => {
              const m: Record<string, string> = {
                small: "bg-gray-100 text-gray-600",
                mid: "bg-orange-100 text-orange-800",
                large: "bg-emerald-100 text-emerald-800",
              };
              return m[k] ?? "bg-gray-100 text-gray-600";
            }}
          />
        </div>
      ) : (
        <span className="text-xs text-gray-400">No contacts</span>
      )}
    </div>
  );
}
