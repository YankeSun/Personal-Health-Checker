export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-[20px] bg-[radial-gradient(circle_at_top_left,#34d399,#0f766e)] text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[0_12px_30px_rgba(16,185,129,0.28)]">
        PHC
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">
          Personal Health Checker
        </p>
        <p className="text-sm text-slate-500">把日常记成线索</p>
      </div>
    </div>
  );
}
