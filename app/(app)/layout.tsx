import { AppShell } from "@/components/shared/app-shell";
import { requireUser } from "@/lib/auth/guards";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <AppShell userName={user.profile?.displayName ?? user.email}>{children}</AppShell>
  );
}
