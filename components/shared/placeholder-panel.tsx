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
        这里会承接与你当前场景相关的核心内容，保持和整体产品一致的浏览与操作节奏。
      </div>
    </section>
  );
}
