import { AuditLogTable } from "@/components/admin/misc";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function AuditLogsPage() {
  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Every admin action with old/new values, IP address and timestamp." />
      <AuditLogTable />
    </div>
  );
}
