import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentUser } from "@/lib/auth/session";

export default async function RegisterPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <AuthCard
        title="创建你的健康账号"
        description="把每天的记录、目标和偏好集中到同一个健康空间里，持续形成清晰的长期趋势。"
      >
        <RegisterForm />
      </AuthCard>
    </main>
  );
}
