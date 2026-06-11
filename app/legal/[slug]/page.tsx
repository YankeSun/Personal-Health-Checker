import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppLink } from "@/components/shared/app-link";
import { Logo } from "@/components/shared/logo";
import { getLegalDoc, legalDocs } from "@/lib/content/legal";

type LegalPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return legalDocs.map((doc) => ({
    slug: doc.slug,
  }));
}

export async function generateMetadata({
  params,
}: LegalPageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = getLegalDoc(slug);

  if (!doc) {
    return {
      title: "协议与说明 | Personal Health Checker",
    };
  }

  return {
    title: `${doc.title} | Personal Health Checker`,
    description: doc.description,
  };
}

export default async function LegalDetailPage({ params }: LegalPageProps) {
  const { slug } = await params;
  const doc = getLegalDoc(slug);

  if (!doc) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#faf8f2_0%,#eef6f0_48%,#f4f7fb_100%)] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex flex-col gap-5 rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-[0_18px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <div className="flex flex-wrap gap-3">
            <AppLink
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-800 transition hover:border-slate-400"
              href="/legal"
            >
              协议与说明
            </AppLink>
            <AppLink
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              href="/"
            >
              返回首页
            </AppLink>
          </div>
        </header>

        <article className="rounded-[36px] border border-white/80 bg-white/84 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-800">
            Updated {doc.updatedAt}
          </p>
          <h1 className="mt-4 text-4xl font-semibold text-slate-950 [font-family:var(--font-display)]">
            {doc.title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            {doc.description}
          </p>

          <div className="mt-10 space-y-9">
            {doc.sections.map((section) => (
              <section key={section.title} className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-950">
                  {section.title}
                </h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-7 text-slate-700">
                    {paragraph}
                  </p>
                ))}
                {section.bullets ? (
                  <ul className="space-y-3">
                    {section.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm leading-7 text-slate-700"
                      >
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </article>
      </div>
    </main>
  );
}
