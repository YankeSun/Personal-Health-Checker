"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { getApiErrorMessage } from "@/lib/utils/client-api";

export function AccountDataPanel() {
  const router = useRouter();
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleExport() {
    setIsExporting(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/account/export", {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        setError(await getApiErrorMessage(response, "导出失败，请稍后再试"));
        return;
      }

      const payload = await response.json();
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "personal-health-checker-account.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage("个人数据导出已生成。");
    } catch {
      setError("网络异常，请稍后再试。");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDelete() {
    if (deleteConfirmation !== "DELETE") {
      setError("请输入 DELETE 以确认删除账号。");
      return;
    }

    setIsDeleting(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
      });

      if (!response.ok) {
        setError(await getApiErrorMessage(response, "删除账号失败，请稍后再试"));
        return;
      }

      setMessage("账号已删除，正在返回登录页。");
      router.replace("/login");
      router.refresh();
    } catch {
      setError("网络异常，请稍后再试。");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
            Data Rights
          </p>
          <h2 className="text-2xl font-semibold text-slate-900">数据与账号</h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            你可以导出个人资料、目标、每日记录、体重背景、微信身份映射和产品事件，也可以删除账号和全部关联数据。
          </p>
        </div>
        <button
          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={handleExport}
          disabled={isExporting || isDeleting}
        >
          {isExporting ? "正在导出..." : "导出个人数据"}
        </button>
      </div>

      <div className="mt-6 rounded-3xl border border-rose-100 bg-rose-50/70 p-5">
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-rose-950">删除账号</h3>
          <p className="text-sm leading-6 text-rose-900">
            删除后会清空账号、资料、目标、记录、会话、微信身份映射和与账号关联的产品事件。此操作不可恢复。
          </p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-rose-950">
              输入 DELETE 以确认
            </span>
            <input
              className="w-full rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-500"
              type="text"
              value={deleteConfirmation}
              onChange={(event) => {
                setDeleteConfirmation(event.target.value);
                setError("");
                setMessage("");
              }}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <button
            className="self-end rounded-2xl bg-rose-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={handleDelete}
            disabled={isDeleting || isExporting || deleteConfirmation !== "DELETE"}
          >
            {isDeleting ? "正在删除..." : "删除账号"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}
    </section>
  );
}
