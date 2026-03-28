import { AuditTable } from "@/components/admin/audit-table";

export default function AuditPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-1">
          System activity and access events
        </p>
      </div>

      <AuditTable />
    </div>
  );
}
