"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const INVESTOR_TYPE_OPTIONS = [
  { value: "family_office", label: "Family Office" },
  { value: "venture_capital", label: "VC" },
  { value: "private_equity", label: "PE" },
  { value: "strategic_corporate", label: "Strategic" },
  { value: "other", label: "Other" },
];

const GEOGRAPHY_OPTIONS = [
  { value: "us", label: "US" },
  { value: "middle_east", label: "Middle East" },
  { value: "apac", label: "APAC" },
  { value: "europe", label: "Europe" },
  { value: "other", label: "Other" },
];

const CHECK_SIZE_OPTIONS = [
  { value: "small", label: "<$500K" },
  { value: "mid", label: "$500K–$5M" },
  { value: "large", label: "$5M+" },
];

interface DataRoomOption {
  id: string;
  name: string;
}

interface AddContactFormProps {
  dataRooms?: DataRoomOption[];
}

export function AddContactForm({ dataRooms = [] }: AddContactFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [investorType, setInvestorType] = useState("");
  const [geography, setGeography] = useState("");
  const [checkSize, setCheckSize] = useState("");
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setName("");
    setEmail("");
    setCompany("");
    setInvestorType("");
    setGeography("");
    setCheckSize("");
    setSelectedRoomIds(new Set());
    setError(null);
  }

  function toggleRoom(id: string) {
    setSelectedRoomIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      // Step 1: Create contact
      const res = await fetch("/api/admin/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          company: company || undefined,
          investorType: investorType || undefined,
          geography: geography || undefined,
          checkSize: checkSize || undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Failed to create contact");
        return;
      }

      const contact = (await res.json()) as { id: string };

      // Step 2: Assign to selected rooms
      const roomIds = Array.from(selectedRoomIds);
      if (roomIds.length > 0) {
        await Promise.all(
          roomIds.map((roomId) =>
            fetch(`/api/admin/rooms/${roomId}/access`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contactId: contact.id, dataRoomId: roomId }),
            }).catch(() => {})
          )
        );
      }

      setOpen(false);
      resetForm();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center px-4 py-2 bg-ottera-red-600 text-white text-sm font-medium rounded-md hover:bg-ottera-red-700 transition-colors"
      >
        + Add Contact
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Contact</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ottera-red-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ottera-red-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ottera-red-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Investor Type</label>
            <select
              value={investorType}
              onChange={(e) => setInvestorType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ottera-red-600 bg-white"
            >
              <option value="">-- Select --</option>
              {INVESTOR_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Geography</label>
            <select
              value={geography}
              onChange={(e) => setGeography(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ottera-red-600 bg-white"
            >
              <option value="">-- Select --</option>
              {GEOGRAPHY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Check Size</label>
            <select
              value={checkSize}
              onChange={(e) => setCheckSize(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ottera-red-600 bg-white"
            >
              <option value="">-- Select --</option>
              {CHECK_SIZE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Room assignment */}
          {dataRooms.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign to Data Rooms
              </label>
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-40 overflow-y-auto">
                {dataRooms.map((room) => (
                  <label
                    key={room.id}
                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 text-sm ${
                      selectedRoomIds.has(room.id) ? "bg-ottera-red-50/50" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoomIds.has(room.id)}
                      onChange={() => toggleRoom(room.id)}
                      className="rounded border-gray-300 text-ottera-red-600 focus:ring-ottera-red-600"
                    />
                    {room.name}
                  </label>
                ))}
              </div>
              {selectedRoomIds.size > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  {selectedRoomIds.size} room{selectedRoomIds.size > 1 ? "s" : ""} selected
                </p>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setOpen(false); resetForm(); }}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-ottera-red-600 rounded-md hover:bg-ottera-red-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Creating..." : "Create Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
