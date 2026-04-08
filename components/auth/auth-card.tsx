import { ReactNode } from "react";

import { AppLink } from "@/components/shared/app-link";
import { Logo } from "@/components/shared/logo";

type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <Logo />
      <div className="mt-8 space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <div className="mt-8">{children}</div>
      <div className="mt-6 flex items-center justify-between gap-4 text-sm">
        <p className="text-slate-500">先看看产品。</p>
        <AppLink
          className="font-medium text-emerald-700 transition hover:text-emerald-800"
          href="/experience"
        >
          进入体验
        </AppLink>
      </div>
    </div>
  );
}
