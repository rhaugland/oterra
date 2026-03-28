import { prisma } from "@/lib/prisma";

function getWeekBounds(weeksAgo: number) {
  const now = new Date();
  // Start of current week (Monday)
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

interface WeeklyReceipt {
  weekLabel: string;
  start: Date;
  end: Date;
  newContacts: number;
  ndasSigned: number;
  ndasSent: number;
  totalDocViews: number;
  isCurrent: boolean;
}

export default async function ReceiptsPage() {
  // Generate receipts for the last 8 weeks
  const weeks = Array.from({ length: 8 }, (_, i) => getWeekBounds(i));

  const receipts: WeeklyReceipt[] = [];

  for (let i = 0; i < weeks.length; i++) {
    const { start, end } = weeks[i];

    const [newContacts, ndasSigned, ndasSent, docViews] = await Promise.all([
      prisma.contact.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      prisma.auditLog.count({
        where: {
          action: "nda.signed",
          createdAt: { gte: start, lte: end },
        },
      }),
      prisma.auditLog.count({
        where: {
          action: { in: ["nda.sent", "access.assigned"] },
          createdAt: { gte: start, lte: end },
        },
      }),
      prisma.auditLog.count({
        where: {
          action: "file.download",
          actorType: "contact",
          createdAt: { gte: start, lte: end },
        },
      }),
    ]);

    receipts.push({
      weekLabel: formatWeekRange(start, end),
      start,
      end,
      newContacts,
      ndasSigned,
      ndasSent,
      totalDocViews: docViews,
      isCurrent: i === 0,
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
          <div
            key={idx}
            className={`bg-white rounded-xl border ${
              receipt.isCurrent ? "border-ottera-red-600/30 shadow-md" : "border-gray-200"
            } p-6`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  {receipt.weekLabel}
                </h2>
                {receipt.isCurrent && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-ottera-red-50 text-ottera-red-600 mt-1">
                    Current Week
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] font-semibold text-gray-400 uppercase">Receipt #{receipts.length - idx}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase">New Contacts</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{receipt.newContacts}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase">NDAs Sent</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{receipt.ndasSent}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] font-semibold text-green-600 uppercase">NDAs Signed</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{receipt.ndasSigned}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase">Doc Views</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{receipt.totalDocViews}</p>
              </div>
            </div>

            {receipt.newContacts === 0 && receipt.ndasSigned === 0 && receipt.ndasSent === 0 && receipt.totalDocViews === 0 && (
              <p className="text-xs text-gray-400 mt-3 text-center">No activity this week</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
