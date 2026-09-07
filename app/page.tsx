"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SUBJECTS, DAY_NAMES } from "@/data/schedule";
import {
  loadAll, saveAll, toDateKey, toThaiShort, bucketize, dueLabel,
  type HomeworkEntry,
} from "@/lib/storage";

const TONE: Record<string, string> = {
  overdue: "bg-rose-50 text-rose-600 border-rose-200",
  today: "bg-orange-50 text-orange-600 border-orange-200",
  tomorrow: "bg-amber-50 text-amber-600 border-amber-200",
  week: "bg-sky-50 text-sky-600 border-sky-200",
  later: "bg-slate-50 text-slate-500 border-slate-200",
};

export default function Dashboard() {
  const [entries, setEntries] = useState<Record<string, HomeworkEntry>>({});
  const [today, setToday] = useState("");
  const [dayIdx, setDayIdx] = useState(0);

  useEffect(() => {
    const now = new Date();
    setToday(toDateKey(now));
    setDayIdx(now.getDay());

    const refresh = () => setEntries(loadAll());
    refresh();
    window.addEventListener("hwnote:update", refresh);
    return () => window.removeEventListener("hwnote:update", refresh);
  }, []);

  const b = useMemo(() => bucketize(entries, today || toDateKey(new Date())), [entries, today]);
  const pct = b.total ? Math.round((b.doneCount / b.total) * 100) : 0;

  const toggle = (e: HomeworkEntry) => {
    const updated = { ...e, done: !e.done, updatedAt: Date.now() };
    const next = { ...entries, [e.id]: updated };
    setEntries(next);
    saveAll(next, updated); // ← ส่ง changed เพื่อให้ซิงก์
  };

  return (
    <main>
      {/* ---------- Hero ---------- */}
      <header className="relative overflow-hidden rounded-b-[32px] bg-gradient-to-br from-indigo-500 via-indigo-400 to-sky-400 px-5 pb-8 pt-12 text-white">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 left-10 h-24 w-24 rounded-full bg-white/10" />

        <p className="text-sm opacity-90">สวัสดี 👋</p>
        <h1 className="text-2xl font-bold">ห้อง ม.2/2</h1>
        <p className="mt-0.5 text-xs opacity-80">
          {today ? `วัน${DAY_NAMES[dayIdx]} · ${toThaiShort(today)}` : "\u00A0"}
        </p>

        <div className="mt-6 flex items-center gap-4 rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
          <Ring pct={pct} />
          <div>
            <div className="text-lg font-bold">
              {b.doneCount}/{b.total} ชิ้น
            </div>
            <div className="text-xs opacity-85">
              {b.total === 0 ? "ยังไม่มีการบ้าน" : pct === 100 ? "เคลียร์หมดแล้ว เก่งมาก! 🎉" : "ทำต่ออีกนิดนะ สู้ ๆ 💪"}
            </div>
          </div>
        </div>
      </header>

      {/* ---------- Stat cards ---------- */}
      <section className="-mt-5 grid grid-cols-3 gap-2.5 px-5">
        <Stat n={b.overdue.length} label="เลยกำหนด" emoji="⚠️" tone="rose" />
        <Stat n={b.tomorrow.length} label="ใกล้ถึงกำหนด" emoji="⏰" tone="amber" />
        <Stat n={b.week.length} label="สัปดาห์นี้" emoji="📚" tone="sky" />
      </section>

      {/* ---------- Lists ---------- */}
      <section className="space-y-6 px-5 py-6">
        <Group title="ต้องรีบ!" emoji="⚠️" items={b.overdue} today={today} onToggle={toggle} />
        <Group title="ใกล้ถึงกำหนด" emoji="⏰" items={b.tomorrow} today={today} onToggle={toggle} />
        <Group title="สัปดาห์นี้" emoji="📅" items={b.week} today={today} onToggle={toggle} />

        {b.total === 0 && (
          <div className="card p-10 text-center">
            <div className="text-4xl">🌤️</div>
            <p className="mt-3 font-semibold text-slate-700">ยังไม่มีการบ้าน</p>
            <p className="mt-1 text-sm text-slate-400">แตะปุ่ม + เพื่อเริ่มจดวันนี้</p>
          </div>
        )}
      </section>

      {/* ---------- FAB (ไม่ล้นขอบจอเล็ก) ---------- */}
      <Link
        href="/homework"
        aria-label="จดการบ้าน"
        className="fixed bottom-24 right-[max(1.25rem,calc(50vw-13rem))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-400 text-2xl text-white shadow-lg shadow-indigo-300 active:scale-95"
      >
        +
      </Link>
    </main>
  );
}

/* ---------------- sub components ---------------- */

function Ring({ pct }: { pct: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg width="68" height="68" viewBox="0 0 68 68" className="-rotate-90 shrink-0">
      <circle cx="34" cy="34" r={r} strokeWidth="7" stroke="rgba(255,255,255,.3)" fill="none" />
      <circle
        cx="34" cy="34" r={r} strokeWidth="7" stroke="white" fill="none"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100}
        className="transition-all duration-700"
      />
      <text
        x="34" y="34" transform="rotate(90 34 34)" textAnchor="middle" dominantBaseline="central"
        className="fill-white text-[15px] font-bold"
      >
        {pct}%
      </text>
    </svg>
  );
}

function Stat({ n, label, emoji, tone }: { n: number; label: string; emoji: string; tone: string }) {
  const color: Record<string, string> = {
    rose: "text-rose-500",
    amber: "text-amber-500",
    sky: "text-sky-500",
  };
  return (
    <div className="card flex flex-col items-center gap-0.5 px-2 py-3.5">
      <span className="text-base">{emoji}</span>
      <span className={`text-2xl font-bold ${color[tone]}`}>{n}</span>
      <span className="text-center text-[10px] font-medium leading-tight text-slate-500">{label}</span>
    </div>
  );
}

function Group({
  title, emoji, items, today, onToggle,
}: {
  title: string;
  emoji: string;
  items: HomeworkEntry[];
  today: string;
  onToggle: (e: HomeworkEntry) => void;
}) {
  if (!items.length) return null;
  return (
    <div>
      <h2 className="mb-2.5 flex items-center gap-1.5 px-1 text-sm font-bold text-slate-700">
        <span>{emoji}</span>
        {title}
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-600">{items.length}</span>
      </h2>
      <div className="space-y-2">
        {items.map((e) => {
          const s = SUBJECTS[e.subjectId];
          const d = dueLabel(e.dueDate, today);
          return (
            <div key={e.id} className="card flex items-start gap-3 p-3.5">
              <span className="mt-1 h-9 w-1.5 shrink-0 rounded-full" style={{ background: s?.color ?? "#cbd5e1" }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-slate-800">{s?.name ?? e.subjectId}</span>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${TONE[d.tone]}`}>
                    {d.text}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">{e.homework}</p>
              </div>
              <button
                onClick={() => onToggle(e)}
                aria-label="ทำเสร็จแล้ว"
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                  e.done ? "border-emerald-400 bg-emerald-400 text-white" : "border-slate-300"
                }`}
              >
                {e.done && <span className="text-xs">✓</span>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
