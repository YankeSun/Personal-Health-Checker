type PlaceholderPanelProps = {
  title: string;
  description: string;
};

export function PlaceholderPanel({
  title,
  description,
}: PlaceholderPanelProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          {description}
        </p>
      </div>
      <div className="mt-8 rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/60 p-6 text-sm leading-7 text-emerald-900">
        内容会在这里继续展开，保持同一套记录与回看节奏。
      </div>
    </section>
  );
}
