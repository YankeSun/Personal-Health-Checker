import { AppLink } from "@/components/shared/app-link";
import type { ReminderFeed } from "@/lib/services/reminder-service";

type ReminderPanelProps = {
  feed: ReminderFeed;
  title?: string;
  description?: string;
};

const toneStyles = {
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  info: "border-sky-200 bg-sky-50 text-sky-950",
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
} as const;

export function ReminderPanel({
  feed,
  title = "站内提醒",
  description = "最近最值得先看的事。",
}: ReminderPanelProps) {
  if (!feed.enabled) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <article className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-900">提醒已关闭</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            在“我的”里重新打开，就能看到缺口、目标和连续状态。
          </p>
          <AppLink
            className="mt-4 inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
            href="/settings"
          >
            去开启
          </AppLink>
        </article>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
      </div>

      {feed.reminders.length === 0 ? (
        <article className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-semibold text-emerald-950">现在很安静</p>
          <p className="mt-2 text-sm leading-6 text-emerald-800">
            今天的记录和最近的节奏都在轨道上。
          </p>
        </article>
      ) : (
        <div className="mt-5 space-y-4">
          {feed.reminders.map((reminder) => (
            <article
              className={`rounded-2xl border p-5 ${toneStyles[reminder.tone]}`}
              key={reminder.id}
            >
              <p className="text-sm font-semibold">{reminder.title}</p>
              <p className="mt-2 text-sm leading-6 opacity-90">{reminder.description}</p>
              <AppLink
                className="mt-4 inline-flex rounded-full border border-current/20 px-4 py-2 text-sm font-medium transition hover:bg-white/60"
                href={reminder.actionHref}
              >
                {reminder.actionLabel}
              </AppLink>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
