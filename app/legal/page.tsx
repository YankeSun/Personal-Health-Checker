import { AppLink } from "@/components/shared/app-link";
import { Logo } from "@/components/shared/logo";
import { legalDocs } from "@/lib/content/legal";

export const metadata = {
  title: "协议与说明 | Personal Health Checker",
  description: "查看隐私保护指引、用户协议和健康免责声明。",
};

export default function LegalIndexPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#faf8f2_0%,#eef6f0_48%,#f4f7fb_100%)] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex flex-col gap-5 rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-[0_18px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <AppLink
            className="w-fit rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-800 transition hover:border-slate-400"
            href="/"
          >
            返回首页
          </AppLink>
        </header>

        <section className="rounded-[36px] border border-white/80 bg-white/82 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-800">
            Legal
          </p>
          <h1 className="mt-4 text-4xl font-semibold text-slate-950 [font-family:var(--font-display)]">
            协议与说明
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            数据如何保存，边界如何定义，都在这里说清楚。
          </p>
        </section>

        <div className="grid gap-4">
          {legalDocs.map((doc) => (
            <AppLink
              key={doc.slug}
              className="rounded-[28px] border border-white/80 bg-white/82 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white"
              href={`/legal/${doc.slug}`}
            >
              <p className="text-lg font-semibold text-slate-950">{doc.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{doc.description}</p>
            </AppLink>
          ))}
        </div>
      </div>
    </main>
  );
}
