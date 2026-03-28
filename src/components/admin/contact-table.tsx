"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface NdaStatusEntry {
  roomId: string;
  roomName: string;
  ndaStatus: string;
  approvalStatus: string;
}

interface RecentView {
  id: string;
  fileId: string;
  fileName: string;
  roomId: string | null;
  roomName: string;
  timestamp: string;
}

interface ContactRow {
  id: string;
  name: string;
  email: string;
  company?: string | null;
  status: string;
  investorType?: string | null;
  geography?: string | null;
  checkSize?: string | null;
  roomCount: number;
  approvalCounts: {
    approved: number;
    pending: number;
    denied: number;
  };
  ndaStatuses: NdaStatusEntry[];
  viewCount: number;
  recentViews: RecentView[];
}

interface DataRoomOption {
  id: string;
  name: string;
}

interface ContactTableProps {
  contacts: ContactRow[];
  dataRooms: DataRoomOption[];
}

// ── Label maps ────────────────────────────────────────────────────────────────

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

// ── Badge colours ─────────────────────────────────────────────────────────────

const investorTypeColors: Record<string, string> = {
  family_office: "bg-purple-100 text-purple-800",
  venture_capital: "bg-blue-100 text-blue-800",
  private_equity: "bg-ottera-red-100 text-ottera-red-700",
  strategic_corporate: "bg-teal-100 text-teal-800",
  other: "bg-gray-100 text-gray-600",
};

const geographyColors: Record<string, string> = {
  us: "bg-sky-100 text-sky-800",
  middle_east: "bg-amber-100 text-amber-800",
  apac: "bg-green-100 text-green-800",
  europe: "bg-rose-100 text-rose-800",
  other: "bg-gray-100 text-gray-600",
};

const checkSizeColors: Record<string, string> = {
  small: "bg-gray-100 text-gray-600",
  mid: "bg-orange-100 text-orange-800",
  large: "bg-emerald-100 text-emerald-800",
};

const ndaColors: Record<string, string> = {
  not_sent: "bg-gray-100 text-gray-600",
  sent: "bg-yellow-100 text-yellow-800",
  signed: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-700",
  voided: "bg-gray-100 text-gray-500",
};

const ndaLabels: Record<string, string> = {
  not_sent: "Not Sent",
  sent: "Sent",
  signed: "Signed",
  declined: "Declined",
  voided: "Voided",
};

// ── Small badge helpers ───────────────────────────────────────────────────────

function Badge({
  value,
  labels,
  colors,
}: {
  value: string | null | undefined;
  labels: Record<string, string>;
  colors: Record<string, string>;
}) {
  if (!value) return <span className="text-gray-300 text-xs">—</span>;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[value] ?? "bg-gray-100 text-gray-600"}`}
    >
      {labels[value] ?? value}
    </span>
  );
}

const ndaPriority: Record<string, number> = {
  signed: 4,
  sent: 3,
  not_sent: 2,
  declined: 1,
  voided: 0,
};

function GlobalNdaStatus({ contact }: { contact: ContactRow }) {
  const { ndaStatuses } = contact;
  if (ndaStatuses.length === 0) {
    return <span className="text-gray-300 text-xs">—</span>;
  }

  // Show the single highest-priority NDA status across all rooms
  const best = ndaStatuses.reduce((a, b) =>
    (ndaPriority[a.ndaStatus] ?? 0) >= (ndaPriority[b.ndaStatus] ?? 0) ? a : b
  );

  const isSigned = best.ndaStatus === "signed";

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ndaColors[best.ndaStatus] ?? "bg-gray-100 text-gray-600"}`}
      >
        {ndaLabels[best.ndaStatus] ?? best.ndaStatus}
      </span>
      {isSigned && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // If only one room, go straight to compose; otherwise let FAB show room selector
            const rooms = ndaStatuses;
            if (rooms.length === 1) {
              window.dispatchEvent(
                new CustomEvent("email-fab:open", {
                  detail: {
                    contactId: contact.id,
                    contactName: contact.name,
                    contactEmail: contact.email,
                    contactCompany: contact.company,
                    action: "magic-link",
                    roomId: rooms[0].roomId,
                    roomName: rooms[0].roomName,
                  },
                })
              );
            } else {
              window.dispatchEvent(
                new CustomEvent("email-fab:open", {
                  detail: {
                    contactId: contact.id,
                    contactName: contact.name,
                    contactEmail: contact.email,
                    contactCompany: contact.company,
                    action: "magic-link",
                    rooms: rooms.map((r) => ({ roomId: r.roomId, roomName: r.roomName })),
                  },
                })
              );
            }
          }}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60 transition-colors"
          title="Send data room access"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Send Access
        </button>
      )}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ViewsCell({
  viewCount,
  recentViews,
}: {
  viewCount: number;
  recentViews: RecentView[];
}) {
  if (viewCount === 0) {
    return <span className="text-gray-300 text-xs">0</span>;
  }

  return (
    <div className="relative group inline-block">
      <span className="text-sm text-gray-700 cursor-pointer underline decoration-dotted">
        {viewCount} {viewCount === 1 ? "view" : "views"}
      </span>
      <div className="absolute z-50 hidden group-hover:block bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-72 right-0 bottom-full mb-1 max-h-80 overflow-y-auto">
        <div className="text-xs font-semibold text-gray-700 mb-2">Files Viewed</div>
        {recentViews.map((v) => (
          <div key={v.id} className="text-xs text-gray-600 py-1 border-b border-gray-100 last:border-0">
            <div className="font-medium text-gray-800 truncate">{v.fileName}</div>
            <div className="text-gray-500">
              {v.roomName} · {formatDate(v.timestamp)}
            </div>
          </div>
        ))}
        {viewCount > 10 && (
          <div className="text-xs text-gray-400 pt-1">
            +{viewCount - 10} more — see contact detail
          </div>
        )}
      </div>
    </div>
  );
}

// ── Send buttons ─────────────────────────────────────────────────────────────

function SendButtons({ contactId, contactEmail }: { contactId: string; contactEmail: string }) {
  const router = useRouter();
  const [sendingNda, setSendingNda] = useState(false);

  async function handleSendNda() {
    setSendingNda(true);
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
      setSendingNda(false);
    }
  }

  function handleSendCalendly() {
    // Open a mailto with a Calendly link placeholder
    const subject = encodeURIComponent("Schedule a meeting");
    const body = encodeURIComponent("Hi,\n\nPlease use the link below to schedule a meeting:\n\n[Your Calendly Link]\n\nBest regards");
    window.open(`mailto:${contactEmail}?subject=${subject}&body=${body}`, "_blank");
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendNda(); }}
        disabled={sendingNda}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-ottera-red-50 text-ottera-red-700 hover:bg-ottera-red-100 border border-ottera-red-200/60 transition-colors disabled:opacity-50"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
          <path fillRule="evenodd" d="M4 2a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5V6.621a1.5 1.5 0 0 0-.44-1.06L9.94 2.439A1.5 1.5 0 0 0 8.878 2H4Zm4.56 6.22a.75.75 0 0 0-1.12 0l-2 2.25a.75.75 0 1 0 1.12 1l1.19-1.338V14a.75.75 0 0 0 1.5 0v-3.868l1.19 1.338a.75.75 0 1 0 1.12-1l-2-2.25Z" clipRule="evenodd" />
        </svg>
        NDA
      </button>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendCalendly(); }}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
          <path fillRule="evenodd" d="M4 1.75a.75.75 0 0 1 1.5 0V3h5V1.75a.75.75 0 0 1 1.5 0V3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2V1.75ZM4.5 6a1 1 0 0 0-1 1v4.5a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-7Z" clipRule="evenodd" />
        </svg>
        Calendly
      </button>
    </div>
  );
}

// ── Sort types ────────────────────────────────────────────────────────────────

type SortKey = "name" | "company" | "investorType" | "geography" | "checkSize" | "roomCount" | "viewCount";
type SortDir = "asc" | "desc";

function SortHeader({
  label,
  sortKey,
  current,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={`text-gray-400 ${active ? "text-ottera-red-600" : ""}`}>
          {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </span>
    </th>
  );
}

// ── Filter dropdown ───────────────────────────────────────────────────────────

function FilterSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-ottera-red-600 bg-white"
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ── Add-to-room dropdown ──────────────────────────────────────────────────────

function AddToRoomDropdown({
  contactId,
  assignedRoomIds,
  dataRooms,
}: {
  contactId: string;
  assignedRoomIds: string[];
  dataRooms: DataRoomOption[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const available = dataRooms.filter((r) => !assignedRoomIds.includes(r.id));

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function assign(roomId: string) {
    setLoading(roomId);
    try {
      const res = await fetch(`/api/admin/rooms/${roomId}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, dataRoomId: roomId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to assign");
      } else {
        router.refresh();
        setOpen(false);
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-ottera-red-50 text-ottera-red-600 hover:bg-ottera-red-100 text-xs font-bold leading-none transition-colors"
        title="Add to data room"
      >
        +
      </button>
      {open && (
        <div className="absolute z-50 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg w-56 py-1">
          {available.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">
              Already in all rooms
            </div>
          ) : (
            available.map((room) => (
              <button
                key={room.id}
                disabled={loading === room.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  assign(room.id);
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {loading === room.id ? "Assigning..." : room.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ContactTable({ contacts, dataRooms }: ContactTableProps) {
  const [search, setSearch] = useState("");
  const [filterInvestorType, setFilterInvestorType] = useState("");
  const [filterGeography, setFilterGeography] = useState("");
  const [filterCheckSize, setFilterCheckSize] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return contacts.filter((c) => {
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.company ?? "").toLowerCase().includes(q);

      const matchInvestorType = !filterInvestorType || c.investorType === filterInvestorType;
      const matchGeography = !filterGeography || c.geography === filterGeography;
      const matchCheckSize = !filterCheckSize || c.checkSize === filterCheckSize;

      return matchSearch && matchInvestorType && matchGeography && matchCheckSize;
    });
  }, [contacts, search, filterInvestorType, filterGeography, filterCheckSize]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      if (sortKey === "name") { aVal = a.name; bVal = b.name; }
      else if (sortKey === "company") { aVal = a.company ?? ""; bVal = b.company ?? ""; }
      else if (sortKey === "investorType") { aVal = a.investorType ?? ""; bVal = b.investorType ?? ""; }
      else if (sortKey === "geography") { aVal = a.geography ?? ""; bVal = b.geography ?? ""; }
      else if (sortKey === "checkSize") { aVal = a.checkSize ?? ""; bVal = b.checkSize ?? ""; }
      else if (sortKey === "roomCount") { aVal = a.roomCount; bVal = b.roomCount; }
      else if (sortKey === "viewCount") { aVal = a.viewCount; bVal = b.viewCount; }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const investorTypeOptions = Object.entries(investorTypeLabels).map(([v, l]) => ({ value: v, label: l }));
  const geographyOptions = Object.entries(geographyLabels).map(([v, l]) => ({ value: v, label: l }));
  const checkSizeOptions = Object.entries(checkSizeLabels).map(([v, l]) => ({ value: v, label: l }));

  return (
    <div>
      {/* Search + filters */}
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ottera-red-600"
        />
        <FilterSelect
          label="Investor Type"
          options={investorTypeOptions}
          value={filterInvestorType}
          onChange={setFilterInvestorType}
        />
        <FilterSelect
          label="Geography"
          options={geographyOptions}
          value={filterGeography}
          onChange={setFilterGeography}
        />
        <FilterSelect
          label="Check Size"
          options={checkSizeOptions}
          value={filterCheckSize}
          onChange={setFilterCheckSize}
        />
        {(filterInvestorType || filterGeography || filterCheckSize) && (
          <button
            onClick={() => {
              setFilterInvestorType("");
              setFilterGeography("");
              setFilterCheckSize("");
            }}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">
            {search || filterInvestorType || filterGeography || filterCheckSize
              ? "No contacts match your filters."
              : "No contacts yet."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortHeader label="Name" sortKey="name" current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Company" sortKey="company" current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Investor Type" sortKey="investorType" current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Geography" sortKey="geography" current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Check Size" sortKey="checkSize" current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Data Rooms" sortKey="roomCount" current={sortKey} dir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  NDA Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Send
                </th>
                <SortHeader label="Views" sortKey="viewCount" current={sortKey} dir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((contact) => (
                <tr
                  key={contact.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link href={`/admin/contacts/${contact.id}`} className="block">
                      <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                      <p className="text-xs text-gray-500">{contact.email}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/contacts/${contact.id}`} className="block">
                      <span className="text-sm text-gray-600">{contact.company ?? "—"}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/contacts/${contact.id}`} className="block">
                      <Badge value={contact.investorType} labels={investorTypeLabels} colors={investorTypeColors} />
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/contacts/${contact.id}`} className="block">
                      <Badge value={contact.geography} labels={geographyLabels} colors={geographyColors} />
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/contacts/${contact.id}`} className="block">
                      <Badge value={contact.checkSize} labels={checkSizeLabels} colors={checkSizeColors} />
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {contact.ndaStatuses.map((s) => (
                        <Link
                          key={s.roomId}
                          href={`/admin/rooms/${s.roomId}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors border border-gray-200/60"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-gray-400">
                            <path d="M3.5 2A1.5 1.5 0 002 3.5v9A1.5 1.5 0 003.5 14h9a1.5 1.5 0 001.5-1.5v-7A1.5 1.5 0 0012.5 4H9.621a1.5 1.5 0 01-1.06-.44L7.439 2.44A1.5 1.5 0 006.379 2H3.5z" />
                          </svg>
                          {s.roomName}
                        </Link>
                      ))}
                      <AddToRoomDropdown
                        contactId={contact.id}
                        assignedRoomIds={contact.ndaStatuses.map((s) => s.roomId)}
                        dataRooms={dataRooms}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <GlobalNdaStatus contact={contact} />
                  </td>
                  <td className="px-4 py-3">
                    <SendButtons contactId={contact.id} contactEmail={contact.email} />
                  </td>
                  <td className="px-4 py-3">
                    <ViewsCell viewCount={contact.viewCount} recentViews={contact.recentViews} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
