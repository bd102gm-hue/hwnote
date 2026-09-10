"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toBlob } from "html-to-image";
import { SUBJECTS, DAY_NAMES, getSubjectsForDay, ALL_DAYS } from "@/data/schedule";
import { loadAll, toDateKey, fromDateKey, toThaiDate, toThaiShort, type HomeworkEntry } from "@/lib/storage";
import { getProfile } from "@/lib/sync";

/* ---------- สีประจำวัน ---------- */
type DayTheme = { bg: string; head: string; row: string; accent: string; soft: string; emoji: string; label: string };

const DAY_THEME: Record<number, DayTheme> = {
  1: { bg: "linear-gradient(135deg,#fef9c3 0%,#fffbeb 50%,#fef3c7 100%)", head: "#fde047", row: "#fef9c3", accent: "#a16207", soft: "#fef3c7", emoji: "☀️", label: "เหลือง" },
  2: { bg: "linear-gradient(135deg,#fce7f3 0%,#fdf2f8 50%,#fbcfe8 100%)", head: "#f9a8d4", row: "#fce7f3", accent: "#be185d", soft: "#fbcfe8", emoji: "🌸", label: "ชมพู" },
  3: { bg: "linear-gradient(135deg,#dcfce7 0%,#f0fdf4 50%,#bbf7d0 100%)", head: "#86efac", row: "#dcfce7", accent: "#15803d", soft: "#bbf7d0", emoji: "🍀", label: "เขียว" },
  4: { bg: "linear-gradient(135deg,#ffedd5 0%,#fff7ed 50%,#fed7aa 100%)", head: "#fdba74", row: "#ffedd5", accent: "#c2410c", soft: "#fed7aa", emoji: "🍊", label: "ส้ม" },
  5: { bg: "linear-gradient(135deg,#dbeafe 0%,#eff6ff 50%,#bfdbfe 100%)", head: "#93c5fd", row: "#dbeafe", accent: "#1d4ed8", soft: "#bfdbfe", emoji: "💧", label: "ฟ้า" },
};

const dowOf = (key: string) => fromDateKey(key).getDay();

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
  const [entries, setEntries] = useState<Record<string, HomeworkEntry>>({});
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [hint, setHint] = useState("");

  useEffect(() => {
    setNickname(getProfile().nickname);
    const refresh = () => setEntries(loadAll());
    refresh();
    window.addEventListener("hwnote:update", refresh);
    return () => window.removeEventListener("hwnote:update", refresh);
  }, []);

  /* ---------- 7 วันเรียนย้อนหลัง (ข้ามเสาร์-อาทิตย์) ---------- */
  const last7 = useMemo(() => {
    let d = new Date();
    const list: string[] = [];
    while (list.length < 7) {
      if (d.getDay() >= 1 && d.getDay() <= 5) list.push(toDateKey(d));
      d.setDate(d.getDate() - 1);
    }
    return list;
  }, []);

  const rowsOf = (key: string) => {
    const dow = dowOf(key);
    return getSubjectsForDay(dow).map((s) => {
      const e = entries[`${key}__${s.key}`];
      return {
        subject: SUBJECTS[s.subjectId].name,
        classwork: e?.classwork?.trim() || "-",
        homework: e?.homework?.trim() || "-",
        due: e?.dueDate ? toThaiDate(e.dueDate) : "",
        has: Boolean(e?.classwork?.trim() || e?.homework?.trim()),
      };
    });
  };

  const dayIndex = dowOf(dateKey);
  const rows = useMemo(() => rowsOf(dateKey), [dateKey, entries]);
  const t = DAY_THEME[dayIndex] || DAY_THEME[1]; // fallback ถ้าเผลอเลือกเสาร์-อาทิตย์
  const fileName = `การบ้าน-${toThaiDate(dateKey).replace(/\//g, "-")}.png`;

  const makeBlob = async (): Promise<Blob | null> => {
    const node = cardRef.current;
    if (!node) return null;
    try { await (document as any).fonts?.ready; } catch {}
    const opts = { pixelRatio: 2.5, cacheBust: true, backgroundColor: "#ffffff", width: node.offsetWidth, height: node.offsetHeight };
    let blob: Blob | null = null;
    for (let i = 0; i < 3; i++) {
      blob = await toBlob(node, opts);
      if (blob && blob.size > 20000) break;
      await new Promise((r) => setTimeout(r, 350));
    }
    return blob;
  };

  const saveImage = async () => {
    setBusy(true); setHint("");
    try {
      const blob = await makeBlob();
      if (!blob) throw new Error("empty");
      const file = new File([blob], fileName, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: fileName }); setBusy(false); return; } catch (err) {
          if (err instanceof Error && err.name === "AbortError") { setBusy(false); return; }
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      if ("download" in a) { a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000); setHint("บันทึกลงเครื่องแล้ว ✅"); setBusy(false); return; }
      setPreview(url);
    } catch { setHint("สร้างรูปไม่สำเร็จ"); } finally { setBusy(false); }
  };

  return (
    <main className="pb-40">
      <header className="rounded-b-3xl bg-gradient-to-br from-indigo-500 to-sky-400 px-5 pb-5 pt-8 text-white">
        <h1 className="text-xl font-bold">สร้างการ์ดสรุป 🖼</h1>
        <p className="text-xs opacity-85">แตะการ์ดเล็กเพื่อเปลี่ยนวัน</p>
        <label className="mt-4 flex items-center justify-between rounded-2xl bg-white/20 px-4 py-2.5">
          <span className="text-sm font-medium">วัน{DAY_NAMES[dayIndex]} · {toThaiDate(dateKey)}</span>
          <input type="date" value={dateKey} onChange={(e) => e.target.value && setDateKey(e.target.value)} className="bg-transparent text-xs text-white [color-scheme:dark]" />
        </label>
      </header>

      <section className="pt-4">
        <h2 className="mb-2 px-5 text-xs font-bold text-slate-600">📆 7 วันเรียนล่าสุด</h2>
        <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-5 pb-1">
          {last7.map((key) => {
            const dow = dowOf(key);
            const th = DAY_THEME[dow];
            const list = rowsOf(key);
            const filled = list.filter((r) => r.has).length;
            const active = key === dateKey;
            return (
              <button key={key} onClick={() => setDateKey(key)} className={`w-[96px] shrink-0 rounded-2xl p-2 text-left transition ${active ? "ring-2 ring-indigo-500 ring-offset-2" : "opacity-85"}`} style={{ background: th.bg }}>
                <div className="text-base leading-none">{th.emoji}</div>
                <div className="mt-1 text-[11px] font-bold" style={{ color: th.accent }}>{DAY_NAMES[dow]}</div>
                <div className="text-[9px]" style={{ color: "#64748b" }}>{toThaiShort(key)}</div>
                <div className="mt-1.5 text-[9px] font-semibold" style={{ color: th.accent }}>
                  {list.length === 0 ? "หยุด" : `จด ${filled}/${list.length}`}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ================= การ์ด ================= */}
      <div className="px-4 pt-5">
        <div ref={cardRef} className="relative overflow-hidden rounded-3xl p-5" style={{ background: t.bg }}>
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full" style={{ background: "rgba(255,255,255,.5)" }} />
          <div className="relative mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="text-3xl leading-none">{t.emoji}</div>
              <h2 className="mt-1.5 text-xl font-extrabold tracking-tight" style={{ color: t.accent }}>การบ้านวัน{DAY_NAMES[dayIndex]}</h2>
              <p className="text-[11px] font-medium" style={{ color: "#64748b" }}>ม.2/2 · HomeworkNote</p>
            </div>
            <div className="rounded-2xl border-2 border-white bg-white/75 px-3 py-2 text-center">
              <div className="text-[9px]" style={{ color: "#94a3b8" }}>วันที่</div>
              <div className="text-sm font-bold" style={{ color: t.accent }}>{toThaiDate(dateKey)}</div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl" style={{ background: "rgba(255,255,255,.9)" }}>
            <div className="grid grid-cols-[74px_1fr_1fr_58px] text-[10px] font-bold" style={{ background: t.head, color: "#334155" }}>
              <div className="px-2 py-2.5">รายวิชา</div><div className="px-2 py-2.5">งานในห้อง</div><div className="px-2 py-2.5">การบ้าน</div><div className="px-1.5 py-2.5 text-center">ส่ง</div>
            </div>
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-[74px_1fr_1fr_58px] text-[10px] leading-snug" style={{ background: i % 2 ? "transparent" : t.row, borderTop: "1px solid #ffffff" }}>
                <div className="px-2 py-2 font-semibold" style={{ color: "#334155" }}>{r.subject}</div>
                <div className="px-2 py-2" style={{ color: "#475569" }}>{r.classwork}</div>
                <div className="px-2 py-2" style={{ color: "#475569" }}>{r.homework}</div>
                <div className="px-1.5 py-2 text-center text-[9px] font-medium" style={{ color: r.due ? t.accent : "#cbd5e1" }}>{r.due || "—"}</div>
              </div>
            ))}
          </div>

          <div className="relative mt-3 flex items-center justify-between px-1 text-[9px]">
            <span style={{ color: "#94a3b8" }}>สร้างด้วย HomeworkNote</span>
            <span className="font-bold" style={{ color: t.accent }}>👤 จดโดย: {nickname}</span>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[68px] z-40 mx-auto max-w-md border-t border-slate-100 bg-white/95 px-5 py-3 backdrop-blur-xl">
        <button onClick={saveImage} disabled={busy} className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-sky-400 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 active:scale-[.98] disabled:opacity-60">
          {busy ? "กำลังสร้าง…" : "📤 บันทึก / ส่งรูป"}
        </button>
      </div>

      {preview && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-black/90 p-4">
          <button onClick={() => { URL.revokeObjectURL(preview); setPreview(null); }} className="absolute right-4 top-4 rounded-full bg-white/20 px-4 py-1.5 text-sm text-white">ปิด</button>
          <div className="flex-1 overflow-auto rounded-2xl bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="การ์ด" className="w-full rounded-xl" />
          </div>
        </div>
      )}
    </main>
  );
}
