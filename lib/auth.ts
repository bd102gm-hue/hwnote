import { sb, hasSupabase } from "./supabase";
import { setRoomInfo, currentAcademicYear } from "@/data/schedule";

export type Me = {
  id: string; username: string; nickname: string; isAdmin: boolean;
  roomId: string | null; roomCode: string; school: string; className: string;
};

const mail = (u: string) => `${u.trim().toLowerCase()}@hwnote.app`;

let _me: Me | null = null;
export function cachedMe() { return _me; }

function syncRoom(m: Me | null) {
  setRoomInfo({ code: m?.roomCode ?? "", school: m?.school ?? "", className: m?.className ?? "" });
}

export async function loadMe(): Promise<Me | null> {
  if (!hasSupabase()) return null;
  const { data: { user } } = await sb().auth.getUser();
  if (!user) { _me = null; syncRoom(null); return null; }

  const { data: p } = await sb()
    .from("profiles").select("*, rooms(*)").eq("id", user.id).maybeSingle();

  if (!p) { _me = null; return null; }
  const r = (p as Record<string, unknown>).rooms as
    { id: string; code: string; school: string; class_name: string } | null;

  _me = {
    id: user.id, username: p.username, nickname: p.nickname, isAdmin: !!p.is_admin,
    roomId: p.room_id ?? null, roomCode: r?.code ?? "",
    school: r?.school ?? "", className: r?.class_name ?? "",
  };
  syncRoom(_me);
  return _me;
}

function genCode() {
  const s = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => s[Math.floor(Math.random() * s.length)]).join("");
}

async function createAuthUser(username: string, password: string) {
  const u = username.trim().toLowerCase();
  if (!/^[a-z0-9_.]{3,20}$/.test(u)) throw new Error("ชื่อผู้ใช้ใช้ a-z 0-9 _ . ยาว 3–20 ตัว");
  if (password.length < 6) throw new Error("รหัสผ่านอย่างน้อย 6 ตัว");
  const { data, error } = await sb().auth.signUp({ email: mail(u), password });
  if (error) throw new Error(error.message.includes("already") ? "มีชื่อผู้ใช้นี้แล้ว" : error.message);
  if (!data.user) throw new Error("สมัครไม่สำเร็จ");
  return { id: data.user.id, u };
}

/** สมัคร + สร้างห้องใหม่ (เป็นผู้ดูแลอัตโนมัติ) */
export async function signUpCreateRoom(
  username: string, nickname: string, password: string,
  school: string, className: string
) {
  if (!className.trim()) throw new Error("กรุณาใส่ชื่อชั้น/ห้อง");
  const { id, u } = await createAuthUser(username, password);

  const year = currentAcademicYear();
  const { data: room, error: e1 } = await sb().from("rooms")
    .insert({ code: genCode(), school: school.trim(), class_name: className.trim(), year })
    .select().single();
  if (e1) throw new Error("สร้างห้องไม่สำเร็จ: " + e1.message);

  const { error: e2 } = await sb().from("profiles").insert({
    id, username: u, nickname: nickname.trim() || u, room_id: room.id, is_admin: true,
  });
  if (e2) throw new Error("สร้างโปรไฟล์ไม่สำเร็จ: " + e2.message);

  return loadMe();
}

/** สมัคร + เข้าห้องด้วยรหัสเชิญ */
export async function signUpJoinRoom(
  username: string, nickname: string, password: string, code: string
) {
  const c = code.trim().toUpperCase();
  const { data: room } = await sb().from("rooms").select("*").eq("code", c).maybeSingle();
  if (!room) throw new Error("ไม่พบรหัสห้องนี้ ลองเช็กอีกครั้ง");

  const { id, u } = await createAuthUser(username, password);
  const { error } = await sb().from("profiles").insert({
    id, username: u, nickname: nickname.trim() || u, room_id: room.id, is_admin: false,
  });
  if (error) throw new Error("สร้างโปรไฟล์ไม่สำเร็จ: " + error.message);

  return loadMe();
}

export async function signIn(username: string, password: string) {
  const { error } = await sb().auth.signInWithPassword({ email: mail(username), password });
  if (error) throw new Error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
  return loadMe();
}

export async function signOut() {
  await sb().auth.signOut();
  _me = null; syncRoom(null);
  if (typeof window !== "undefined") {
    localStorage.removeItem("hwnote:entries:v1");
    localStorage.removeItem("hwnote:outbox:v1");
    localStorage.removeItem("hwnote:schedule:v3");
  }
}

/** ผู้ดูแลแก้ชื่อโรงเรียน / ชื่อชั้น */
export async function updateRoom(school: string, className: string) {
  if (!_me?.roomId) throw new Error("ยังไม่มีห้อง");
  if (!_me.isAdmin) throw new Error("เฉพาะผู้ดูแลเท่านั้น");
  const { error } = await sb().from("rooms")
    .update({ school: school.trim(), class_name: className.trim() })
    .eq("id", _me.roomId);
  if (error) throw new Error(error.message);
  _me = { ..._me, school: school.trim(), className: className.trim() };
  syncRoom(_me);
  window.dispatchEvent(new Event("hwnote:update"));
  return _me;
}
