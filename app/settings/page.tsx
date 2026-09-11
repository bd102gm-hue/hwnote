"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cachedMe, loadMe, signOut, updateNickname, type Me } from "@/lib/auth";
import { pullAll, syncNow } from "@/lib/sync";
import { getYear, roomName, DAY_NAMES, ALL_DAYS, getDuty } from "@/data/schedule";

export default function SettingsPage() {
  const [me, setMe] = useState<Me | null>(cachedMe());
  const [nick, setNick] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    loadMe().then((m) => { setMe(m); setNick(m?.nickname ?? ""); });
  }, []);

  if (!me) return <div className="p-16 text-center text-sm text-slate-400">กำลังโหลด…</div>;

  return (
    <main>
      <header className="rounded-b-3xl bg-gradient-to-br from-indigo-500 to-sky-400 px-5 pb-6 pt-8 text-white">
        <h1 className="text-xl font-bold">ตั้งค่า ⚙️</h1>
        <p className="text-xs opacity-85">ห้อง {roomName(getYear())}</p>
      </header>

      <div className="space-y-4 px-5 py-5">
        <div className="card p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-xl">👤</div>
            <div>
              <p className="font-semibold text-slate-800">{me.nickname}</p>
              <p className="text-[11px] text-slate-400">@{me.username}{me.isAdmin && " · ผู้ดูแล"}</p>
            </div>
          </div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">ชื่อเล่นที่แสดงตอนจด</label>
          <div className="flex gap-2">
            <input value={nick} onChange={(e) => setNick(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400" />
            <button onClick={async () => { await updateNickname(nick); setMe({ ...me, nickname: nick }); setMsg("บันทึกแล้ว ✅"); }}
              className="shrink-0 rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white">บันทึก</button>
          </div>
        </div>

        <div className="card p-4">
          <p className="mb-2 text-sm font-semibold text-slate-800">📋 เวรจดการบ้าน</p>
          <div className="space-y-1.5">
            {ALL_DAYS.map((d) => (
              <div key={d} className="flex justify-between text-xs">
                <span className="text-slate-500">วัน{DAY_NAMES[d]}</span>
                <span className="font-medium text-slate-700">{getDuty(d) || "—"}</span>
              </div>
            ))}
          </div>
          {me.isAdmin && <Link href="/admin" className="mt-3 block text-center text-[11px] text-indigo-500 underline">แก้ไขเวร</Link>}
        </div>

        {me.isAdmin && (
          <Link href="/admin" className="card flex items-center gap-3 p-4 active:bg-slate-50">
            <span className="text-xl">🛠</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">จัดการตารางเรียน</p>
              <p className="text-[11px] text-slate-400">แก้วิชา · เวร · เปลี่ยนปีการศึกษา</p>
            </div>
            <span className="text-slate-300">›</span>
          </Link>
        )}

        <div className="card space-y-2 p-4">
          <button onClick={() => { void pullAll(); void syncNow(); setMsg("ซิงก์แล้ว ✅"); }}
            className="w-full rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-700">🔄 ซิงก์ข้อมูลใหม่</button>
          <button onClick={async () => { await signOut(); location.href = "/"; }}
            className="w-full rounded-xl py-2 text-xs text-rose-500">ออกจากระบบ</button>
        </div>

        {msg && <p className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700">{msg}</p>}
      </div>
    </main>
  );
}
