"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { AppLink } from "@/components/shared/app-link";
import { getApiErrorMessage } from "@/lib/utils/client-api";

type FormState = {
  displayName: string;
  email: string;
  password: string;
  acceptedLegal: boolean;
};

const initialState: FormState = {
  displayName: "",
  email: "",
  password: "",
  acceptedLegal: false,
};

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!form.acceptedLegal) {
      setError("请先同意隐私保护指引和用户协议");
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        setError(await getApiErrorMessage(response, "注册失败，请稍后再试"));
        return;
      }

      router.push("/today?welcome=1", { scroll: false });
      router.refresh();
    } catch {
      setError("网络异常，请稍后再试");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">昵称</span>
        <input
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
          type="text"
          value={form.displayName}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              displayName: event.target.value,
            }))
          }
          placeholder="例如：Yank"
          autoComplete="nickname"
          required
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">邮箱</span>
        <input
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
          type="email"
          value={form.email}
          onChange={(event) =>
            setForm((current) => ({ ...current, email: event.target.value }))
          }
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">密码</span>
        <input
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
          type="password"
          value={form.password}
          onChange={(event) =>
            setForm((current) => ({ ...current, password: event.target.value }))
          }
          placeholder="至少 8 位密码"
          autoComplete="new-password"
          required
        />
      </label>
      <label className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-6 text-slate-600">
        <input
          className="mt-1 size-4 rounded border-slate-300 text-slate-900 accent-slate-900"
          type="checkbox"
          checked={form.acceptedLegal}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              acceptedLegal: event.target.checked,
            }))
          }
        />
        <span>
          我已阅读并同意{" "}
          <AppLink className="font-medium text-slate-900" href="/legal/privacy">
            隐私保护指引
          </AppLink>
          、{" "}
          <AppLink className="font-medium text-slate-900" href="/legal/terms">
            用户协议
          </AppLink>
          ，并了解本产品不提供医疗诊断。
        </span>
      </label>
      {error ? (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}
      <button
        className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={isPending}
      >
        {isPending ? "创建中..." : "创建记录空间"}
      </button>
      <p className="text-sm text-slate-600">
        已有记录空间？{" "}
        <AppLink className="font-medium text-emerald-700" href="/login">
          直接登录
        </AppLink>
      </p>
    </form>
  );
}
