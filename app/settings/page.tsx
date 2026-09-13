"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cachedMe, loadMe, signOut, type Me } from "@/lib/auth";
import { pullAll, syncNow, bootstrapSchedule } from "@/lib/sync";
import { getYear, roomName, schoolName, roomCode, DAY_NAMES, ALL_DAYS, getDuty } from "@/data/schedule";
import { loadAll } from "@/lib/storage";

export default function SettingsPage() {
  const [me, setMe] = useState<Me | null>(cachedMe());
  const [msg, setMsg] = useState("");
  const [count, setCount] = useState(0);

  useEffect(() => {
    loadMe().then(setMe);
    const r = () => { setMe(cachedMe()); setCount(Object.keys(loadAll()).length); };
    r();
    window.addEventListener("hwnote:update", r);
    return () => window.removeEventListener("hwnote:update", r);
  }, []);

  if (!me) return <div className="p-16 text-center text-sm text-slate-400">กำลังโหลด…</div>;

  const invite = async () => {
    const text = `📚 เข้ากลุ่มจดการบ้าน ${roomName()}\nรหัสห้อง: ${roomCode()}\n${location.origin}`;
    if (navigator.share) {
      try { await navigator.share({ title: "เข้าห้อง HomeworkNote", text }); return; } catch { /* ยกเลิก */ }
    }
    try { await navigator.clipboard.writeText(text); setMsg("คัดลอกคำเชิญแล้ว ✅"); }
    catch { setMsg("คัดลอกไม่สำเร็จ"); }
  };

  return (
    <main>
      <header className="rounded-b-3xl bg-gradient-to-br from-indigo-500 to-sky-400 px-5 pb-6 pt-8 text-white">
        <h1 className="text-xl font-bold">ตั้งค่า ⚙️</h1>
        <p className="text-xs opacity-85">
          {schoolName() && `${schoolName()} · `}{roomName()} · ปีการศึกษา {getYear()}
        </p>
      </header>

      <div className="space-y-4 px-5 py-5">
        {/* โปรไฟล์ — แสดงอย่างเดียว */}
        <div className="card flex items-center gap-3 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-xl">👤</div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-800">{me.nickname}</p>
            <p className="text-[11px] text-slate-400">@{me.username}{me.isAdmin && " · 🛠 ผู้ดูแล"}</p>
          </div>
        </div>

        {/* ห้อง + รหัสเชิญ */}
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-400 to-teal-400 px-4 py-3 text-white">
            <p className="text-[11px] opacity-90">รหัสห้องของคุณ</p>
            <p className="text-lg font-bold tracking-[0.2em]">{roomCode() || "—"}</p>
          </div>
          <div className="p-4">
            <p className="mb-2 text-[11px] leading-relaxed text-slate-500">
              ส่งรหัสนี้ให้เพื่อน → เพื่อนเลือกแท็บ “เข้าร่วมห้อง” ตอนสมัคร → เห็นการบ้านชุดเดียวกัน
            </p>
            <button onClick={invite} className="w-full rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white">
              📤 ชวนเพื่อนเข้าห้อง
            </button>
          </div>
        </div>

        {/* เวรจด */}
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
        </div>

        {me.isAdmin && (
          <Link href="/admin" className="card flex items-center gap-3 p-4 active:bg-slate-50">
            <span className="text-xl">🛠</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">จัดการห้องเรียน</p>
              <p className="text-[11px] text-slate-400">ชื่อโรงเรียน · ชื่อชั้น · ตาราง · เวร · ปีการศึกษา</p>
            </div>
            <span className="text-slate-300">›</span>
          </Link>
        )}

        <div className="card space-y-2 p-4">
          <button onClick={async () => {
            setMsg("กำลังซิงก์…");
            await bootstrapSchedule(); await pullAll(); await syncNow();
            setCount(Object.keys(loadAll()).length);
            setMsg("ซิงก์เรียบร้อย ✅");
          }} className="w-full rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-700">🔄 ซิงก์ข้อมูลใหม่</button>
          <button onClick={async () => { await signOut(); location.href = "/"; }}
            className="w-full rounded-xl py-2 text-xs text-rose-500">ออกจากระบบ</button>
        </div>

        <div className="card space-y-1.5 p-4 text-[11px] text-slate-500">
          <p className="mb-1 font-semibold text-slate-700">🔧 ตรวจสอบระบบ</p>
          <Row k="การบ้านในเครื่อง" v={`${count} รายการ`} />
          <Row k="ปีการศึกษา" v={String(getYear())} />
          <Row k="สิทธิ์" v={me.isAdmin ? "ผู้ดูแล" : "สมาชิก"} />
        </div>

        {msg && <p className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700">{msg}</p>}
      </div>
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><span>{k}</span><span className="font-medium text-slate-700">{v}</span></div>;
}
