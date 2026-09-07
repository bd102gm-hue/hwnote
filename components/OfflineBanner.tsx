"use client";

import { useEffect, useState } from "react";
import { getOutboxSize, syncNow, onSyncChange } from "@/lib/sync";

export default function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const refresh = () => setPending(getOutboxSize());
    const netChange = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) void syncNow();
    };

    setOnline(navigator.onLine);
    refresh();

    window.addEventListener("online", netChange);
    window.addEventListener("offline", netChange);
    window.addEventListener("hwnote:update", refresh);

    const offSync = onSyncChange((s) => {
      setSyncing(s === "syncing");
      refresh();
    });

    return () => {
      window.removeEventListener("online", netChange);
      window.removeEventListener("offline", netChange);
      window.removeEventListener("hwnote:update", refresh);
      offSync();
    };
  }, []);

  if (online && pending === 0 && !syncing) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] mx-auto max-w-md px-3 pt-2">
      <div
        className={`pointer-events-auto flex items-center gap-2 rounded-2xl px-3.5 py-2 text-xs font-medium shadow-lg backdrop-blur-xl ${
          !online
            ? "bg-slate-800/90 text-white"
            : syncing
            ? "bg-sky-500/90 text-white"
            : "bg-amber-400/95 text-amber-950"
        }`}
      >
        <span className={syncing ? "animate-spin" : ""}>{!online ? "🔌" : syncing ? "🔄" : "⏳"}</span>
        <span className="flex-1">
          {!online ? "โหมดออฟไลน์ · บันทึกไว้ในเครื่อง" : syncing ? "กำลังซิงก์…" : `รอซิงก์ ${pending} รายการ`}
        </span>
        {online && !syncing && pending > 0 && (
          <button onClick={() => void syncNow()} className="rounded-full bg-white/30 px-2.5 py-1">
            ซิงก์เลย
          </button>
        )}
      </div>
    </div>
  );
}
