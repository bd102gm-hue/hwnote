import { createClient } from "@supabase/supabase-js";

// ใส่ URL และ Key ของคุณที่นี่ (ถ้ามีไฟล์ .env ให้ใช้ process.env แทน)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const sb = createClient(supabaseUrl, supabaseAnonKey);

const emailOf = (id: string) => `${id.trim()}@hwnote.local`;

export async function lookupStudent(studentId: string) {
  const { data } = await sb
    .from("students")
    .select("username, nickname, birthdate, registered")
    .eq("username", studentId.trim())
    .maybeSingle();
  return data;
}

export async function studentSignIn(studentId: string, password: string) {
  const { error } = await sb.auth.signInWithPassword({
    email: emailOf(studentId),
    password,
  });
  if (error) throw new Error("รหัสผ่านไม่ถูกต้อง");
}

export async function firstTimeSetup(studentId: string, birthdate: string, newPassword: string) {
  const stu = await lookupStudent(studentId);
  if (!stu) throw new Error("ไม่พบรหัสนักเรียนนี้");
  if (stu.birthdate !== birthdate) throw new Error("วันเดือนปีเกิดไม่ถูกต้อง");

  const email = emailOf(studentId);
  let { error } = await sb.auth.signInWithPassword({ email, password: birthdate });

  if (error) {
    const up = await sb.auth.signUp({ email, password: birthdate });
    if (up.error) throw new Error(up.error.message);
    await sb.auth.signInWithPassword({ email, password: birthdate });
  }

  const upd = await sb.auth.updateUser({ password: newPassword });
  if (upd.error) throw new Error(upd.error.message);

  await sb.from("students").update({ registered: true }).eq("username", studentId.trim());
  return stu.nickname;
}

export async function adminResetPassword(studentId: string) {
  const { error } = await sb.rpc("admin_reset_password", { p_username: studentId });
  if (error) throw new Error(error.message);
}

export async function deleteMember(username: string) {
  const { error } = await sb.from("students").delete().eq("username", username);
  if (error) throw new Error(error.message);
  return true;
}
