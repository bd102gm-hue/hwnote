"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toPng } from "html-to-image";
import { SUBJECTS, DAY_NAMES, getSubjectsForDay } from "@/data/schedule";
import { loadAll, toDateKey, toThaiDate, type HomeworkEntry } from "@/lib/storage";

/* ใช้ hex ล้วนในการ์ด — กัน canvas render สีเพี้ยน */
const THEMES = {
  pink: { name: "ชมพูหวาน", bg: "linear-gradient(135deg,#fce7f3 0%,#fff1f2 45%,#e0f2fe 100%)", head: "#f9a8b4", row: "#fde8ec", accent: "#e11d48", emoji: "🐰" },
  blue: { name: "ฟ้าใส", bg: "linear-gradient(135deg,#e0f2fe 0%,#eff6ff 45%,#e0e7ff 100%)", head: "#93c5fd", row: "#e0f2fe", accent: "#2563eb", emoji: "🐳" },
  mint: { name: "มินต์", bg: "linear-gradient(135deg,#d1fae5 0%,#f0fdfa 45%,#cffafe 100%)", head: "#6ee7b7", row: "#d1fae5", accent: "#059669", emoji: "🌿" },
  purple: { name: "ม่วงมุ้งมิ้ง", bg: "linear-gradient(135deg,#ede9fe 0%,#fdf4ff 45%,#fce7f3 100%)", head: "#c4b5fd", row: "#ede9fe", accent: "#7c3aed", emoji: "🍇" },
} as const;

type ThemeKey = keyof typeof THEMES;

export default function ExportPage() {
  return (
    <Suspense fallback={<div className="p-16 text-center text-sm text-slate-400">กำลังโหลด…</div>}>
      <ExportInner />
    </Suspense>
  );
}

function ExportInner() {
  const params = useSearchParams();
  const cardRef = useRef<HTMLDivElement>(null);

  const [dateKey, setDateKey] = useState(() => params.get("d") || toDateKey(new Date()));
  const [theme, setTheme] = useState<ThemeKey>("pink");
  const [entries, setEntries] = useState<Record<string, HomeworkEntry>>({});
  const [busy, setBusy] = useState(false);

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

  const rows = useMemo(() => {
    return getSubjectsForDay(dayIndex).map((s) => {
      const e = entries[`${dateKey}__${s.key}`];
      return {
        subject: SUBJECTS[s.subjectId].name,
        classwork: e?.classwork || "-",
        homework: e?.homework || "-",
        due: e?.dueDate ? toThaiDate(e.dueDate) : "",
        has: Boolean(e?.classwork || e?.homework),
      };
    });
  }, [dayIndex, dateKey, entries]);

  const t = THEMES[theme];

  const download = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      // render 2 รอบ กันฟอนต์ยังโหลดไม่เสร็จรอบแรก
      await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const url = await toPng(cardRef.current, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });
      const a = document.createElement("a");
      a.download = `การบ้าน-${dateKey}.png`;
      a.href = url;
      a.click();
    } catch (e) {
      console.error(e);
      alert("สร้างรูปไม่สำเร็จ ลองใหม่อีกครั้งนะครับ");
    } finally {
      setBusy(false);
    }
  };

  const copyText = async () => {
    const txt = rows
      .filter((r) => r.has)
      .map((r) => `▪️ ${r.subject}\n   งานในห้อง: ${r.classwork}\n   การบ้าน: ${r.homework}${r.due ? `\n   ⏰ ส่ง ${r.due}` : ""}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(
        `📚 การบ้านวัน${DAY_NAMES[dayIndex]} ${toThaiDate(dateKey)}\n─────────────\n${txt}`
      );
      alert("คัดลอกแล้ว ✅");
    } catch {
      alert("คัดลอกไม่สำเร็จ ลองใช้ HTTPS นะครับ");
    }
  };

  return (
    <main className="pb-36">
      <header className="rounded-b-3xl bg-gradient-to-br from-indigo-500 to-sky-400 px-5 pb-5 pt-11 text-white">
        <h1 className="text-xl font-bold">สร้างการ์ดสรุป 🖼</h1>
        <p className="text-xs opacity-85">บันทึกเป็นรูป ส่งเข้ากลุ่มห้องได้เลย</p>

        <label className="mt-4 flex items-center justify-between rounded-2xl bg-white/20 px-4 py-2.5">
          <span className="text-sm font-medium">
            วัน{DAY_NAMES[dayIndex]} · {toThaiDate(dateKey)}
          </span>
          <input
            type="date"
            value={dateKey}
            onChange={(e) => e.target.value && setDateKey(e.target.value)}
            className="bg-transparent text-xs text-white [color-scheme:dark]"
          />
        </label>
      </header>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 py-4">
        {(Object.keys(THEMES) as ThemeKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setTheme(k)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition ${
              theme === k ? "bg-slate-800 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            <span className="h-3 w-3 rounded-full" style={{ background: THEMES[k].head }} />
            {THEMES[k].name}
          </button>
        ))}
      </div>

      {/* ================= การ์ด ================= */}
      <div className="px-4">
        <div ref={cardRef} className="relative overflow-hidden rounded-3xl p-5" style={{ background: t.bg }}>
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full" style={{ background: "rgba(255,255,255,.45)" }} />
          <div className="pointer-events-none absolute -bottom-8 -left-6 h-28 w-28 rounded-full" style={{ background: "rgba(255,255,255,.35)" }} />

          <div className="relative mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-3xl leading-none">{t.emoji}</div>
              <h2 className="mt-1.5 text-xl font-extrabold tracking-tight" style={{ color: t.accent }}>
                การบ้านวัน{DAY_NAMES[dayIndex]}
              </h2>
              <p className="text-[11px] font-medium" style={{ color: "#64748b" }}>
                ม.2/2 · HomeworkNote
              </p>
            </div>
            <div
              className="shrink-0 rounded-2xl border-2 border-dashed px-3 py-2 text-center"
              style={{ borderColor: "#ffffff", background: "rgba(255,255,255,.7)" }}
            >
              <div className="text-[9px]" style={{ color: "#94a3b8" }}>วันที่</div>
              <div className="text-sm font-bold" style={{ color: t.accent }}>{toThaiDate(dateKey)}</div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl" style={{ background: "rgba(255,255,255,.88)" }}>
            <div className="grid grid-cols-[74px_1fr_1fr_58px] text-[10px] font-bold" style={{ background: t.head, color: "#334155" }}>
              <div className="px-2 py-2.5">รายวิชา</div>
              <div className="px-2 py-2.5">งานในห้อง</div>
              <div className="px-2 py-2.5">การบ้าน</div>
              <div className="px-1.5 py-2.5 text-center">ส่ง</div>
            </div>

            {rows.map((r, i) => (
              <div
                key={i}
                className="grid grid-cols-[74px_1fr_1fr_58px] text-[10px] leading-snug"
                style={{ background: i % 2 ? "transparent" : t.row, borderTop: "1px solid #ffffff" }}
              >
                <div className="px-2 py-2 font-semibold" style={{ color: "#334155" }}>{r.subject}</div>
                <div className="px-2 py-2" style={{ color: "#475569" }}>{r.classwork}</div>
                <div className="px-2 py-2" style={{ color: "#475569" }}>{r.homework}</div>
                <div className="px-1.5 py-2 text-center text-[9px] font-medium" style={{ color: r.due ? t.accent : "#cbd5e1" }}>
                  {r.due || "—"}
                </div>
              </div>
            ))}

            {rows.length === 0 && (
              <div className="px-3 py-8 text-center text-[11px]" style={{ color: "#94a3b8" }}>
                วันนี้ไม่มีคาบเรียน 🎉
              </div>
            )}
          </div>

          <div className="relative mt-3 flex items-center justify-between px-1">
            <span className="text-[9px]" style={{ color: "#94a3b8" }}>สร้างด้วย HomeworkNote</span>
            <span className="text-lg">{t.emoji}</span>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[68px] z-40 mx-auto flex max-w-md gap-2.5 border-t border-slate-100 bg-white/90 px-5 py-3 backdrop-blur-xl">
        <button
          onClick={download}
          disabled={busy}
          className="flex-1 rounded-2xl bg-gradient-to-r from-indigo-500 to-sky-400 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 active:scale-[.98] disabled:opacity-60"
        >
          {busy ? "กำลังสร้าง…" : "⬇️ ดาวน์โหลดรูป"}
        </button>
        <button
          onClick={copyText}
          className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 active:scale-[.98]"
        >
          📋
        </button>
      </div>
    </main>
  );
}
