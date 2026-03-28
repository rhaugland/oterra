"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

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
}

interface ContactTableProps {
  contacts: ContactRow[];
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
  private_equity: "bg-indigo-100 text-indigo-800",
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

// ── Small badge helpers ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-gray-100 text-gray-600",
    invited: "bg-blue-100 text-blue-800",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {status}
    </span>
  );
}

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

// ── Sort types ────────────────────────────────────────────────────────────────

type SortKey = "name" | "company" | "status" | "investorType" | "geography" | "checkSize" | "roomCount";
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
        <span className={`text-gray-400 ${active ? "text-indigo-500" : ""}`}>
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
      className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
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

// ── Main component ────────────────────────────────────────────────────────────

export function ContactTable({ contacts }: ContactTableProps) {
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
      else if (sortKey === "status") { aVal = a.status; bVal = b.status; }
      else if (sortKey === "investorType") { aVal = a.investorType ?? ""; bVal = b.investorType ?? ""; }
      else if (sortKey === "geography") { aVal = a.geography ?? ""; bVal = b.geography ?? ""; }
      else if (sortKey === "checkSize") { aVal = a.checkSize ?? ""; bVal = b.checkSize ?? ""; }
      else if (sortKey === "roomCount") { aVal = a.roomCount; bVal = b.roomCount; }

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
          className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortHeader label="Name" sortKey="name" current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Company" sortKey="company" current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Status" sortKey="status" current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Investor Type" sortKey="investorType" current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Geography" sortKey="geography" current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Check Size" sortKey="checkSize" current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Rooms" sortKey="roomCount" current={sortKey} dir={sortDir} onSort={handleSort} />
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
                      <StatusBadge status={contact.status} />
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
                    <Link href={`/admin/contacts/${contact.id}`} className="block">
                      <span className="text-sm text-gray-600">{contact.roomCount}</span>
                    </Link>
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
