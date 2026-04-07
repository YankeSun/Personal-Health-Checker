import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth/session";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <AuthCard
        title="登录你的健康空间"
        description="进入你的每日健康记录，继续查看今日状态、趋势变化与目标进度。"
      >
        <LoginForm />
      </AuthCard>
    </main>
  );
}
