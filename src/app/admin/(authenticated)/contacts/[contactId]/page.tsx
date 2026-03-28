import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

interface ContactDetailPageProps {
  params: Promise<{ contactId: string }>;
}

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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-gray-100 text-gray-600",
    invited: "bg-blue-100 text-blue-800",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {status}
    </span>
  );
}

function InvestorTypeBadge({ value }: { value: string | null }) {
  if (!value) return null;
  const colors: Record<string, string> = {
    family_office: "bg-purple-100 text-purple-800",
    venture_capital: "bg-blue-100 text-blue-800",
    private_equity: "bg-indigo-100 text-indigo-800",
    strategic_corporate: "bg-teal-100 text-teal-800",
    other: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${colors[value] ?? "bg-gray-100 text-gray-600"}`}>
      {investorTypeLabels[value] ?? value}
    </span>
  );
}

function GeographyBadge({ value }: { value: string | null }) {
  if (!value) return null;
  const colors: Record<string, string> = {
    us: "bg-sky-100 text-sky-800",
    middle_east: "bg-amber-100 text-amber-800",
    apac: "bg-green-100 text-green-800",
    europe: "bg-rose-100 text-rose-800",
    other: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${colors[value] ?? "bg-gray-100 text-gray-600"}`}>
      {geographyLabels[value] ?? value}
    </span>
  );
}

function CheckSizeBadge({ value }: { value: string | null }) {
  if (!value) return null;
  const colors: Record<string, string> = {
    small: "bg-gray-100 text-gray-600",
    mid: "bg-orange-100 text-orange-800",
    large: "bg-emerald-100 text-emerald-800",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${colors[value] ?? "bg-gray-100 text-gray-600"}`}>
      {checkSizeLabels[value] ?? value}
    </span>
  );
}

function NdaBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    not_sent: "bg-gray-100 text-gray-600",
    sent: "bg-yellow-100 text-yellow-800",
    signed: "bg-green-100 text-green-800",
    declined: "bg-red-100 text-red-700",
    voided: "bg-gray-100 text-gray-500",
  };
  const labels: Record<string, string> = {
    not_sent: "NDA Not Sent",
    sent: "NDA Sent",
    signed: "NDA Signed",
    declined: "NDA Declined",
    voided: "NDA Voided",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function ApprovalBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    denied: "bg-red-100 text-red-700",
    revoked: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {status}
    </span>
  );
}

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
  const { contactId } = await params;

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    include: {
      accesses: {
        include: {
          dataRoom: {
            select: { id: true, name: true, status: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!contact) {
    notFound();
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/admin/contacts" className="text-gray-500 hover:text-gray-700 transition-colors">
          Contacts
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">{contact.name}</span>
      </div>

      {/* Contact info */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{contact.name}</h1>
            <p className="text-sm text-gray-500 mt-1">{contact.email}</p>
            {contact.company && (
              <p className="text-sm text-gray-500">{contact.company}</p>
            )}
          </div>
          <StatusBadge status={contact.status} />
        </div>

        {(contact.investorType || contact.geography || contact.checkSize) && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <InvestorTypeBadge value={contact.investorType ?? null} />
            <GeographyBadge value={contact.geography ?? null} />
            <CheckSizeBadge value={contact.checkSize ?? null} />
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-400">
          <span>Created {new Date(contact.createdAt).toLocaleDateString()}</span>
          <span className="text-gray-200">•</span>
          <span>
            {contact.accesses.length}{" "}
            {contact.accesses.length === 1 ? "room assignment" : "room assignments"}
          </span>
        </div>
      </div>

      {/* Room assignments */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Room Assignments</h2>

        {contact.accesses.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <p className="text-sm text-gray-400">No room assignments yet.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {contact.accesses.map((access) => (
              <div key={access.id} className="px-4 py-4 flex items-center justify-between">
                <div>
                  <Link
                    href={`/admin/rooms/${access.dataRoom.id}`}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    {access.dataRoom.name}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Assigned {new Date(access.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <NdaBadge status={access.ndaStatus} />
                  <ApprovalBadge status={access.approvalStatus} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
