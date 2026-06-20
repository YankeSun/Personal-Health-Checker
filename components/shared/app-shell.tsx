import { ReactNode } from "react";

import { EmailVerificationBanner } from "@/components/auth/email-verification-banner";
import { AppLink } from "@/components/shared/app-link";
import { AppNavigation } from "@/components/shared/app-navigation";
import { Logo } from "@/components/shared/logo";

type AppShellProps = {
  userName: string;
  userEmail: string;
  emailVerified: boolean;
  children: ReactNode;
};

const navigation = [
  { href: "/dashboard", label: "概览", shortLabel: "概览" },
  { href: "/today", label: "记录", shortLabel: "记录" },
  { href: "/history", label: "回看", shortLabel: "回看" },
  { href: "/trends", label: "趋势", shortLabel: "趋势" },
  { href: "/settings", label: "我的", shortLabel: "我的" },
];

export function AppShell({
  userName,
  userEmail,
  emailVerified,
  children,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f7f4_0%,#eef6f0_50%,#f4f8fc_100%)]">
      <header className="sticky top-0 z-30 border-b border-white/70 bg-white/82 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <Logo />
          <AppNavigation items={navigation} />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 md:inline">{userName}</span>
            <AppLink
              className="hidden rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100 md:inline-flex"
              href="/experience"
            >
              体验页
            </AppLink>
            <form action="/api/auth/logout" method="post">
              <button
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                type="submit"
              >
                退出
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8 pb-28 md:py-10 md:pb-10">
        {emailVerified ? null : <EmailVerificationBanner email={userEmail} />}
        {children}
      </main>
    </div>
  );
}
