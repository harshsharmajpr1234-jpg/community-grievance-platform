import { Suspense } from "react";
import { collections } from "@/db";
import { ChangePasswordForm } from "@/components/admin/auth-forms";
import { TwoFactorPanel } from "@/components/admin/misc";
import { PageHeader } from "@/components/ui";
import { getAdminSession } from "@/server/auth/session";
import { ROLE_LABELS } from "@/shared/constants";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getAdminSession();
  const c = await collections();
  const admin = (await c.admins.findOne({ id: session!.sub }))!;
  return (
    <div className="max-w-3xl">
      <PageHeader title="My Account" subtitle={`${admin.name} • ${admin.email} • ${ROLE_LABELS[admin.role]}`} />
      <div className="grid gap-5 md:grid-cols-2">
        <Suspense>
          <TwoFactorPanel enabled={Boolean(admin.twoFactorEnabled)} />
        </Suspense>
        <div className="card">
          <h2 className="font-bold text-slate-900">Change password</h2>
          <ChangePasswordForm forced={false} />
        </div>
      </div>
    </div>
  );
}
