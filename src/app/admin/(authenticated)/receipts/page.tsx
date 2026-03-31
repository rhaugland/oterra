import { prisma } from "@/lib/prisma";
import { ReceiptCard } from "@/components/admin/receipt-card";

function getWeekBounds(weeksAgo: number) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday - weeksAgo * 7);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { start: monday, end: sunday };
}

function formatWeekRange(start: Date, end: Date) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const yearOpts: Intl.DateTimeFormatOptions = { ...opts, year: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", yearOpts)}`;
}

export default async function ReceiptsPage() {
  const weeks = Array.from({ length: 8 }, (_, i) => getWeekBounds(i));

  // Build contact lookup from all contacts
  const allContacts = await prisma.contact.findMany({
    select: { id: true, name: true, email: true },
  });
  const contactMap = new Map(allContacts.map((c) => [c.id, c.name]));

  const receipts = [];

  for (let i = 0; i < weeks.length; i++) {
    const { start, end } = weeks[i];

    const [
      newContacts,
      ndasSentAccesses,
      ndasSignedAccesses,
      docViewLogs,
      magicLinkLogs,
    ] = await Promise.all([
      // New contacts created this week
      prisma.contact.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { id: true, name: true },
      }),

      // NDAs sent: DataRoomAccess records where NDA was sent (sent, signed, declined, voided all mean it was sent)
      // Use updatedAt for sent status, createdAt for tracking when the access was created
      prisma.dataRoomAccess.findMany({
        where: {
          ndaStatus: { in: ["sent", "signed", "declined", "voided"] },
          createdAt: { gte: start, lte: end },
        },
        select: {
          contactId: true,
          contact: { select: { name: true } },
        },
      }),

      // NDAs signed: DataRoomAccess records where NDA was signed, using approvedAt or updatedAt
      prisma.dataRoomAccess.findMany({
        where: {
          ndaStatus: "signed",
          updatedAt: { gte: start, lte: end },
        },
        select: {
          contactId: true,
          contact: { select: { name: true } },
        },
      }),

      // Doc views from audit log (file.download by contacts)
      prisma.auditLog.findMany({
        where: {
          action: "file.download",
          actorType: "contact",
          createdAt: { gte: start, lte: end },
        },
        select: { actorId: true },
      }),

      // Magic links sent
      prisma.auditLog.findMany({
        where: {
          action: "magic_link.created",
          createdAt: { gte: start, lte: end },
        },
        select: { actorId: true, metadata: true },
      }),

    ]);

    // New Contacts
    const newContactNames = newContacts.map((c) => c.name);

    // NDAs Sent — deduplicate by contactId
    const ndaSentMap = new Map<string, string>();
    for (const a of ndasSentAccesses) {
      ndaSentMap.set(a.contactId, a.contact.name);
    }
    const ndaSentNames = [...ndaSentMap.values()];

    // NDAs Signed — deduplicate by contactId
    const ndaSignedMap = new Map<string, string>();
    for (const a of ndasSignedAccesses) {
      ndaSignedMap.set(a.contactId, a.contact.name);
    }
    const ndaSignedNames = [...ndaSignedMap.values()];

    // Doc Views — contact name + view count
    const viewCounts = new Map<string, number>();
    for (const log of docViewLogs) {
      viewCounts.set(log.actorId, (viewCounts.get(log.actorId) || 0) + 1);
    }
    const docViewDetails = [...viewCounts.entries()]
      .map(([id, count]) => {
        const name = contactMap.get(id);
        return name ? `${name} (${count} ${count === 1 ? "view" : "views"})` : null;
      })
      .filter(Boolean) as string[];

    // Magic Links — contact name + access count
    const emailToName = new Map(allContacts.map((c) => [c.email, c.name]));
    const magicLinkCounts = new Map<string, number>();
    for (const log of magicLinkLogs) {
      const meta = log.metadata as Record<string, unknown> | null;
      const email = meta?.contactEmail as string | undefined;
      if (email) magicLinkCounts.set(email, (magicLinkCounts.get(email) || 0) + 1);
    }
    const magicLinkNames = [...magicLinkCounts.entries()]
      .map(([email, count]) => {
        const name = emailToName.get(email) || email;
        return `${name} (${count} ${count === 1 ? "time" : "times"})`;
      });

    receipts.push({
      weekLabel: formatWeekRange(start, end),
      isCurrent: i === 0,
      receiptNumber: weeks.length - i,
      newContacts: newContacts.length,
      newContactNames,
      ndasSent: ndaSentMap.size,
      ndaSentNames,
      ndasSigned: ndaSignedMap.size,
      ndaSignedNames,
      totalDocViews: docViewLogs.length,
      docViewDetails,
      magicLinksSent: magicLinkLogs.length,
      magicLinkNames,
    });
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Weekly Receipts</h1>
        <p className="text-sm text-gray-500 mt-1">
          Weekly activity reports for your data rooms
        </p>
      </div>

      <div className="space-y-4">
        {receipts.map((receipt, idx) => (
          <ReceiptCard key={idx} {...receipt} />
        ))}
      </div>
    </div>
  );
}
