"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SUBJECTS, DAY_NAMES, getSubjectsForDay, getDuty, roomName, schoolName } from "@/data/schedule";

import { loadAll, bucketize, toDateKey, toThaiDate, toThaiShort, dueLabel, type Buckets, type HomeworkEntry } from "@/lib/storage";
import { cachedMe } from "@/lib/auth";
import { askPermission, notifyState } from "@/lib/notify";

export default function HomePage() {
  const [today, setToday] = useState("");
  const [b, setB] = useState<Buckets | null>(null);
  const [perm, setPerm] = useState("default");
  const [, tick] = useState(0);

  useEffect(() => {
    const t = toDateKey(new Date());
    setToday(t);
    setPerm(notifyState());
    const refresh = () => { setB(bucketize(loadAll(), t)); tick((n) => n + 1); };
    refresh();
    window.addEventListener("hwnote:update", refresh);
    return () => window.removeEventListener("hwnote:update", refresh);
  }, []);

  if (!today || !b) return <div className="p-16 text-center text-sm text-slate-400">กำลังโหลด…</div>;

  const dow = new Date().getDay();
  const slots = getSubjectsForDay(dow);
  const me = cachedMe();
  const duty = getDuty(dow);
  const urgent = b.overdue.length + b.urgent.length;

  return (
    <main>
      <header className="rounded-b-3xl bg-gradient-to-br from-indigo-500 to-sky-400 px-5 pb-6 pt-8 text-white">
                <p className="text-xs opacity-85">{schoolName() && `${schoolName()} · `}{roomName()}</p>

        <h1 className="text-xl font-bold">สวัสดี {me?.nickname ?? ""} 👋</h1>
        <p className="mt-1 text-xs opacity-85">
          วัน{DAY_NAMES[dow]} · {toThaiDate(today)}{duty && ` · เวรจด: ${duty}`}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat n={b.overdue.length} label="เลยกำหนด" />
          <Stat n={b.urgent.length} label="วันนี้/พรุ่งนี้" />
          <Stat n={b.week.length} label="สัปดาห์นี้" />
        </div>
      </header>

      <div className="space-y-4 px-5 py-5">
        {perm === "default" && (
          <button onClick={async () => setPerm(String(await askPermission()))}
            className="card flex w-full items-center gap-3 p-4 text-left active:bg-slate-50">
            <span className="text-xl">🔔</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">เปิดแจ้งเตือนงานใกล้ส่ง</p>
              <p className="text-[11px] text-slate-400">เตือนอัตโนมัติเมื่อใกล้ถึงกำหนด</p>
            </div>
            <span className="rounded-full bg-indigo-500 px-3 py-1 text-[11px] font-semibold text-white">เปิด</span>
          </button>
        )}

        {urgent > 0 && (
          <div className="rounded-2xl bg-gradient-to-r from-rose-500 to-orange-400 p-4 text-white shadow-lg shadow-rose-100">
            <p className="text-sm font-bold">⏰ มีงานต้องส่ง {urgent} ชิ้น</p>
            <p className="mt-0.5 text-[11px] opacity-90">
              {b.overdue.length > 0 ? `เลยกำหนด ${b.overdue.length} ชิ้น · ` : ""}รีบเคลียร์นะ
            </p>
          </div>
        )}

        <Section title="🔥 เลยกำหนดส่ง" items={b.overdue} today={today} tone="rose" />
        <Section title="⏰ ส่งวันนี้ / พรุ่งนี้" items={b.urgent} today={today} tone="amber" />
        <Section title="📅 ภายในสัปดาห์นี้" items={b.week} today={today} tone="sky" />
        <Section title="📝 ยังไม่ระบุกำหนดส่ง" items={b.noDue} today={today} tone="slate" />

        {b.total === 0 && (
          <div className="card p-10 text-center">
            <div className="text-4xl">📭</div>
            <p className="mt-3 font-semibold text-slate-700">ยังไม่มีการบ้านในระบบ</p>
            <Link href="/homework" className="mt-2 inline-block text-xs text-indigo-500 underline">ไปหน้าจดการบ้าน ›</Link>
          </div>
        )}

        {b.total > 0 && urgent === 0 && b.week.length === 0 && b.noDue.length === 0 && (
          <div className="card p-10 text-center">
            <div className="text-4xl">✨</div>
            <p className="mt-3 font-semibold text-slate-700">เคลียร์งานหมดแล้ว!</p>
            <p className="mt-1 text-xs text-slate-400">ทำเสร็จ {b.doneCount}/{b.total} ชิ้น</p>
          </div>
        )}

        {slots.length > 0 && (
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm font-bold text-slate-700">📚 คาบเรียนวันนี้</span>
              <Link href="/homework" className="text-[11px] text-indigo-500">จดการบ้าน ›</Link>
            </div>
            <div className="divide-y divide-slate-50">
              {slots.filter((s) => !s.periods.includes(0)).map((s) => {
                const subj = SUBJECTS[s.subjectId];
                if (!subj) return null;
                return (
                  <div key={s.key} className="flex items-center gap-3 px-4 py-2">
                    <span className="w-11 text-[10px] text-slate-400">{s.timeLabel.split("–")[0]}</span>
                    <span className="h-6 w-1 rounded-full" style={{ background: subj.color }} />
                    <span className="flex-1 truncate text-sm text-slate-700">{subj.name}</span>
                    <span className="text-[10px] text-slate-300">{subj.room}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-2xl bg-white/20 py-2">
      <div className="text-lg font-bold">{n}</div>
      <div className="text-[10px] opacity-85">{label}</div>
    </div>
  );
}

const TONE = {
  rose: "border-rose-200 bg-rose-50 text-rose-600",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  sky: "border-sky-200 bg-sky-50 text-sky-700",
  slate: "border-slate-200 bg-slate-50 text-slate-600",
};

function Section({ title, items, today, tone }: {
  title: string; items: HomeworkEntry[]; today: string; tone: keyof typeof TONE;
}) {
  if (!items.length) return null;
  return (
    <section>
      <h2 className="mb-2 text-xs font-bold text-slate-600">{title} ({items.length})</h2>
      <div className="space-y-2">
        {items.map((e) => {
          const subj = SUBJECTS[e.subjectId];
          const lb = e.dueDate ? dueLabel(e.dueDate, today) : null;
          return (
            <Link key={e.id} href={`/homework?d=${e.date}`} className="card block p-3.5 active:bg-slate-50">
              <div className="flex items-start gap-2.5">
                <span className="mt-1 h-8 w-1 shrink-0 rounded-full" style={{ background: subj?.color ?? "#cbd5e1" }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-slate-800">{subj?.name ?? "วิชา"}</span>
                    {lb && <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${TONE[tone]}`}>{lb.text}</span>}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">📝 {e.homework}</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    จดวัน {toThaiShort(e.date)}{e.updatedBy && ` · 👤 ${e.updatedBy}`}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
