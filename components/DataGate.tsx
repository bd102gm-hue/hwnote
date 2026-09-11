"use client";

import { useEffect, useState } from "react";
import { bootstrapAll, pullAll, subscribeAll, syncNow } from "@/lib/sync";
import { checkDue } from "@/lib/notify";

export default function DataGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let unsub = () => {};
    let alive = true;

    (async () => {
      try { await bootstrapAll(); } catch (e) { console.warn(e); }
      if (!alive) return;
      setReady(true);
      unsub = subscribeAll();
      void checkDue();
    })();

    const iv = setInterval(() => { void syncNow(); }, 30_000);
    const ivPull = setInterval(() => { void pullAll(); void checkDue(); }, 5 * 60_000);
    const onFocus = () => { void syncNow(); void pullAll(); void checkDue(); };
    window.addEventListener("focus", onFocus);

    return () => {
      alive = false; unsub();
      clearInterval(iv); clearInterval(ivPull);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (!ready)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-indigo-200 border-t-indigo-500" />
        <p className="text-sm text-slate-400">กำลังโหลดข้อมูลห้อง…</p>
      </div>
    );

  return <>{children}</>;
}
