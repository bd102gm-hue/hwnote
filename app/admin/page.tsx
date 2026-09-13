"use client";

import { useEffect, useState } from "react";
import { cachedMe, loadMe, updateRoom } from "@/lib/auth";
import { fetchSchedule, saveSchedule, listYears } from "@/lib/sync";
import { getConfig, DAY_NAMES, ALL_DAYS, PERIODS, type ScheduleConfig } from "@/data/schedule";

export default function AdminPage() {
  const [cfg, setCfg] = useState<ScheduleConfig>(getConfig());
  const [isAdmin, setIsAdmin] = useState(false);
  const [msg, setMsg] = useState("");
    const [school, setSchool] = useState("");
  const [cls, setCls] = useState("");

  useEffect(() => {
    const m = cachedMe();
    if (m) { setSchool(m.school); setCls(m.className); }
  }, [ok]);

  useEffect(() => {
    loadMe().then(m => setIsAdmin(!!m?.isAdmin));
    const r = () => setCfg(getConfig());
    window.addEventListener("hwnote:update", r);
    return () => window.removeEventListener("hwnote:update", r);
  }, []);

  if (!isAdmin) return <div className="p-10 text-center">เฉพาะ Admin เท่านั้น</div>;

  const save = async () => {
    try {
      await saveSchedule(cfg);
      setMsg("บันทึกตารางเรียบร้อย ✅");
    } catch (e: any) { setMsg("Error: " + e.message); }
  };

  return (
    <main className="p-5 pb-24">
              <h1 className="mt-1 text-xl font-bold">จัดการห้องเรียน 🛠</h1>

      
           {tab === "room" && (
        <div className="space-y-3 px-5">
          <div className="card space-y-3 p-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">🏫 ชื่อโรงเรียน</label>
              <input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="เช่น โรงเรียนสวนกุหลาบ"
                className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">🎓 ชื่อชั้น / ห้อง</label>
              <input value={cls} onChange={(e) => setCls(e.target.value)} placeholder="เช่น ม.2/2"
                className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400" />
            </div>
            <button onClick={async () => {
              setBusy(true); setMsg("");
              try { await updateRoom(school, cls); setMsg("บันทึกชื่อห้องแล้ว ✅"); }
              catch (e) { setMsg("❌ " + (e instanceof Error ? e.message : "ผิดพลาด")); }
              finally { setBusy(false); }
            }} disabled={busy || !cls.trim()}
              className="w-full rounded-xl bg-slate-800 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
              บันทึกชื่อห้อง
            </button>
            <p className="text-[11px] text-slate-400">แสดงบนหน้าแรก หน้าตั้งค่า และบนการ์ดสรุป</p>
          </div>

          <div className="card p-4">
            <p className="mb-1 text-sm font-semibold text-slate-800">📤 ส่งตารางให้ห้องอื่น</p>
            <p className="mb-2 text-[11px] text-slate-400">คัดลอกแล้วส่งให้เพื่อนต่างห้อง/ต่างโรงเรียนนำไปวาง</p>
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

      {/* ตั้งเวร */}
      <div className="card p-4 mb-4">
        <h2 className="text-sm font-bold mb-2">เวรจดการบ้าน</h2>
        {ALL_DAYS.map(d => (
          <div key={d} className="flex items-center gap-2 mb-2">
            <span className="w-16 text-xs">{DAY_NAMES[d]}</span>
            <input value={cfg.duty?.[d] || ""} onChange={e => setCfg({...cfg, duty: {...cfg.duty, [d]: e.target.value}})} className="flex-1 border p-2 rounded-lg text-xs" />
          </div>
        ))}
      </div>

      <button onClick={save} className="w-full bg-indigo-500 text-white p-3 rounded-xl font-bold">บันทึกการตั้งค่า</button>
      {msg && <p className="text-center text-xs mt-2 text-green-600">{msg}</p>}
    </main>
  );
}
