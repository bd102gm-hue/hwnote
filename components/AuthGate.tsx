"use client";
import { useState } from "react";
import { lookupStudent, studentSignIn, firstTimeSetup } from "@/lib/auth";

export default function AuthGate() {
  const [step, setStep] = useState<"id" | "login" | "setup">("id");
  const [id, setId] = useState("");
  const [nick, setNick] = useState("");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [birth, setBirth] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const box = "w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400";
  const btn = "w-full rounded-xl bg-indigo-500 p-3 text-sm font-bold text-white disabled:opacity-50";

  const checkId = async () => {
    setBusy(true); setErr("");
    try {
      const s = await lookupStudent(id);
      if (!s) throw new Error("ไม่พบรหัสนักเรียนนี้ในระบบ");
      setNick(s.nickname);
      setStep(s.registered ? "login" : "setup");
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  const doLogin = async () => {
    setBusy(true); setErr("");
    try { await studentSignIn(id, pass); location.reload(); }
    catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  const doSetup = async () => {
    if (pass.length < 6) return setErr("รหัสผ่านต้องยาวอย่างน้อย 6 ตัว");
    if (pass !== pass2) return setErr("รหัสผ่านสองช่องไม่ตรงกัน");
    setBusy(true); setErr("");
    try { await firstTimeSetup(id, birth, pass); location.reload(); }
    catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
      <div className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-lg font-bold text-slate-800">HomeworkNote</h1>

        {step === "id" && (<>
          <p className="text-xs text-slate-500">กรอกรหัสนักเรียน 5 หลัก</p>
          <input className={box} inputMode="numeric" placeholder="เช่น 48285"
            value={id} onChange={(e) => setId(e.target.value)} />
          <button className={btn} disabled={busy || !id} onClick={checkId}>ถัดไป</button>
        </>)}

        {step === "login" && (<>
          <p className="text-xs text-slate-500">สวัสดี <b className="text-indigo-600">{nick}</b> 👋 กรอกรหัสผ่านของคุณ</p>
          <input className={box} type="password" placeholder="รหัสผ่าน"
            value={pass} onChange={(e) => setPass(e.target.value)} />
          <button className={btn} disabled={busy || !pass} onClick={doLogin}>เข้าสู่ระบบ</button>
          <button className="w-full text-[11px] text-slate-400" onClick={() => setStep("id")}>← เปลี่ยนรหัสนักเรียน</button>
        </>)}

        {step === "setup" && (<>
          <p className="text-xs text-slate-500">สวัสดี <b className="text-indigo-600">{nick}</b> 👋 ยืนยันวันเกิดเพื่อตั้งรหัสผ่านครั้งแรก</p>
          <input className={box} type="date" value={birth} onChange={(e) => setBirth(e.target.value)} />
          <input className={box} type="password" placeholder="ตั้งรหัสผ่านใหม่ (6 ตัวขึ้นไป)"
            value={pass} onChange={(e) => setPass(e.target.value)} />
          <input className={box} type="password" placeholder="ยืนยันรหัสผ่านอีกครั้ง"
            value={pass2} onChange={(e) => setPass2(e.target.value)} />
          <button className={btn} disabled={busy || !birth} onClick={doSetup}>บันทึกและเข้าใช้งาน</button>
          <button className="w-full text-[11px] text-slate-400" onClick={() => setStep("id")}>← ย้อนกลับ</button>
        </>)}

        {err && <p className="text-center text-xs text-rose-500">{err}</p>}
      </div>
    </div>
  );
}
