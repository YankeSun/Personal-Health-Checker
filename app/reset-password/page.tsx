import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { token } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <AuthCard
        title="设置新密码"
        description={token ? "输入新的密码，完成账号恢复。" : "这个链接不可用，请重新发起密码重置。"}
      >
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
            缺少有效的重置令牌，请返回登录页重新申请。
          </p>
        )}
      </AuthCard>
    </main>
  );
}
