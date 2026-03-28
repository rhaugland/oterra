"use client";

import { useState, useEffect, useRef, FormEvent, DragEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────────────────────

interface ContactOption {
  id: string;
  name: string;
  email: string;
  company?: string | null;
  bestNdaStatus: "signed" | "sent" | "not_sent";
}

interface QueuedFile {
  id: string;
  file: File;
}

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/csv",
  "text/plain",
  "image/png",
  "image/jpeg",
];

const MAX_SIZE = 524288000; // 500MB

const ndaBadge: Record<string, { label: string; cls: string }> = {
  signed: { label: "Signed", cls: "bg-green-100 text-green-800" },
  sent: { label: "Pending", cls: "bg-yellow-100 text-yellow-800" },
  not_sent: { label: "Not Sent", cls: "bg-gray-100 text-gray-600" },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function bestNdaForContact(accesses: { ndaStatus: string }[]): "signed" | "sent" | "not_sent" {
  if (accesses.some((a) => a.ndaStatus === "signed")) return "signed";
  if (accesses.some((a) => a.ndaStatus === "sent")) return "sent";
  return "not_sent";
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NewRoomPage() {
  const router = useRouter();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [contactSearch, setContactSearch] = useState("");

  // Data
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);

  // UI
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load contacts on mount
  useEffect(() => {
    fetch("/api/admin/contacts")
      .then((r) => r.json())
      .then((data: { id: string; name: string; email: string; company?: string | null; ndaStatuses?: { ndaStatus: string }[] }[]) => {
        setContacts(
          data.map((c) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            company: c.company,
            bestNdaStatus: bestNdaForContact(c.ndaStatuses ?? []),
          }))
        );
      })
      .catch(() => {})
      .finally(() => setContactsLoading(false));
  }, []);

  // ── File handling ────────────────────────────────────────────────────────

  function addFiles(files: File[]) {
    const valid: QueuedFile[] = [];
    for (const f of files) {
      if (!ALLOWED_MIME_TYPES.includes(f.type)) continue;
      if (f.size > MAX_SIZE) continue;
      if (queuedFiles.some((q) => q.file.name === f.name && q.file.size === f.size)) continue;
      valid.push({ id: crypto.randomUUID(), file: f });
    }
    if (valid.length > 0) setQueuedFiles((prev) => [...prev, ...valid]);
  }

  function removeFile(id: string) {
    setQueuedFiles((prev) => prev.filter((q) => q.id !== id));
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setDragging(true);
  }
  function handleDragLeave() {
    setDragging(false);
  }
  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }
  function handleFileInput(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = "";
  }

  // ── Contact selection ────────────────────────────────────────────────────

  function toggleContact(id: string) {
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filteredContacts = contacts.filter((c) => {
    if (!contactSearch) return true;
    const q = contactSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.company ?? "").toLowerCase().includes(q)
    );
  });

  // ── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // Step 1: Create the room
      setProgress("Creating room...");
      const roomRes = await fetch("/api/admin/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || undefined }),
      });
      if (!roomRes.ok) {
        const data = await roomRes.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Failed to create room");
      }
      const room = (await roomRes.json()) as { id: string };

      // Step 2: Upload queued files
      for (let i = 0; i < queuedFiles.length; i++) {
        const qf = queuedFiles[i];
        setProgress(`Uploading file ${i + 1} of ${queuedFiles.length}...`);

        // Get pre-signed URL
        const initRes = await fetch(`/api/admin/rooms/${room.id}/files`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: qf.file.name,
            size: qf.file.size,
            mimeType: qf.file.type,
          }),
        });
        if (!initRes.ok) continue; // skip failed files

        const { fileId, uploadUrl } = (await initRes.json()) as {
          fileId: string;
          uploadUrl: string;
        };

        // Upload to S3
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Type", qf.file.type);
          xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject());
          xhr.onerror = () => reject();
          xhr.send(qf.file);
        }).catch(() => {}); // best-effort

        // Confirm
        await fetch(`/api/admin/rooms/${room.id}/files/${fileId}/confirm`, {
          method: "POST",
        }).catch(() => {});
      }

      // Step 3: Assign selected contacts
      const contactIds = Array.from(selectedContactIds);
      if (contactIds.length > 0) {
        setProgress(`Adding ${contactIds.length} contact${contactIds.length > 1 ? "s" : ""}...`);
        await Promise.all(
          contactIds.map((contactId) =>
            fetch(`/api/admin/rooms/${room.id}/access`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contactId, dataRoomId: room.id }),
            }).catch(() => {})
          )
        );
      }

      router.push(`/admin/rooms/${room.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const selectedContacts = contacts.filter((c) => selectedContactIds.has(c.id));

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/rooms" className="text-sm text-ottera-red-600 hover:text-ottera-red-700">
          &larr; Back to Rooms
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Create Data Room</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ── Room Details ───────────────────────────────────────────────── */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Room Details</h2>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Room name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={255}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ottera-red-600 focus:border-ottera-red-600"
              placeholder="e.g. Series A Due Diligence"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ottera-red-600 focus:border-ottera-red-600 resize-none"
              placeholder="Optional description for this data room"
            />
          </div>
        </section>

        {/* ── Files ──────────────────────────────────────────────────────── */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Files</h2>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              dragging
                ? "border-ottera-red-600 bg-ottera-red-50"
                : "border-gray-300 hover:border-ottera-red-600/30 hover:bg-gray-50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ALLOWED_MIME_TYPES.join(",")}
              className="hidden"
              onChange={handleFileInput}
            />
            <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm font-medium text-gray-700">Drop files here or click to upload</p>
            <p className="text-xs text-gray-400 mt-1">PDF, XLSX, DOCX, PPTX, CSV, TXT, PNG, JPEG — max 500MB</p>
          </div>

          {queuedFiles.length > 0 && (
            <div className="space-y-2">
              {queuedFiles.map((qf) => (
                <div key={qf.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 truncate">{qf.file.name}</p>
                    <p className="text-xs text-gray-400">{formatBytes(qf.file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(qf.id)}
                    className="ml-3 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Contacts ───────────────────────────────────────────────────── */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Contacts</h2>

          {/* Selected contacts pills */}
          {selectedContacts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedContacts.map((c) => {
                const badge = ndaBadge[c.bestNdaStatus];
                return (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 bg-ottera-red-50 text-ottera-red-700 rounded-full text-sm"
                  >
                    {c.name}
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${badge.cls}`}>
                      {badge.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleContact(c.id)}
                      className="ml-0.5 text-ottera-red-600 hover:text-ottera-red-700"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Search */}
          <input
            type="text"
            value={contactSearch}
            onChange={(e) => setContactSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ottera-red-600 focus:border-ottera-red-600"
          />

          {/* Contact list */}
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
            {contactsLoading ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">Loading contacts...</div>
            ) : filteredContacts.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">
                {contactSearch ? "No contacts match your search." : "No contacts yet."}
              </div>
            ) : (
              filteredContacts.map((c) => {
                const selected = selectedContactIds.has(c.id);
                const badge = ndaBadge[c.bestNdaStatus];
                return (
                  <label
                    key={c.id}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selected ? "bg-ottera-red-50/50" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleContact(c.id)}
                      className="rounded border-gray-300 text-ottera-red-600 focus:ring-ottera-red-600"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {c.email}
                        {c.company && ` · ${c.company}`}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </label>
                );
              })
            )}
          </div>

          {contacts.length > 0 && (
            <p className="text-xs text-gray-400">
              {selectedContactIds.size} of {contacts.length} selected
            </p>
          )}
        </section>

        {/* ── Actions ────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 bg-ottera-red-600 text-white text-sm font-medium rounded-lg hover:bg-ottera-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (progress ?? "Creating...") : "Create Room"}
          </button>
          <Link
            href="/admin/rooms"
            className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
