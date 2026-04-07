"use client";

import { usePathname } from "next/navigation";

import { AppLink } from "@/components/shared/app-link";

type NavigationItem = {
  href: string;
  label: string;
  shortLabel: string;
};

type AppNavigationProps = {
  items: NavigationItem[];
};

function isActivePath(pathname: string, href: string) {
  return pathname === href;
}

export function AppNavigation({ items }: AppNavigationProps) {
  const pathname = usePathname();

  return (
    <>
      <nav className="hidden items-center gap-2 md:flex">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href);

          return (
            <AppLink
              className={`rounded-full px-4 py-2 text-sm transition ${
                active
                  ? "bg-slate-900 text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </AppLink>
          );
        })}
      </nav>

      <nav className="fixed inset-x-4 bottom-4 z-40 md:hidden">
        <div
          className="grid rounded-[26px] border border-white/80 bg-white/92 p-2 shadow-[0_20px_60px_rgba(15,23,42,0.16)] backdrop-blur"
          style={{
            gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
          }}
        >
          {items.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <AppLink
                className={`rounded-[18px] px-3 py-3 text-center text-xs font-medium transition ${
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
                href={item.href}
                key={item.href}
              >
                {item.shortLabel}
              </AppLink>
            );
          })}
        </div>
      </nav>
    </>
  );
}
