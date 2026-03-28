import { prisma } from "@/lib/prisma";
import { NdaTable, CompletedNdaTable } from "@/components/admin/nda-table";

export default async function NdasPage() {
  const accesses = await prisma.dataRoomAccess.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      contact: {
        select: { id: true, name: true, email: true, company: true },
      },
      dataRoom: {
        select: { id: true, name: true },
      },
    },
  });

  const ndaRows = accesses.map((a) => ({
    accessId: a.id,
    contactId: a.contact.id,
    contactName: a.contact.name,
    contactEmail: a.contact.email,
    contactCompany: a.contact.company,
    roomId: a.dataRoom.id,
    roomName: a.dataRoom.name,
    ndaStatus: a.ndaStatus as string,
    approvalStatus: a.approvalStatus as string,
    envelopeId: a.docusignEnvelopeId,
    createdAt: a.createdAt.toISOString(),
  }));

  const statusCounts = {
    total: ndaRows.length,
    signed: ndaRows.filter((r) => r.ndaStatus === "signed").length,
    sent: ndaRows.filter((r) => r.ndaStatus === "sent").length,
    not_sent: ndaRows.filter((r) => r.ndaStatus === "not_sent").length,
    declined: ndaRows.filter((r) => r.ndaStatus === "declined").length,
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">NDAs</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage NDA status for all contact-room assignments
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Not Sent</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{statusCounts.not_sent}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-yellow-600 uppercase">Pending</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{statusCounts.sent}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-green-600 uppercase">Signed</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{statusCounts.signed}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-red-600 uppercase">Declined</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{statusCounts.declined}</p>
        </div>
      </div>

      <NdaTable rows={ndaRows} />
      <CompletedNdaTable rows={ndaRows} />
    </div>
  );
}
