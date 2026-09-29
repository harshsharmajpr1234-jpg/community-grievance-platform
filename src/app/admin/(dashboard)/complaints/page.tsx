import { Suspense } from "react";
import { AdminComplaintsList } from "@/components/admin/complaints";
import { PageHeader, Spinner } from "@/components/ui";
import { activeAdminsForAssignment } from "@/server/services/admin";

export const dynamic = "force-dynamic";

export default async function AdminComplaintsPage() {
  const admins = await activeAdminsForAssignment();
  return (
    <div>
      <PageHeader title="Complaints" subtitle="Search, filter, verify, assign and update complaints. Every action is recorded." />
      <Suspense fallback={<Spinner />}>
        <AdminComplaintsList admins={admins} />
      </Suspense>
    </div>
  );
}
