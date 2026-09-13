"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cachedMe, loadMe } from "@/lib/auth";
import { fetchSchedule, saveSchedule, listYears } from "@/lib/sync";
import {
  getConfig, defaultConfig, DAY_NAMES, ALL_DAYS, PERIODS, LUNCH_PERIOD,
  currentAcademicYear, type ScheduleConfig, type Subject,
} from "@/data/schedule";

const PERIOD_LIST = [0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11];

export default function AdminPage() {
  const [ok, setOk] = useState<boolean | null>(null);
  const [cfg, setCfg] = useState<ScheduleConfig>(getConfig());
  const [years, setYears] = useState<number[]>([]);
  const [day, setDay] = useState(1);
  const [tab, setTab] = useState<"tt" | "subj" | "duty" | "room">("tt");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [imp, setImp] = useState("");

  useEffect(() => {
    loadMe().then((m) => setOk(!!m?.isAdmin));
    listYears().then(setYears);
    const r = () => setCfg(getConfig());
    window.addEventListener("hwnote:update", r);
    return () => window.removeEventListener("hwnote:update", r);
  }, []);

  if (ok === null) return <div className="p-16 text-center text-sm text-slate-400">กำลังโหลด…</div>;
  if (!ok) return (
    <div className="p-16 text-center">
      <p className="text-sm text-slate-500">หน้านี้สำหรับผู้ดูแลเท่านั้น</p>
      <Link href="/settings" className="mt-3 inline-block text-xs text-indigo-500 underline">ไปปลดล็อกสิทธิ์ที่หน้าตั้งค่า ›</Link>
    </div>
  );

  const setSlot = (p: number, id: string) => {
    const tt = { ...cfg.timetable };
    const d = { ...(tt[String(day)] ?? {}) };
    if (id) d[String(p)] = id; else delete d[String(p)];
    tt[String(day)] = d;
    setCfg({ ...cfg, timetable: tt });
  };

  const setSubj = (id: string, patch: Partial<Subject>) =>
    setCfg({ ...cfg, subjects: { ...cfg.subjects, [id]: { ...cfg.subjects[id], ...patch } } });

  const addSubj = () => {
    const id = `s${Date.now().toString(36)}`;
    setCfg({ ...cfg, subjects: { ...cfg.subjects, [id]: { name: "วิชาใหม่", short: "ใหม่", color: "#6366f1" } } });
  };

  const delSubj = (id: string) => {
    const s = { ...cfg.subjects }; delete s[id];
    const tt: ScheduleConfig["timetable"] = {};
    Object.entries(cfg.timetable).forEach(([d, ps]) => {
      tt[d] = Object.fromEntries(Object.entries(ps).filter(([, v]) => v !== id));
    });
    setCfg({ ...cfg, subjects: s, timetable: tt });
  };

  const save = async () => {
    setBusy(true); setMsg("");
    try { await saveSchedule(cfg); setMsg("บันทึกแล้ว ✅ ทุกคนเห็นทันที"); }
    catch (e) { setMsg("❌ " + (e instanceof Error ? e.message : "ผิดพลาด")); }
    finally { setBusy(false); }
  };

  const newYear = async () => {
    const y = Number(prompt("ปีการศึกษาใหม่ (พ.ศ.)", String(currentAcademicYear() + 1)));
    if (!y || y < 2500 || y > 2700) return;
    const copy = confirm("คัดลอกตารางปีนี้ไปใช้ต่อไหม?\nOK = คัดลอก · Cancel = เริ่มใหม่");
    const next: ScheduleConfig = copy
      ? { ...getConfig(), year: y, roomName: `GM02-${y}` }
      : defaultConfig(y);
    setBusy(true);
    try { await saveSchedule(next); setCfg(next); setYears(await listYears()); setMsg(`สร้างปี ${y} แล้ว ✅`); }
    catch (e) { setMsg("❌ " + (e instanceof Error ? e.message : "ผิดพลาด")); }
    finally { setBusy(false); }
  };

  const exportCfg = async () => {
    const txt = JSON.stringify({ ...cfg, _v: 1 });
    try { await navigator.clipboard.writeText(txt); setMsg("คัดลอกตารางแล้ว ส่งให้ห้องอื่นได้เลย ✅"); }
    catch { setMsg("คัดลอกไม่สำเร็จ"); }
  };

  const importCfg = () => {
    try {
      const parsed = JSON.parse(imp) as ScheduleConfig;
      if (!parsed.subjects || !parsed.timetable) throw new Error("รูปแบบไม่ถูกต้อง");
      setCfg({ ...parsed, year: cfg.year });
      setImp(""); setMsg("นำเข้าแล้ว — กดบันทึกเพื่อยืนยัน ✅");
    } catch { setMsg("❌ ข้อความไม่ถูกต้อง"); }
  };

  return (
    <main className="pb-32">
      <header className="rounded-b-3xl bg-gradient-to-br from-slate-700 to-slate-500 px-5 pb-5 pt-8 text-white">
        <Link href="/settings" className="text-xs opacity-75">‹ กลับ</Link>
        <h1 className="mt-1 text-xl font-bold">จัดการตารางเรียน 🛠</h1>
        <div className="mt-3 flex items-center gap-2">
          <select value={cfg.year} onChange={(e) => void fetchSchedule(Number(e.target.value))}
            className="min-w-0 flex-1 rounded-xl bg-white/20 px-3 py-2 text-sm">
            {[...new Set([cfg.year, ...years])].sort((a, b) => b - a).map((y) => (
              <option key={y} value={y} className="text-slate-800">ปีการศึกษา {y}</option>
            ))}
          </select>
          <button onClick={newYear} className="shrink-0 rounded-xl bg-white/25 px-3 py-2 text-xs font-semibold">+ ปีใหม่</button>
        </div>
      </header>

      <div className="flex gap-1.5 px-5 py-4">
        {([["tt","ตาราง"],["subj","รายวิชา"],["duty","เวรจด"],["room","ห้อง/ปี"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex-1 rounded-xl py-2 text-xs font-semibold ${tab===k?"bg-slate-800 text-white":"bg-white text-slate-600 ring-1 ring-slate-200"}`}>{l}</button>
        ))}
      </div>

      {tab === "tt" && (
        <div className="px-5">
          <div className="no-scrollbar mb-3 flex gap-1.5 overflow-x-auto">
            {ALL_DAYS.map((d) => (
              <button key={d} onClick={() => setDay(d)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium ${day===d?"bg-indigo-500 text-white":"bg-white text-slate-600 ring-1 ring-slate-200"}`}>
                {DAY_NAMES[d]}
              </button>
            ))}
          </div>
          <div className="card divide-y divide-slate-50">
            {PERIOD_LIST.map((p) => (
              <div key={p} className="flex items-center gap-2 p-2.5">
                <div className="w-[70px] shrink-0">
                  <div className="text-[11px] font-bold text-slate-600">คาบ {p === 0 ? "HR" : p}</div>
                  <div className="text-[9px] text-slate-400">{PERIODS[p].start}</div>
                </div>
                <select value={cfg.timetable[String(day)]?.[String(p)] ?? ""} onChange={(e) => setSlot(p, e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 p-2 text-xs">
                  <option value="">— ว่าง —</option>
                  {Object.entries(cfg.subjects).map(([id, s]) => (
                    <option key={id} value={id}>{s.name}{s.room ? ` (${s.room})` : ""}</option>
                  ))}
                </select>
              </div>
            ))}
            <p className="p-2.5 text-center text-[10px] text-amber-600">🍚 คาบ {LUNCH_PERIOD} พักกลางวัน (ไม่ต้องกรอก)</p>
          </div>
        </div>
      )}

      {tab === "subj" && (
        <div className="space-y-2.5 px-5">
          {Object.entries(cfg.subjects).map(([id, s]) => (
            <div key={id} className="card space-y-2 p-3">
              <div className="flex items-center gap-2">
                <input type="color" value={s.color} onChange={(e) => setSubj(id, { color: e.target.value })} className="h-8 w-8 shrink-0 rounded" />
                <input value={s.name} onChange={(e) => setSubj(id, { name: e.target.value, short: e.target.value.slice(0, 8) })}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 p-2 text-xs font-semibold" />
                <button onClick={() => delSubj(id)} className="shrink-0 px-1 text-rose-400">🗑</button>
              </div>
              <div className="flex gap-2">
                <input value={s.teacher ?? ""} placeholder="ครู" onChange={(e) => setSubj(id, { teacher: e.target.value })}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 p-2 text-[11px]" />
                <input value={s.room ?? ""} placeholder="ห้อง" onChange={(e) => setSubj(id, { room: e.target.value })}
                  className="w-24 shrink-0 rounded-lg border border-slate-200 p-2 text-[11px]" />
              </div>
            </div>
          ))}
          <button onClick={addSubj} className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-indigo-600 ring-1 ring-slate-200">+ เพิ่มวิชา</button>
        </div>
      )}

      {tab === "duty" && (
        <div className="card mx-5 space-y-2.5 p-4">
          <p className="text-[11px] text-slate-400">ชื่อคนที่รับผิดชอบจดการบ้านประจำแต่ละวัน</p>
          {ALL_DAYS.map((d) => (
            <div key={d} className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-xs font-semibold text-slate-600">{DAY_NAMES[d]}</span>
              <input value={cfg.duty?.[String(d)] ?? ""} placeholder="ชื่อคนจด"
                onChange={(e) => setCfg({ ...cfg, duty: { ...cfg.duty, [String(d)]: e.target.value } })}
                className="min-w-0 flex-1 rounded-lg border border-slate-200 p-2 text-xs" />
            </div>
          ))}
        </div>
      )}

      {tab === "room" && (
        <div className="space-y-3 px-5">
          <div className="card p-4">
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">🏫 ชื่อห้อง</label>
            <input value={cfg.roomName ?? ""} placeholder={`GM02-${cfg.year}`}
              onChange={(e) => setCfg({ ...cfg, roomName: e.target.value })}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400" />
            <p className="mt-1.5 text-[11px] text-slate-400">แสดงบนหน้าแรกและบนการ์ดสรุป</p>
          </div>

          <div className="card p-4">
            <p className="mb-1 text-sm font-semibold text-slate-800">📤 ส่งตารางให้ห้องอื่น</p>
            <p className="mb-2 text-[11px] text-slate-400">คัดลอกแล้วส่งข้อความให้เพื่อนห้องอื่นนำไปวาง</p>
            <button onClick={exportCfg} className="w-full rounded-xl bg-slate-800 py-2.5 text-sm font-semibold text-white">คัดลอกตารางทั้งชุด</button>
          </div>

          <div className="card p-4">
            <p className="mb-1 text-sm font-semibold text-slate-800">📥 นำเข้าตารางจากห้องอื่น</p>
            <textarea rows={3} value={imp} onChange={(e) => setImp(e.target.value)} placeholder="วางข้อความที่ได้รับมาที่นี่"
              className="mt-1 w-full resize-none rounded-xl border border-slate-200 p-2.5 text-[11px] outline-none focus:border-indigo-400" />
            <button onClick={importCfg} disabled={!imp.trim()}
              className="mt-2 w-full rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white disabled:opacity-40">นำเข้า</button>
          </div>
        </div>
      )}

      {msg && <p className="px-5 pt-4 text-center text-xs text-slate-600">{msg}</p>}

      <div className="fixed inset-x-0 bottom-[68px] z-40 mx-auto max-w-md border-t border-slate-100 bg-white/95 px-5 py-3">
        <button onClick={save} disabled={busy}
          className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-sky-400 py-3 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "กำลังบันทึก…" : "💾 บันทึก (ทุกคนเห็นทันที)"}
        </button>
      </div>
    </main>
  );
}
