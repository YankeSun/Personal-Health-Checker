import { AppLink } from "@/components/shared/app-link";
import { verifyEmailToken } from "@/lib/services/account-security-service";
import { AuthError } from "@/lib/services/auth-service";

type VerifyEmailPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const { token } = await searchParams;
  let state: "idle" | "success" | "error" = "idle";
  let message = "请从验证邮件中打开此页面。";

  if (token) {
    try {
      await verifyEmailToken(token);
      state = "success";
      message = "邮箱已经验证完成。";
    } catch (error) {
      state = "error";
      message =
        error instanceof AuthError ? error.message : "邮箱验证失败，请稍后再试。";
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">验证邮箱</h1>
          <p
            className={`text-sm leading-6 ${
              state === "success"
                ? "text-emerald-700"
                : state === "error"
                  ? "text-rose-600"
                  : "text-slate-600"
            }`}
          >
            {message}
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <AppLink
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            href="/login"
          >
            去登录
          </AppLink>
          <AppLink
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-800 transition hover:border-slate-400"
            href="/dashboard"
          >
            返回产品
          </AppLink>
        </div>
      </div>
    </main>
  );
}
