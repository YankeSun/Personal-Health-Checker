import { ReactNode } from "react";

import { AppLink } from "@/components/shared/app-link";
import { AppNavigation } from "@/components/shared/app-navigation";
import { Logo } from "@/components/shared/logo";

type AppShellProps = {
  userName: string;
  children: ReactNode;
};

const navigation = [
  { href: "/dashboard", label: "仪表盘", shortLabel: "仪表盘" },
  { href: "/today", label: "今日记录", shortLabel: "今日" },
  { href: "/history", label: "历史记录", shortLabel: "历史" },
  { href: "/trends", label: "历史趋势", shortLabel: "趋势" },
  { href: "/settings", label: "设置与目标", shortLabel: "设置" },
];

export function AppShell({ userName, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f7f4_0%,#eef6f0_50%,#f4f8fc_100%)]">
      <header className="sticky top-0 z-30 border-b border-white/70 bg-white/82 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <Logo />
          <AppNavigation items={navigation} />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 md:inline">你好，{userName}</span>
            <AppLink
              className="hidden rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100 md:inline-flex"
              href="/experience"
            >
              产品概览
            </AppLink>
            <form action="/api/auth/logout" method="post">
              <button
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                type="submit"
              >
                退出登录
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8 pb-28 md:py-10 md:pb-10">{children}</main>
    </div>
  );
}
