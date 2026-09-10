"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toBlob } from "html-to-image";
import { SUBJECTS, DAY_NAMES, getSubjectsForDay } from "@/data/schedule";
import { loadAll, toDateKey, toThaiDate, type HomeworkEntry } from "@/lib/storage";

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
  const [preview, setPreview] = useState<string | null>(null);
  const [hint, setHint] = useState("");

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
  const fileName = `การบ้าน-${toThaiDate(dateKey).replace(/\//g, "-")}.png`;

  /** สร้างรูป — render ซ้ำหลายรอบกัน Safari ออกมาขาว */
  const makeBlob = async (): Promise<Blob | null> => {
    const node = cardRef.current;
    if (!node) return null;

    // รอฟอนต์ไทยโหลดเสร็จก่อน ไม่งั้นตัวหนังสือหาย
    try {
      await (document as any).fonts?.ready;
    } catch {
      /* ข้ามได้ */
    }

    const opts = {
      pixelRatio: 2.5,
      cacheBust: true,
      backgroundColor: "#ffffff",
      width: node.offsetWidth,
      height: node.offsetHeight,
    };

    let blob: Blob | null = null;
    for (let i = 0; i < 3; i++) {
      blob = await toBlob(node, opts);
      // รอบแรก Safari มักได้ไฟล์เล็กผิดปกติ (ยังไม่ทันวาด) → ลองใหม่
      if (blob && blob.size > 20000) break;
      await new Promise((r) => setTimeout(r, 350));
    }
    return blob;
  };

  const saveImage = async () => {
    setBusy(true);
    setHint("");
    try {
      const blob = await makeBlob();
      if (!blob) throw new Error("empty");

      const file = new File([blob], fileName, { type: "image/png" });

      // 1) iPhone / iPad / Android รุ่นใหม่ → เปิดแชร์ชีต เลือก "บันทึกรูปภาพ"
      const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: fileName });
          setBusy(false);
          return;
        } catch (err) {
          // ผู้ใช้กดยกเลิกเอง → ไม่ต้องทำอะไรต่อ
          if (err instanceof Error && err.name === "AbortError") {
            setBusy(false);
            return;
          }
        }
      }

      const url = URL.createObjectURL(blob);

      // 2) คอมพิวเตอร์ → ดาวน์โหลดตรง ๆ
      const a = document.createElement("a");
      if ("download" in a) {
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        setHint("บันทึกลงเครื่องแล้ว ✅");
        setBusy(false);
        return;
      }

      // 3) สำรองสุดท้าย → โชว์รูปให้กดค้างเพื่อเซฟ
      setPreview(url);
    } catch (e) {
      console.error(e);
      setHint("สร้างรูปไม่สำเร็จ ลองกดใหม่อีกครั้งนะครับ");
    } finally {
      setBusy(false);
    }
  };

  /** ปุ่มสำรอง — เปิดรูปเป็นหน้าใหญ่ให้กดค้างบันทึก */
  const showPreview = async () => {
    setBusy(true);
    setHint("");
    try {
      const blob = await makeBlob();
      if (!blob) throw new Error("empty");
      setPreview(URL.createObjectURL(blob));
    } catch {
      setHint("สร้างรูปไม่สำเร็จ ลองกดใหม่อีกครั้งนะครับ");
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
      setHint("คัดลอกข้อความแล้ว ✅");
    } catch {
      setHint("คัดลอกไม่สำเร็จ");
    }
  };

  return (
    <main className="pb-36">
      <header className="rounded-b-3xl bg-gradient-to-br from-indigo-500 to-sky-400 px-5 pb-5 pt-8 text-white">
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

      {hint && <p className="px-5 pt-3 text-center text-xs text-slate-500">{hint}</p>}

      {/* ปุ่มล่าง */}
      <div className="fixed inset-x-0 bottom-[68px] z-40 mx-auto max-w-md border-t border-slate-100 bg-white/95 px-5 py-3 backdrop-blur-xl">
        <div className="flex gap-2.5">
          <button
            onClick={saveImage}
            disabled={busy}
            className="flex-1 rounded-2xl bg-gradient-to-r from-indigo-500 to-sky-400 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 active:scale-[.98] disabled:opacity-60"
          >
            {busy ? "กำลังสร้าง…" : "📤 บันทึก / ส่งรูป"}
          </button>
          <button
            onClick={copyText}
            className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 active:scale-[.98]"
          >
            📋
          </button>
        </div>
        <button
          onClick={showPreview}
          disabled={busy}
          className="mt-2 w-full text-center text-[11px] text-slate-400 underline disabled:opacity-50"
        >
          กดแล้วไม่มีอะไรเกิดขึ้น? แตะที่นี่เพื่อดูรูปแล้วกดค้างบันทึก
        </button>
      </div>

      {/* หน้าพรีวิว — กดค้างที่รูปเพื่อบันทึก */}
      {preview && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-black/90 p-4">
          <div className="flex items-center justify-between pb-3 text-white">
            <span className="text-sm font-semibold">กดค้างที่รูป → “บันทึกรูปภาพ”</span>
            <button
              onClick={() => {
                URL.revokeObjectURL(preview);
                setPreview(null);
              }}
              className="rounded-full bg-white/20 px-4 py-1.5 text-sm"
            >
              ปิด
            </button>
          </div>
          <div className="flex-1 overflow-auto rounded-2xl bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="การ์ดการบ้าน" className="w-full rounded-xl" />
          </div>
          <p className="pt-3 text-center text-xs text-white/70">
            iPhone/iPad: กดค้างที่รูป แล้วเลือก “เพิ่มลงรูปภาพ”
          </p>
        </div>
      )}
    </main>
  );
}
