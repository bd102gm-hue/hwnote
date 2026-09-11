import { sb, hasSupabase } from "./supabase";

export type Me = { id: string; username: string; nickname: string; isAdmin: boolean };

const ADMIN_CODE = process.env.NEXT_PUBLIC_ADMIN_CODE || "GM02-ADMIN";
const mail = (u: string) => `${u.trim().toLowerCase()}@gm02.app`;

let _me: Me | null = null;
export function cachedMe() { return _me; }

export async function loadMe(): Promise<Me | null> {
  if (!hasSupabase()) return null;
  const { data: { user } } = await sb().auth.getUser();
  if (!user) { _me = null; return null; }
  const { data } = await sb().from("profiles").select("*").eq("id", user.id).maybeSingle();
  _me = data
    ? { id: user.id, username: data.username, nickname: data.nickname, isAdmin: !!data.is_admin }
    : { id: user.id, username: user.email?.split("@")[0] ?? "user", nickname: "นักเรียน", isAdmin: false };
  return _me;
}

export async function signUp(username: string, nickname: string, password: string, adminCode = "") {
  const u = username.trim().toLowerCase();
  if (!/^[a-z0-9_.]{3,20}$/.test(u)) throw new Error("ชื่อผู้ใช้ใช้ a-z 0-9 _ . ยาว 3–20 ตัว");
  if (password.length < 6) throw new Error("รหัสผ่านอย่างน้อย 6 ตัว");

  const { data, error } = await sb().auth.signUp({ email: mail(u), password });
  if (error) throw new Error(error.message.includes("already") ? "มีชื่อผู้ใช้นี้แล้ว" : error.message);
  if (!data.user) throw new Error("สมัครไม่สำเร็จ");

  const { error: e2 } = await sb().from("profiles").insert({
    id: data.user.id,
    username: u,
    nickname: nickname.trim() || u,
    is_admin: adminCode.trim() === ADMIN_CODE,
  });
  if (e2 && !e2.message.includes("duplicate")) throw new Error("สร้างโปรไฟล์ไม่สำเร็จ: " + e2.message);
  return loadMe();
}

export async function signIn(username: string, password: string) {
  const { error } = await sb().auth.signInWithPassword({ email: mail(username), password });
  if (error) throw new Error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
  return loadMe();
}

export async function signOut() {
  await sb().auth.signOut();
  _me = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("hwnote:entries:v1");
    localStorage.removeItem("hwnote:outbox:v1");
  }
}

export async function updateNickname(nickname: string) {
  if (!_me) return;
  await sb().from("profiles").update({ nickname: nickname.trim() }).eq("id", _me.id);
  _me = { ..._me, nickname: nickname.trim() };
  window.dispatchEvent(new Event("hwnote:update"));
}
