"use client";

import { useState, useEffect, useRef } from "react";

interface NdaStatusEntry {
  roomId: string;
  roomName: string;
  ndaStatus: string;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  company: string | null;
  ndaStatuses: NdaStatusEntry[];
}

type ActionType = "nda" | "calendly" | "magic-link";
type Step =
  | "select-contact"
  | "select-action"
  | "select-room"
  | "compose"
  | "sending"
  | "sent";

function getNdaStatus(contact: Contact): string {
  const statuses = contact.ndaStatuses.map((s) => s.ndaStatus);
  if (statuses.includes("signed")) return "signed";
  if (statuses.includes("sent")) return "sent";
  return "not_sent";
}

function ndaBadgeColor(status: string) {
  if (status === "signed") return "bg-green-100 text-green-800";
  if (status === "sent") return "bg-yellow-100 text-yellow-800";
  return "bg-gray-100 text-gray-600";
}

function ndaBadgeLabel(status: string) {
  if (status === "signed") return "NDA Signed";
  if (status === "sent") return "NDA Sent";
  return "NDA Not Sent";
}

function buildNdaEmail(
  contact: Contact,
  calendlyLink: string | undefined
): { subject: string; body: string } {
  return {
    subject: `NDA for ${contact.name}${contact.company ? ` — ${contact.company}` : ""}`,
    body: `<p>Hi ${contact.name.split(" ")[0]},</p>

<p>Thank you for your interest. Please review and sign the Non-Disclosure Agreement by clicking the link below:</p>

<p><a href="{{NDA_SIGNING_LINK}}" style="display:inline-block;padding:10px 24px;background-color:#dc2626;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">Sign NDA</a></p>

<p>Once signed, we'll grant you access to the relevant data room materials.</p>

${calendlyLink ? `<p>If you'd like to schedule a call to discuss, you can book a time here: <a href="${calendlyLink}">${calendlyLink}</a></p>` : ""}

<p>Best regards</p>`,
  };
}

function buildCalendlyEmail(
  contact: Contact,
  calendlyLink: string
): { subject: string; body: string } {
  return {
    subject: `Let's Schedule a Call — ${contact.company || contact.name}`,
    body: `<p>Hi ${contact.name.split(" ")[0]},</p>

<p>I'd love to find a time to connect and discuss next steps.</p>

<p>Please use the link below to book a time that works best for you:</p>

<p><a href="${calendlyLink}" style="display:inline-block;padding:10px 24px;background-color:#0069ff;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">Schedule a Meeting</a></p>

<p>Looking forward to speaking with you.</p>

<p>Best regards</p>`,
  };
}

function buildMagicLinkEmail(
  contact: Contact,
  roomName: string,
  magicLinkUrl: string
): { subject: string; body: string } {
  return {
    subject: `Access ${roomName} — ${contact.company || contact.name}`,
    body: `<p>Hi ${contact.name.split(" ")[0]},</p>

<p>You've been granted access to the <strong>${roomName}</strong> data room.</p>

<p>Click the link below to securely access the documents. This link expires in 7 days.</p>

<p><a href="${magicLinkUrl}">${magicLinkUrl}</a></p>

<p>If you have any questions, feel free to reply to this email.</p>

<p>Best regards</p>`,
  };
}

// Props allow pre-selecting a contact and action (used by NDA table)
interface EmailFabProps {
  preselect?: {
    contactId: string;
    contactName: string;
    contactEmail: string;
    contactCompany?: string | null;
    action: ActionType;
    roomId?: string;
    roomName?: string;
  } | null;
  onPreselectHandled?: () => void;
}

export function EmailFab({ preselect, onPreselectHandled }: EmailFabProps = {}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("select-contact");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [action, setAction] = useState<ActionType | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedRoomName, setSelectedRoomName] = useState<string | null>(null);
  const [magicLinkUrl, setMagicLinkUrl] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calendlyLink, setCalendlyLink] = useState<string>("");
  const modalRef = useRef<HTMLDivElement>(null);

  // Fetch contacts when modal opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/admin/contacts", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setContacts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open]);

  // Fetch Calendly link from integrations (or fallback to settings)
  useEffect(() => {
    let found = false;
    fetch("/api/admin/integrations/status", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.calendly?.schedulingUrl) {
          setCalendlyLink(data.calendly.schedulingUrl);
          found = true;
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!found) {
          fetch("/api/admin/settings", { credentials: "include" })
            .then((r) => r.json())
            .then((data) => {
              if (data.calendlyLink) setCalendlyLink(data.calendlyLink);
            })
            .catch(() => {});
        }
      });
  }, []);

  // Handle preselection via props
  useEffect(() => {
    if (!preselect) return;

    const fakeContact: Contact = {
      id: preselect.contactId,
      name: preselect.contactName,
      email: preselect.contactEmail,
      company: preselect.contactCompany ?? null,
      ndaStatuses: preselect.roomId && preselect.roomName
        ? [{ roomId: preselect.roomId, roomName: preselect.roomName, ndaStatus: "signed" }]
        : [],
    };

    setSelectedContact(fakeContact);
    setAction(preselect.action);

    if (preselect.action === "magic-link" && preselect.roomId && preselect.roomName) {
      setSelectedRoomId(preselect.roomId);
      setSelectedRoomName(preselect.roomName);
      setOpen(true);
      setStep("compose");
      generateMagicLinkAndCompose(fakeContact, preselect.roomId, preselect.roomName);
    } else {
      setOpen(true);
      setStep("select-action");
    }

    onPreselectHandled?.();
  }, [preselect]);

  // Listen for global custom event (from NDA table, contacts table, etc.)
  useEffect(() => {
    function handleEvent(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;

      // Build ndaStatuses from either single room or rooms array
      let ndaStatuses: NdaStatusEntry[] = [];
      if (detail.roomId && detail.roomName) {
        ndaStatuses = [{ roomId: detail.roomId, roomName: detail.roomName, ndaStatus: "signed" }];
      } else if (detail.rooms) {
        ndaStatuses = detail.rooms.map((r: { roomId: string; roomName: string }) => ({
          roomId: r.roomId,
          roomName: r.roomName,
          ndaStatus: "signed",
        }));
      }

      const fakeContact: Contact = {
        id: detail.contactId,
        name: detail.contactName,
        email: detail.contactEmail,
        company: detail.contactCompany ?? null,
        ndaStatuses,
      };

      setSelectedContact(fakeContact);
      setAction(detail.action);

      if (detail.action === "nda") {
        // Go straight to compose with NDA email
        const email = buildNdaEmail(fakeContact, calendlyLink || undefined);
        setSubject(email.subject);
        setBodyHtml(email.body);
        setOpen(true);
        setStep("compose");
      } else if (detail.action === "calendly") {
        // Go straight to compose with Calendly email
        const link = calendlyLink || "";
        if (!link) {
          setError("Calendly not connected. Go to Settings → Connections to connect.");
          setOpen(true);
          return;
        }
        const email = buildCalendlyEmail(fakeContact, link);
        setSubject(email.subject);
        setBodyHtml(email.body);
        setOpen(true);
        setStep("compose");
      } else if (detail.action === "magic-link" && detail.roomId && detail.roomName) {
        setSelectedRoomId(detail.roomId);
        setSelectedRoomName(detail.roomName);
        setOpen(true);
        setStep("compose");
        generateMagicLinkAndCompose(fakeContact, detail.roomId, detail.roomName);
      } else if (detail.action === "magic-link" && ndaStatuses.length > 0) {
        setOpen(true);
        if (ndaStatuses.length === 1) {
          setSelectedRoomId(ndaStatuses[0].roomId);
          setSelectedRoomName(ndaStatuses[0].roomName);
          setStep("compose");
          generateMagicLinkAndCompose(fakeContact, ndaStatuses[0].roomId, ndaStatuses[0].roomName);
        } else {
          setStep("select-room");
        }
      } else {
        setOpen(true);
        setStep("select-action");
      }
    }

    window.addEventListener("email-fab:open", handleEvent);
    return () => window.removeEventListener("email-fab:open", handleEvent);
  }, [calendlyLink]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        handleClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleClose() {
    setOpen(false);
    setStep("select-contact");
    setSelectedContact(null);
    setAction(null);
    setSelectedRoomId(null);
    setSelectedRoomName(null);
    setMagicLinkUrl(null);
    setSubject("");
    setBodyHtml("");
    setSearch("");
    setError(null);
    setGeneratingLink(false);
  }

  function handleSelectContact(c: Contact) {
    setSelectedContact(c);
    setStep("select-action");
  }

  async function generateMagicLinkAndCompose(
    contact: Contact,
    roomId: string,
    roomName: string
  ) {
    setGeneratingLink(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/contacts/${contact.id}/magic-link`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to generate magic link");
        setGeneratingLink(false);
        return;
      }
      setMagicLinkUrl(data.magicLinkUrl);
      const email = buildMagicLinkEmail(contact, roomName, data.magicLinkUrl);
      setSubject(email.subject);
      setBodyHtml(email.body);
      setStep("compose");
    } catch {
      setError("Network error generating magic link");
    } finally {
      setGeneratingLink(false);
    }
  }

  function handleSelectAction(a: ActionType) {
    setAction(a);
    if (!selectedContact) return;

    if (a === "nda") {
      const email = buildNdaEmail(selectedContact, calendlyLink || undefined);
      setSubject(email.subject);
      setBodyHtml(email.body);
      setStep("compose");
    } else if (a === "calendly") {
      const link = calendlyLink || "";
      if (!link) {
        setError("Calendly not connected. Go to Settings → Connections to connect.");
        return;
      }
      const email = buildCalendlyEmail(selectedContact, link);
      setSubject(email.subject);
      setBodyHtml(email.body);
      setStep("compose");
    } else if (a === "magic-link") {
      // Need to select which room
      if (selectedContact.ndaStatuses.length === 1) {
        // Only one room — skip room selection
        const room = selectedContact.ndaStatuses[0];
        setSelectedRoomId(room.roomId);
        setSelectedRoomName(room.roomName);
        generateMagicLinkAndCompose(selectedContact, room.roomId, room.roomName);
      } else if (selectedContact.ndaStatuses.length === 0) {
        setError("Contact has no room access");
      } else {
        setStep("select-room");
      }
    }
  }

  function handleSelectRoom(roomId: string, roomName: string) {
    if (!selectedContact) return;
    setSelectedRoomId(roomId);
    setSelectedRoomName(roomName);
    generateMagicLinkAndCompose(selectedContact, roomId, roomName);
  }

  async function handleSend() {
    if (!selectedContact || !action) return;
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/email/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: selectedContact.id,
          action: action === "magic-link" ? "magic-link" : action,
          subject,
          bodyHtml,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send email");
        setSending(false);
        return;
      }

      setSending(false);
      setStep("sent");
    } catch {
      setError("Network error — please try again");
      setSending(false);
    }
  }

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.company || "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-ottera-red text-white shadow-lg hover:bg-red-700 transition-all hover:scale-105 flex items-center justify-center"
        title="Send email"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-6 h-6"
        >
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      </button>

      {/* Modal Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            ref={modalRef}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {step === "select-contact" && "Select Contact"}
                {step === "select-action" &&
                  `Send to ${selectedContact?.name}`}
                {step === "select-room" && "Select Data Room"}
                {step === "compose" && "Compose Email"}
                {step === "sending" && "Sending..."}
                {step === "sent" && "Email Sent"}
              </h2>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4">
              {/* Step 1: Select Contact */}
              {step === "select-contact" && (
                <div>
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ottera-red/30 focus:border-ottera-red mb-3"
                    autoFocus
                  />
                  <div className="max-h-72 overflow-y-auto space-y-1">
                    {loading && (
                      <p className="text-sm text-gray-400 py-4 text-center">
                        Loading contacts...
                      </p>
                    )}
                    {!loading && filtered.length === 0 && (
                      <p className="text-sm text-gray-400 py-4 text-center">
                        No contacts found
                      </p>
                    )}
                    {!loading &&
                      filtered.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleSelectContact(c)}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {c.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {c.email}
                              {c.company && ` · ${c.company}`}
                            </p>
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${ndaBadgeColor(getNdaStatus(c))}`}
                          >
                            {ndaBadgeLabel(getNdaStatus(c))}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Step 2: Select Action */}
              {step === "select-action" && selectedContact && (() => {
                const ndaSigned = getNdaStatus(selectedContact) === "signed";
                return (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 mb-4">
                    What would you like to send to{" "}
                    <span className="font-medium text-gray-900">
                      {selectedContact.name}
                    </span>
                    ?
                  </p>

                  <button
                    onClick={() => handleSelectAction("nda")}
                    className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-ottera-red hover:bg-red-50/30 transition-all text-left"
                  >
                    <span className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 text-ottera-red flex items-center justify-center">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Send NDA
                      </p>
                      <p className="text-xs text-gray-500">
                        {getNdaStatus(selectedContact) === "signed"
                          ? "NDA already signed"
                          : getNdaStatus(selectedContact) === "sent"
                            ? "NDA already sent — resend"
                            : "Send NDA for signature"}
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => ndaSigned && handleSelectAction("magic-link")}
                    disabled={!ndaSigned}
                    className={`w-full flex items-center gap-4 p-4 border rounded-xl transition-all text-left ${
                      ndaSigned
                        ? "border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/30 cursor-pointer"
                        : "border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <span className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      ndaSigned ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400"
                    }`}>
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                        />
                      </svg>
                    </span>
                    <div>
                      <p className={`text-sm font-semibold ${ndaSigned ? "text-gray-900" : "text-gray-400"}`}>
                        Send Data Room Access
                      </p>
                      <p className="text-xs text-gray-500">
                        {!ndaSigned
                          ? "NDA must be signed first"
                          : selectedContact.ndaStatuses.length > 0
                            ? `Send access link (${selectedContact.ndaStatuses.length} room${selectedContact.ndaStatuses.length > 1 ? "s" : ""})`
                            : "No room access yet"}
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleSelectAction("calendly")}
                    className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50/30 transition-all text-left"
                  >
                    <span className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Send Calendly Link
                      </p>
                      <p className="text-xs text-gray-500">
                        Invite to schedule a call
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setStep("select-contact");
                      setSelectedContact(null);
                    }}
                    className="text-sm text-gray-400 hover:text-gray-600 mt-2"
                  >
                    &larr; Back to contacts
                  </button>
                </div>
                );
              })()}

              {/* Step 2b: Select Room (for magic link) */}
              {step === "select-room" && selectedContact && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 mb-4">
                    Which data room should{" "}
                    <span className="font-medium text-gray-900">
                      {selectedContact.name}
                    </span>{" "}
                    access?
                  </p>

                  {generatingLink && (
                    <p className="text-sm text-gray-400 py-4 text-center">
                      Generating magic link...
                    </p>
                  )}

                  {error && (
                    <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">
                      {error}
                    </div>
                  )}

                  {!generatingLink && (
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {selectedContact.ndaStatuses.map((room) => (
                        <button
                          key={room.roomId}
                          onClick={() =>
                            handleSelectRoom(room.roomId, room.roomName)
                          }
                          className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50/30 transition-all text-left"
                        >
                          <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center">
                            <svg
                              className="w-4 h-4"
                              fill="currentColor"
                              viewBox="0 0 16 16"
                            >
                              <path d="M3.5 2A1.5 1.5 0 002 3.5v9A1.5 1.5 0 003.5 14h9a1.5 1.5 0 001.5-1.5v-7A1.5 1.5 0 0012.5 4H9.621a1.5 1.5 0 01-1.06-.44L7.439 2.44A1.5 1.5 0 006.379 2H3.5z" />
                            </svg>
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {room.roomName}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setStep("select-action");
                      setError(null);
                    }}
                    className="text-sm text-gray-400 hover:text-gray-600 mt-2"
                  >
                    &larr; Back
                  </button>
                </div>
              )}

              {/* Step 3: Compose */}
              {step === "compose" && (
                <div className="space-y-3">
                  {generatingLink ? (
                    <div className="text-center py-8">
                      <svg
                        className="w-6 h-6 animate-spin mx-auto text-gray-400 mb-2"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      <p className="text-sm text-gray-500">
                        Generating magic link...
                      </p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">
                          To
                        </label>
                        <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                          {selectedContact?.name} &lt;
                          {selectedContact?.email}&gt;
                        </p>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">
                          Subject
                        </label>
                        <input
                          type="text"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ottera-red/30 focus:border-ottera-red"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">
                          Message
                        </label>
                        <textarea
                          value={bodyHtml
                            .replace(/<[^>]+>/g, (tag) => {
                              if (tag === "<p>") return "";
                              if (tag === "</p>") return "\n\n";
                              if (tag.startsWith("<a ")) {
                                const href =
                                  tag.match(/href="([^"]+)"/)?.[1] || "";
                                return href;
                              }
                              if (tag === "</a>") return "";
                              if (tag === "<strong>") return "";
                              if (tag === "</strong>") return "";
                              if (tag === "<br/>") return "\n";
                              return "";
                            })
                            .trim()}
                          onChange={(e) => {
                            const html = e.target.value
                              .split("\n\n")
                              .filter(Boolean)
                              .map(
                                (p) =>
                                  `<p>${p.replace(/\n/g, "<br/>")}</p>`
                              )
                              .join("\n\n");
                            setBodyHtml(html);
                          }}
                          rows={8}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ottera-red/30 focus:border-ottera-red resize-none"
                        />
                      </div>

                      {error && (
                        <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">
                          {error}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2">
                        <button
                          onClick={() => {
                            setStep("select-action");
                            setError(null);
                          }}
                          className="text-sm text-gray-400 hover:text-gray-600"
                        >
                          &larr; Back
                        </button>
                        <button
                          onClick={handleSend}
                          disabled={
                            sending || !subject.trim() || !bodyHtml.trim()
                          }
                          className="px-5 py-2 bg-ottera-red text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {sending ? (
                            <>
                              <svg
                                className="w-4 h-4 animate-spin"
                                viewBox="0 0 24 24"
                                fill="none"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                />
                              </svg>
                              Sending...
                            </>
                          ) : (
                            <>
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                                />
                              </svg>
                              Send via Outlook
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Step 4: Sent */}
              {step === "sent" && (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg
                      className="w-6 h-6 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Email sent successfully
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    {action === "nda"
                      ? "NDA status has been updated across the system"
                      : action === "magic-link"
                        ? `Data room access sent for ${selectedRoomName ?? "data room"}`
                        : "Calendly link sent — booking will appear in your calendar"}
                  </p>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => {
                        setStep("select-contact");
                        setSelectedContact(null);
                        setAction(null);
                        setSelectedRoomId(null);
                        setSelectedRoomName(null);
                        setMagicLinkUrl(null);
                        setSubject("");
                        setBodyHtml("");
                        setError(null);
                      }}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Send another
                    </button>
                    <button
                      onClick={handleClose}
                      className="px-4 py-2 text-sm text-white bg-ottera-red rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
