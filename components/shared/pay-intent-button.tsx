"use client";

import { useEffect, useRef, useState } from "react";

import { getApiErrorMessage } from "@/lib/utils/client-api";

type PayIntentButtonProps = {
  offer: "WEIGHT_REPORT_30D" | "WEIGHT_CHALLENGE_7D" | "GOAL_PROGRESS_SUMMARY";
  source: string;
};

export function PayIntentButton({ offer, source }: PayIntentButtonProps) {
  const hasTrackedShown = useRef(false);
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (hasTrackedShown.current) {
      return;
    }

    hasTrackedShown.current = true;
    void fetch("/api/intent/pay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "shown",
        offer,
        source,
      }),
    }).catch(() => {
      // Exposure tracking should never block the dashboard experience.
    });
  }, [offer, source]);

  async function handleClick() {
    setIsPending(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/intent/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "clicked",
          offer,
          source,
        }),
      });

      if (!response.ok) {
        setError(await getApiErrorMessage(response, "记录失败，请稍后再试"));
        return;
      }

      const payload = (await response.json().catch(() => null)) as
        | {
            message?: string;
          }
        | null;

      setMessage(payload?.message ?? "已加入等待名单。");
    } catch {
      setError("网络异常，请稍后再试");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        className="inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        onClick={handleClick}
        type="button"
      >
        {isPending ? "加入中..." : "加入等待名单"}
      </button>
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
