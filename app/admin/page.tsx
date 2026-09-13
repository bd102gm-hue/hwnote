"use client";

import { useEffect, useState } from "react";
import { cachedMe, loadMe } from "@/lib/auth";
import { fetchSchedule, saveSchedule, listYears } from "@/lib/sync";
import { getConfig, DAY_NAMES, ALL_DAYS, PERIODS, type ScheduleConfig } from "@/data/schedule";

export default function AdminPage() {
  const [cfg, setCfg] = useState<ScheduleConfig>(getConfig());
  const [isAdmin, setIsAdmin] = useState(false);
  const [msg, setMsg] = useState("");

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
      <h1 className="text-xl font-bold mb-4">🛠 จัดการห้องเรียน</h1>
      
      {/* แก้ชื่อห้อง */}
      <div className="card p-4 mb-4">
        <label className="text-xs font-bold text-slate-500">ชื่อห้อง (เช่น ม.2/2)</label>
        <input value={cfg.roomName || ""} onChange={e => setCfg({...cfg, roomName: e.target.value})} className="w-full border p-2 rounded-lg mt-1" />
      </div>

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
