"use client";

import { useState } from "react";

import { getApiErrorMessage } from "@/lib/utils/client-api";

type EmailVerificationBannerProps = {
  email: string;
};

export function EmailVerificationBanner({ email }: EmailVerificationBannerProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleResend() {
    setError("");
    setSuccess("");
    setIsPending(true);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
      });

      if (!response.ok) {
        setError(await getApiErrorMessage(response, "暂时无法发送验证邮件"));
        return;
      }

      setSuccess(`验证链接已发送到 ${email}`);
    } catch {
      setError("网络异常，请稍后再试");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-amber-200 bg-amber-50/90 px-5 py-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-amber-950">邮箱尚未验证</p>
          <p className="text-sm leading-6 text-amber-900">
            完成邮箱验证后，你可以更安全地找回密码并保护账号。当前邮箱：{email}
          </p>
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
        </div>
        <button
          className="rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-950 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={handleResend}
          disabled={isPending}
        >
          {isPending ? "发送中..." : "重新发送验证邮件"}
        </button>
      </div>
    </section>
  );
}
