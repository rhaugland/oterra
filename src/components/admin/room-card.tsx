import Link from "next/link";

interface ApprovalCounts {
  approved: number;
  pending: number;
  denied: number;
}

interface RoomCardProps {
  id: string;
  name: string;
  description?: string | null;
  status: "active" | "archived";
  fileCount: number;
  contactCount: number;
  approvalCounts: ApprovalCounts;
}

export function RoomCard({
  id,
  name,
  description,
  status,
  fileCount,
  contactCount,
  approvalCounts,
}: RoomCardProps) {
  return (
    <Link
      href={`/admin/rooms/${id}`}
      className="block bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all p-5"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-base font-semibold text-gray-900 truncate">
          {name}
        </h3>
        {status === "archived" && (
          <span className="ml-2 shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
            Archived
          </span>
        )}
      </div>

      {description && (
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{description}</p>
      )}

      <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
        <span>{fileCount} {fileCount === 1 ? "file" : "files"}</span>
        <span className="text-gray-300">•</span>
        <span>{contactCount} {contactCount === 1 ? "contact" : "contacts"}</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {approvalCounts.approved > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {approvalCounts.approved} approved
          </span>
        )}
        {approvalCounts.pending > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            {approvalCounts.pending} pending
          </span>
        )}
        {approvalCounts.denied > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            {approvalCounts.denied} denied
          </span>
        )}
        {approvalCounts.approved === 0 &&
          approvalCounts.pending === 0 &&
          approvalCounts.denied === 0 && (
            <span className="text-xs text-gray-400">No accesses</span>
          )}
      </div>
    </Link>
  );
}
