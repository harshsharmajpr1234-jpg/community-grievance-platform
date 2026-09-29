import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { collections } from "@/db";
import { ProfileView } from "@/components/profile-view";
import { publicUser } from "@/server/auth/account";
import { getUserSession } from "@/server/auth/session";

export const metadata: Metadata = { title: "My Profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await getUserSession();
  if (!session) redirect("/login?next=/profile");
  const c = await collections();
  const user = await c.users.findOne({ id: session.sub });
  if (!user || user.isActive === false) redirect("/login");
  const { tab } = await searchParams;
  const initialTab = tab === "notifications" || tab === "profile" ? tab : "complaints";
  return <ProfileView user={publicUser(user)} initialTab={initialTab} />;
}
