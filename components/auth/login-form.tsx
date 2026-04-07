"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { AppLink } from "@/components/shared/app-link";
import { getApiErrorMessage } from "@/lib/utils/client-api";

type FormState = {
  email: string;
  password: string;
};

const initialState: FormState = {
  email: "",
  password: "",
};

export function LoginForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsPending(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        setError(await getApiErrorMessage(response, "登录失败，请稍后再试"));
        return;
      }

      router.push("/dashboard", { scroll: false });
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
          autoComplete="current-password"
          required
        />
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
        {isPending ? "登录中..." : "登录"}
      </button>
      <p className="text-sm text-slate-600">
        还没有账号？{" "}
        <AppLink className="font-medium text-emerald-700" href="/register">
          去注册
        </AppLink>
      </p>
    </form>
  );
}
