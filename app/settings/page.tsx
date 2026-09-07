"use client";

import { useEffect, useState } from "react";
import { getProfile, setProfile, createRoom, joinRoom, leaveRoom, pullAll, type Profile } from "@/lib/sync";
import { hasSupabase } from "@/lib/supabase";

export default function SettingsPage() {
  const [p, setP] = useState<Profile | null>(null);
  const [nickname, setNickname] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const g = getProfile();
    setP(g);
    setNickname(g.nickname);
  }, []);

  const doCreate = async () => {
    setBusy(true);
    setErr("");
    try {
      await createRoom(nickname || "นักเรียน");
      setP(getProfile());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  };

  const doJoin = async () => {
    setBusy(true);
    setErr("");
    try {
      await joinRoom(code, nickname || "นักเรียน");
      setP(getProfile());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  };

  const invite = async () => {
    if (!p?.roomCode) return;
    const text = `รหัสห้อง HomeworkNote: ${p.roomCode}\n${location.origin}/settings`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "เข้าห้อง HomeworkNote", text });
        return;
      } catch {
        /* ผู้ใช้ยกเลิก */
      }
    }
    await navigator.clipboard.writeText(text);
    alert("คัดลอกรหัสห้องแล้ว ✅");
  };

  if (!p) return <div className="p-16 text-center text-sm text-slate-400">กำลังโหลด…</div>;

  return (
    <main>
      <header className="rounded-b-3xl bg-gradient-to-br from-indigo-500 to-sky-400 px-5 pb-6 pt-11 text-white">
        <h1 className="text-xl font-bold">ตั้งค่า ⚙️</h1>
        <p className="text-xs opacity-85">ชื่อเล่น · ห้องเรียน · การซิงก์</p>
      </header>

      <div className="space-y-4 px-5 py-5">
        {/* ชื่อเล่น */}
        <div className="card p-4">
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">👤 ชื่อเล่น</label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onBlur={() => setP(setProfile({ nickname: nickname.trim() || "นักเรียน" }))}
            placeholder="เช่น มายด์"
            className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400"
          />
          <p className="mt-1.5 text-[11px] text-slate-400">เพื่อนจะเห็นว่าใครเป็นคนจด</p>
        </div>

        {!hasSupabase() && (
          <div className="card p-4">
            <p className="text-sm font-semibold text-slate-800">📴 โหมดออฟไลน์ล้วน</p>
            <p className="mt-1 text-xs text-slate-500">
              ยังไม่ได้ตั้งค่า Supabase — ใช้งานได้ปกติทุกอย่าง แค่ยังแชร์กับเพื่อนไม่ได้
              (เพิ่มค่าใน <code className="rounded bg-slate-100 px-1">.env.local</code> แล้วรีสตาร์ท)
            </p>
          </div>
        )}

        {/* ห้อง */}
        {hasSupabase() &&
          (p.roomId ? (
            <div className="card overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-400 to-teal-400 px-4 py-3 text-white">
                <p className="text-xs opacity-90">เข้าห้องแล้ว ✓</p>
                <p className="text-lg font-bold tracking-wider">{p.roomCode}</p>
              </div>
              <div className="space-y-2.5 p-4">
                <p className="text-xs leading-relaxed text-slate-500">
                  ส่งรหัสนี้ให้เพื่อน → เพื่อนกด “เข้าร่วมห้อง” → เห็นการบ้านชุดเดียวกันทั้งห้อง
                </p>
                <div className="flex gap-2">
                  <button onClick={invite} className="flex-1 rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white">
                    📤 ชวนเพื่อน
                  </button>
                  <button
                    onClick={() => void pullAll()}
                    className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700"
                  >
                    🔄
                  </button>
                </div>
                <button
                  onClick={() => {
                    leaveRoom();
                    setP(getProfile());
                  }}
                  className="w-full rounded-xl py-2 text-xs text-rose-500"
                >
                  ออกจากห้อง
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="card p-4">
                <p className="mb-2 text-sm font-semibold text-slate-800">🔑 เข้าร่วมห้องเพื่อน</p>
                <div className="flex gap-2">
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="M202-XY7K"
                    maxLength={9}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 p-3 text-center text-sm font-bold tracking-widest outline-none focus:border-indigo-400"
                  />
                  <button
                    onClick={doJoin}
                    disabled={busy || code.trim().length < 5}
                    className="shrink-0 rounded-xl bg-indigo-500 px-5 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    เข้า
                  </button>
                </div>
              </div>

              <div className="card p-4 text-center">
                <p className="text-sm font-semibold text-slate-800">ยังไม่มีห้อง?</p>
                <p className="mb-3 mt-1 text-xs text-slate-500">สร้างใหม่แล้วชวนเพื่อนเข้ามา</p>
                <button
                  onClick={doCreate}
                  disabled={busy}
                  className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-sky-400 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy ? "กำลังสร้าง…" : "✨ สร้างห้องใหม่"}
                </button>
              </div>
            </>
          ))}

        {err && <p className="rounded-xl bg-rose-50 p-3 text-xs text-rose-600">{err}</p>}

        <div className="card space-y-2 p-4 text-[11px] text-slate-500">
          <Row k="โหมดออฟไลน์" v="✅ พร้อมใช้งาน" />
          <Row k="เก็บข้อมูล" v={p.roomId ? "เครื่องนี้ + คลาวด์" : "เครื่องนี้"} />
          <Row k="Device ID" v={p.deviceId.slice(0, 8)} />
        </div>
      </div>
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span>{k}</span>
      <span className="font-medium text-slate-700">{v}</span>
    </div>
  );
}
