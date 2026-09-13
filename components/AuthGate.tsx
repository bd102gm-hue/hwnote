"use client";

import { useEffect, useState } from "react";
import { hasSupabase, supabaseConfigError } from "@/lib/supabase";
import { loadMe, signIn, signUpCreateRoom, signUpJoinRoom, type Me } from "@/lib/auth";

type Mode = "in" | "join" | "create";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [mode, setMode] = useState<Mode>("in");
  const [u, setU] = useState(""); const [p, setP] = useState("");
  const [nick, setNick] = useState(""); const [code, setCode] = useState("");
  const [school, setSchool] = useState(""); const [cls, setCls] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");

  useEffect(() => { loadMe().then((m) => { setMe(m); setReady(true); }); }, []);

  const submit = async () => {
    setBusy(true); setErr("");
    try {
      const m =
        mode === "in" ? await signIn(u, p)
        : mode === "join" ? await signUpJoinRoom(u, nick, p, code)
        : await signUpCreateRoom(u, nick, p, school, cls);
      setMe(m);
      window.dispatchEvent(new Event("hwnote:update"));
    } catch (e) { setErr(e instanceof Error ? e.message : "เกิดข้อผิดพลาด"); }
    finally { setBusy(false); }
  };

  const valid =
    mode === "in" ? u && p
    : mode === "join" ? u && p && nick && code.trim().length >= 4
    : u && p && nick && cls.trim();

  if (!hasSupabase())
    return <Center>⚠️ ยังไม่ได้ตั้งค่า Supabase<br /><span className="text-xs text-slate-400">{supabaseConfigError()}</span></Center>;
  if (!ready) return <Center>กำลังโหลด…</Center>;
  if (me) return <>{children}</>;

  return (
    <main className="flex min-h-screen flex-col justify-center px-6 py-10">
      <div className="mb-6 text-center">
        <div className="text-5xl">📚</div>
        <h1 className="mt-2 text-2xl font-bold text-slate-800">HomeworkNote</h1>
        <p className="text-sm text-slate-400">จดการบ้านร่วมกันทั้งห้อง</p>
      </div>

      <div className="card space-y-3 p-5">
        <div className="flex rounded-xl bg-slate-100 p-1">
          {([["in","เข้าสู่ระบบ"],["join","เข้าร่วมห้อง"],["create","สร้างห้อง"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => { setMode(k); setErr(""); }}
              className={`flex-1 rounded-lg py-2 text-[11px] font-semibold ${mode===k?"bg-white text-indigo-600 shadow":"text-slate-500"}`}>
              {l}
            </button>
          ))}
        </div>

        {mode === "create" && (
          <>
            <Input label="🏫 ชื่อโรงเรียน" value={school} onChange={setSchool} placeholder="เช่น โรงเรียนสวนกุหลาบ" />
            <Input label="🎓 ชื่อชั้น / ห้อง" value={cls} onChange={setCls} placeholder="เช่น ม.2/2" />
          </>
        )}
        {mode === "join" && (
          <Input label="🔑 รหัสห้อง (ขอจากเพื่อน)" value={code} onChange={(v) => setCode(v.toUpperCase())} placeholder="เช่น K7XQ2M" />
        )}

        <Input label="ชื่อผู้ใช้ (ภาษาอังกฤษ)" value={u} onChange={setU} placeholder="mind2569" />
        {mode !== "in" && <Input label="ชื่อเล่น (เพื่อนจะเห็นชื่อนี้)" value={nick} onChange={setNick} placeholder="มายด์" />}
        <Input label="รหัสผ่าน" value={p} onChange={setP} type="password" placeholder="อย่างน้อย 6 ตัว" />

        {err && <p className="rounded-xl bg-rose-50 p-2.5 text-xs text-rose-600">{err}</p>}

        <button onClick={submit} disabled={busy || !valid}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-sky-400 py-3 text-sm font-semibold text-white disabled:opacity-40">
          {busy ? "กำลังทำงาน…"
            : mode === "in" ? "เข้าสู่ระบบ"
            : mode === "join" ? "เข้าร่วมห้อง"
            : "สร้างห้องของฉัน"}
        </button>
      </div>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-400">
        {mode === "create" ? "คุณจะเป็นผู้ดูแลห้อง แก้ตารางเรียนและตั้งเวรจดได้"
          : mode === "join" ? "ขอรหัสห้องจากหัวหน้าห้องหรือเพื่อนที่ใช้อยู่แล้ว"
          : "ยังไม่มีบัญชี? เลือกแท็บ “เข้าร่วมห้อง” หรือ “สร้างห้อง”"}
      </p>
    </main>
  );
}

function Input({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-600">{label}</label>
      <input type={type} value={value} placeholder={placeholder} autoCapitalize="none"
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400" />
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center px-8 text-center text-sm text-slate-500">{children}</div>;
}
