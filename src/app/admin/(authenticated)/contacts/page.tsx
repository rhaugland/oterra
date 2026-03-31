import { prisma } from "@/lib/prisma";
import { ContactTable } from "@/components/admin/contact-table";
import { AddContactForm } from "@/components/admin/add-contact-form";

export default async function ContactsPage() {
  const contacts = await prisma.contact.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      accesses: {
        select: {
          id: true,
          approvalStatus: true,
          ndaStatus: true,
          dataRoomId: true,
          dataRoom: { select: { id: true, name: true } },
        },
      },
    },
  });

  const contactIds = contacts.map((c) => c.id);

  const auditLogs =
    contactIds.length > 0
      ? await prisma.auditLog.findMany({
          where: {
            actorType: "contact",
            actorId: { in: contactIds },
            action: "file.download",
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

  const fileIds = [...new Set(auditLogs.map((l) => l.resourceId))];
  const files =
    fileIds.length > 0
      ? await prisma.file.findMany({
          where: { id: { in: fileIds } },
          include: { dataRoom: { select: { id: true, name: true } } },
        })
      : [];

  const fileMap = new Map(files.map((f) => [f.id, f]));

  const logsByContact = new Map<string, typeof auditLogs>();
  for (const log of auditLogs) {
    const existing = logsByContact.get(log.actorId) ?? [];
    existing.push(log);
    logsByContact.set(log.actorId, existing);
  }

  const allRooms = await prisma.dataRoom.findMany({
    where: { status: "active" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const contactRows = contacts.map((contact) => {
    const logs = logsByContact.get(contact.id) ?? [];
    const recentViews = logs.slice(0, 10).map((l) => {
      const file = fileMap.get(l.resourceId);
      return {
        id: l.id,
        fileId: l.resourceId,
        fileName: file?.name ?? "Unknown file",
        roomId: file?.dataRoomId ?? null,
        roomName: file?.dataRoom?.name ?? "Unknown room",
        timestamp: l.createdAt.toISOString(),
      };
    });

    return {
      id: contact.id,
      name: contact.name,
      email: contact.email,
      company: contact.company,
      status: contact.status as string,
      investorType: contact.investorType as string | null,
      geography: contact.geography as string | null,
      checkSize: contact.checkSize as string | null,
      roomCount: contact.accesses.length,
      approvalCounts: {
        approved: contact.accesses.filter((a) => a.approvalStatus === "approved").length,
        pending: contact.accesses.filter((a) => a.approvalStatus === "pending").length,
        denied: contact.accesses.filter((a) => a.approvalStatus === "denied").length,
      },
      ndaStatuses: contact.accesses.map((a) => ({
        roomId: a.dataRoomId,
        roomName: a.dataRoom.name,
        ndaStatus: a.ndaStatus as string,
        approvalStatus: a.approvalStatus as string,
      })),
      viewCount: logs.length,
      recentViews,
    };
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-sm text-gray-500 mt-1">
            {contacts.length} {contacts.length === 1 ? "contact" : "contacts"} total
          </p>
        </div>
        <AddContactForm dataRooms={allRooms} />
      </div>

      <ContactTable contacts={contactRows} />
    </div>
  );
}
