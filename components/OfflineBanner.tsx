"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getOutboxSize, syncNow, onSyncChange, getProfile } from "@/lib/sync";

export default function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [inRoom, setInRoom] = useState(true);

  useEffect(() => {
    const refresh = () => {
      setPending(getOutboxSize());
      setInRoom(Boolean(getProfile().roomId));
    };
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

  const show = !online || syncing || (pending > 0 && inRoom) || (pending > 0 && !inRoom);
  if (!show) return null;

  // ยังไม่ได้เข้าห้อง แต่มีของค้าง → ชวนไปเข้าห้อง
  if (online && !syncing && pending > 0 && !inRoom) {
    return (
      <Wrap tone="slate">
        <span>💾</span>
        <span className="flex-1">บันทึกในเครื่องแล้ว · เข้าห้องเพื่อแชร์กับเพื่อน</span>
        <Link href="/settings" className="rounded-full bg-white/25 px-2.5 py-1">
          เข้าห้อง
        </Link>
      </Wrap>
    );
  }

  return (
    <Wrap tone={!online ? "dark" : syncing ? "sky" : "amber"}>
      <span className={syncing ? "animate-spin" : ""}>{!online ? "🔌" : syncing ? "🔄" : "⏳"}</span>
      <span className="flex-1">
        {!online ? "โหมดออฟไลน์ · บันทึกไว้ในเครื่อง" : syncing ? "กำลังซิงก์…" : `รอซิงก์ ${pending} รายการ`}
      </span>
      {online && !syncing && pending > 0 && (
        <button onClick={() => void syncNow()} className="rounded-full bg-white/25 px-2.5 py-1">
          ซิงก์เลย
        </button>
      )}
    </Wrap>
  );
}

/** sticky (ไม่ใช่ fixed) → ดันเนื้อหาลง ไม่ทับหัวข้อ */
function Wrap({ tone, children }: { tone: "dark" | "sky" | "amber" | "slate"; children: React.ReactNode }) {
  const bg = {
    dark: "bg-slate-800 text-white",
    sky: "bg-sky-500 text-white",
    amber: "bg-amber-400 text-amber-950",
    slate: "bg-slate-600 text-white",
  }[tone];

  return (
    <div className="sticky top-0 z-[60] mx-auto max-w-md px-3 pb-1 pt-2">
      <div className={`flex items-center gap-2 rounded-2xl px-3.5 py-2 text-xs font-medium shadow-lg ${bg}`}>
        {children}
      </div>
    </div>
  );
}
