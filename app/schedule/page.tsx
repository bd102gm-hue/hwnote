"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SUBJECTS, DAY_NAMES, getWeekGrid } from "@/data/schedule";
import { toDateKey } from "@/lib/storage";

const DAY_BG = ["", "#fef3c7", "#fce7f3", "#dcfce7", "#ffedd5", "#dbeafe"];

export default function SchedulePage() {
  const router = useRouter();
  const grid = getWeekGrid();
  const [todayDow, setTodayDow] = useState(-1);

  useEffect(() => setTodayDow(new Date().getDay()), []);

  const goToDay = (day: number, slotKey: string) => {
    const now = new Date();
    const diff = day - now.getDay();
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
    router.push(`/homework?d=${toDateKey(target)}&s=${slotKey}`);
  };

  return (
    <main>
      <header className="rounded-b-3xl bg-gradient-to-br from-indigo-500 to-sky-400 px-5 pb-6 pt-11 text-white">
        <h1 className="text-xl font-bold">ตารางเรียน ม.2/2</h1>
        <p className="text-xs opacity-85">ภาคเรียนที่ 1/2569</p>
        <p className="mt-2 text-[11px] opacity-75">💡 แตะช่องวิชาเพื่อไปจดการบ้านทันที</p>
      </header>

      <div className="space-y-4 px-4 py-5">
        {grid.map(({ day, slots }) => (
          <section key={day} className="card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: DAY_BG[day] }}>
              <span className="text-sm font-bold text-slate-700">วัน{DAY_NAMES[day]}</span>
              {day === todayDow && (
                <span className="rounded-full bg-indigo-500 px-2 py-0.5 text-[10px] font-medium text-white">วันนี้</span>
              )}
              <span className="ml-auto text-[11px] text-slate-500">{slots.length} คาบ</span>
            </div>

            <div className="divide-y divide-slate-50">
              {slots.map((s) => {
                const subj = SUBJECTS[s.subjectId];
                return (
                  <button
                    key={s.key}
                    onClick={() => goToDay(day, s.key)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left active:bg-slate-50"
                  >
                    <span className="w-11 shrink-0 text-[10px] font-medium text-slate-400">
                      {s.timeLabel.split("–")[0]}
                    </span>
                    <span className="h-7 w-1 shrink-0 rounded-full" style={{ background: subj.color }} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-800">{subj.name}</div>
                      <div className="truncate text-[10px] text-slate-400">
                        {[subj.teacher, subj.room].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] text-slate-300">คาบ {s.periods.join(",")}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
