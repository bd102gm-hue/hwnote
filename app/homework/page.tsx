"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SUBJECTS, DAY_NAMES, getSubjectsForDay, type DaySlot } from "@/data/schedule";
import { loadAll, saveAll, toDateKey, toThaiDate, type HomeworkEntry } from "@/lib/storage";

export default function HomeworkPage() {
  return (
    <Suspense fallback={<Loading />}>
      <HomeworkInner />
    </Suspense>
  );
}

function Loading() {
  return <div className="p-16 text-center text-sm text-slate-400">กำลังโหลด…</div>;
}

function HomeworkInner() {
  const router = useRouter();
  const params = useSearchParams();

  const [dateKey, setDateKey] = useState(() => params.get("d") || toDateKey(new Date()));
  const [entries, setEntries] = useState<Record<string, HomeworkEntry>>({});
  const [openKey, setOpenKey] = useState<string | null>(params.get("s"));

  useEffect(() => {
    const refresh = () => setEntries(loadAll());
    refresh();
    window.addEventListener("hwnote:update", refresh);
    return () => window.removeEventListener("hwnote:update", refresh);
  }, []);

  const dayIndex = useMemo(() => {
    const [y, m, d] = dateKey.split("-").map(Number);
    return new Date(y, m - 1, d).getDay();
  }, [dateKey]);

  const slots = useMemo(() => getSubjectsForDay(dayIndex), [dayIndex]);

  const entryOf = (slot: DaySlot): HomeworkEntry => {
    const id = `${dateKey}__${slot.key}`;
    return (
      entries[id] ?? {
        id,
        date: dateKey,
        subjectId: slot.subjectId,
        classwork: "",
        homework: "",
        dueDate: "",
        done: false,
        updatedAt: 0,
      }
    );
  };

  const update = (slot: DaySlot, patch: Partial<HomeworkEntry>) => {
    const cur = entryOf(slot);
    const updated = { ...cur, ...patch, updatedAt: Date.now() };
    const next = { ...entries, [cur.id]: updated };
    setEntries(next);
    saveAll(next, updated);
  };

  const shiftDay = (n: number) => {
    const [y, m, d] = dateKey.split("-").map(Number);
    setDateKey(toDateKey(new Date(y, m - 1, d + n)));
    setOpenKey(null);
  };

  const filled = slots.filter((s) => {
    const e = entryOf(s);
    return e.classwork || e.homework;
  }).length;

  const copySummary = async () => {
    const lines = [`📚 การบ้านวัน${DAY_NAMES[dayIndex]} ${toThaiDate(dateKey)}`, "─────────────"];
    slots.forEach((s) => {
      const e = entryOf(s);
      if (!e.classwork && !e.homework) return;
      lines.push(`▪️ ${SUBJECTS[s.subjectId].name}`);
      if (e.classwork) lines.push(`   งานในห้อง: ${e.classwork}`);
      lines.push(`   การบ้าน: ${e.homework || "-"}`);
      if (e.dueDate) lines.push(`   ⏰ ส่ง ${toThaiDate(e.dueDate)}`);
    });
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      alert("คัดลอกแล้ว ✅ วางในกลุ่มไลน์ได้เลย");
    } catch {
      alert("คัดลอกไม่สำเร็จ ลองใช้ HTTPS นะครับ");
    }
  };

  return (
    <main>
      <header className="sticky top-0 z-30 rounded-b-3xl bg-gradient-to-br from-indigo-500 to-sky-400 px-5 pb-5 pt-10 text-white shadow-lg shadow-indigo-100">
        <h1 className="text-center text-sm font-medium opacity-90">จดการบ้าน · ม.2/2</h1>

        <div className="mt-3 flex items-center gap-2">
          <button onClick={() => shiftDay(-1)} className="h-11 w-11 rounded-2xl bg-white/20 text-lg active:scale-95">
            ‹
          </button>

          <label className="relative flex-1 cursor-pointer rounded-2xl bg-white/20 py-2 text-center">
            <div className="font-bold">วัน{DAY_NAMES[dayIndex]}</div>
            <div className="text-[11px] opacity-90">{toThaiDate(dateKey)} 📆</div>
            <input
              type="date"
              value={dateKey}
              onChange={(e) => {
                if (!e.target.value) return;
                setDateKey(e.target.value);
                setOpenKey(null);
              }}
              className="absolute inset-0 h-full w-full opacity-0"
            />
          </label>

          <button onClick={() => shiftDay(1)} className="h-11 w-11 rounded-2xl bg-white/20 text-lg active:scale-95">
            ›
          </button>
        </div>

        {slots.length > 0 && (
          <div className="mt-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{ width: `${(filled / slots.length) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-center text-[11px] opacity-85">
              บันทึกแล้ว {filled}/{slots.length} วิชา
            </p>
          </div>
        )}
      </header>

      <div className="space-y-2.5 px-5 py-5">
        {slots.length === 0 && (
          <div className="card p-12 text-center">
            <div className="text-4xl">🎉</div>
            <p className="mt-3 font-semibold text-slate-700">วันนี้ไม่มีคาบเรียน</p>
            <p className="text-sm text-slate-400">พักผ่อนให้เต็มที่นะ</p>
          </div>
        )}

        {slots.map((slot) => {
          const subj = SUBJECTS[slot.subjectId];
          const e = entryOf(slot);
          const open = openKey === slot.key;
          const hasData = Boolean(e.classwork || e.homework);

          return (
            <div key={slot.key} className={`card overflow-hidden transition-all ${open ? "ring-2 ring-indigo-200" : ""}`}>
              <button
                onClick={() => setOpenKey(open ? null : slot.key)}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                <span className="h-11 w-1.5 shrink-0 rounded-full" style={{ background: subj.color }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-slate-800">{subj.name}</span>
                    {hasData && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-slate-400">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5">คาบ {slot.periods.join(",")}</span>
                    <span>{slot.timeLabel}</span>
                    {subj.teacher && <span>· {subj.teacher}</span>}
                    {subj.room && <span>· {subj.room}</span>}
                  </div>
                  {!open && e.homework && e.homework !== "-" && (
                    <p className="mt-1.5 truncate text-xs text-slate-500">📝 {e.homework}</p>
                  )}
                </div>
                <span className={`shrink-0 text-slate-300 transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
              </button>

              {open && (
                <div className="space-y-3 border-t border-slate-100 bg-slate-50/70 p-4">
                  <Field label="งานในห้อง" emoji="📖">
                    <textarea
                      rows={2}
                      value={e.classwork}
                      onChange={(ev) => update(slot, { classwork: ev.target.value })}
                      placeholder="เช่น ทำแบบฝึกหัดหน้า 13-15"
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                  </Field>

                  <Field label="การบ้าน" emoji="📝">
                    <textarea
                      rows={2}
                      value={e.homework}
                      onChange={(ev) => update(slot, { homework: ev.target.value })}
                      placeholder="ใส่ - ถ้าไม่มี"
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                  </Field>

                  <div className="flex items-end gap-3">
                    <Field label="กำหนดส่ง" emoji="⏰" className="flex-1">
                      <input
                        type="date"
                        value={e.dueDate}
                        onChange={(ev) => update(slot, { dueDate: ev.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm outline-none focus:border-indigo-400"
                      />
                    </Field>
                    <button
                      onClick={() => update(slot, { done: !e.done })}
                      className={`mb-0.5 flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-medium transition ${
                        e.done ? "bg-emerald-400 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"
                      }`}
                    >
                      {e.done ? "✓ เสร็จแล้ว" : "ทำเสร็จ?"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {slots.length > 0 && (
        <div className="fixed inset-x-0 bottom-[68px] z-40 mx-auto flex max-w-md gap-2.5 border-t border-slate-100 bg-white/90 px-5 py-3 backdrop-blur-xl">
          <button
            onClick={copySummary}
            className="flex-1 rounded-2xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 active:scale-[.98]"
          >
            📋 คัดลอกสรุป
          </button>
          <button
            onClick={() => router.push(`/export?d=${dateKey}`)}
            className="flex-1 rounded-2xl bg-gradient-to-r from-indigo-500 to-sky-400 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 active:scale-[.98]"
          >
            🖼 สร้างการ์ด
          </button>
        </div>
      )}
    </main>
  );
}

function Field({
  label, emoji, children, className = "",
}: {
  label: string;
  emoji: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
        {emoji} {label}
      </label>
      {children}
    </div>
  );
}
