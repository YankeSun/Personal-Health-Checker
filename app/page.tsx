import { AppLink } from "@/components/shared/app-link";
import { Logo } from "@/components/shared/logo";

export default async function HomePage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#faf8f2_0%,#eef6f0_42%,#f4f7fb_100%)] px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-12">
        <header className="flex flex-col gap-4 rounded-[36px] border border-white/70 bg-white/75 px-6 py-5 shadow-[0_18px_80px_rgba(15,23,42,0.08)] backdrop-blur md:flex-row md:items-center md:justify-between">
          <Logo />
          <div className="flex flex-wrap gap-3">
            <AppLink
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-800 transition hover:border-slate-400"
              href="/experience"
            >
              查看产品
            </AppLink>
            <AppLink
              className="rounded-full border border-emerald-300 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100"
              href="/login"
            >
              登录
            </AppLink>
            <AppLink
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              href="/register"
            >
              注册
            </AppLink>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex rounded-full border border-emerald-300/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-800">
              Daily Health Clarity
            </div>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-5xl leading-tight text-slate-950 [font-family:var(--font-display)] sm:text-6xl">
                把睡眠、体重和饮水
                <br />
                变成一眼能看懂的
                <br />
                每日健康仪表盘
              </h1>
              <p className="max-w-2xl text-base leading-8 text-slate-700">
                用轻量、稳定、可持续的方式记录三项最核心的身体节律。今天记下数据，明天看见趋势，一周之后开始理解自己的状态变化。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <AppLink
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                href="/experience"
              >
                浏览产品界面
              </AppLink>
              <AppLink
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-800 transition hover:border-slate-400"
                href="/register"
              >
                创建账号
              </AppLink>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-[32px] border border-white/80 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.1)] backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Today
              </p>
              <p className="mt-3 text-2xl font-semibold text-slate-950">当天录入更轻</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                睡眠、体重、饮水三项集中在一个页面完成，减少切换成本。
              </p>
            </article>
            <article className="rounded-[32px] border border-white/80 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.1)] backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Dashboard
              </p>
              <p className="mt-3 text-2xl font-semibold text-slate-950">看趋势，不看杂音</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                把连续记录、达标率和今天的状态汇总到同一个视图里。
              </p>
            </article>
            <article className="rounded-[32px] border border-white/80 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.1)] backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Trends
              </p>
              <p className="mt-3 text-2xl font-semibold text-slate-950">7 天 / 30 天双视角</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                图表里带目标线，快速看清波动是在正常区间还是偏离目标。
              </p>
            </article>
            <article className="rounded-[32px] border border-white/80 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.1)] backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Settings
              </p>
              <p className="mt-3 text-2xl font-semibold text-slate-950">偏好、目标、提醒</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                单位、时区和目标一旦定好，后面的每一条趋势都会更清晰、更一致。
              </p>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
