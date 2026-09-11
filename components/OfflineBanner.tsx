"use client";

import { useEffect, useState } from "react";
import { getOutboxSize, syncNow, onSyncChange } from "@/lib/sync";

export default function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const refresh = () => setPending(getOutboxSize());
    const net = () => { setOnline(navigator.onLine); if (navigator.onLine) void syncNow(); };
    setOnline(navigator.onLine); refresh();
    window.addEventListener("online", net);
    window.addEventListener("offline", net);
    window.addEventListener("hwnote:update", refresh);
    const off = onSyncChange((s) => { setSyncing(s === "syncing"); refresh(); });
    return () => {
      window.removeEventListener("online", net);
      window.removeEventListener("offline", net);
      window.removeEventListener("hwnote:update", refresh);
      off();
    };
  }, []);

  if (online && !syncing && pending === 0) return null;
  const bg = !online ? "bg-slate-800 text-white" : syncing ? "bg-sky-500 text-white" : "bg-amber-400 text-amber-950";

  return (
    <div className="sticky top-0 z-[60] mx-auto max-w-md px-3 pb-1 pt-2">
      <div className={`flex items-center gap-2 rounded-2xl px-3.5 py-2 text-xs font-medium shadow-lg ${bg}`}>
        <span className={syncing ? "animate-spin" : ""}>{!online ? "🔌" : syncing ? "🔄" : "⏳"}</span>
        <span className="flex-1">{!online ? "โหมดออฟไลน์ · บันทึกในเครื่อง" : syncing ? "กำลังซิงก์…" : `รอซิงก์ ${pending} รายการ`}</span>
        {online && !syncing && <button onClick={() => void syncNow()} className="rounded-full bg-white/25 px-2.5 py-1">ซิงก์เลย</button>}
      </div>
    </div>
  );
}
