// ใน lib/auth.ts
export async function signInWithStudentId(studentId: string, password: string) {
  // 1. ตรวจสอบรหัสผ่านที่กำหนดตายตัว
  if (password !== "111111") throw new Error("รหัสผ่านไม่ถูกต้อง");

  // 2. ตรวจสอบว่ารหัสนักเรียนนี้มีในไฟล์ฐานข้อมูลหรือไม่
  // ใช้ query_tabular_data เพื่อค้นหาข้อมูลจากรหัสนักเรียน
  // (คุณจะต้องเตรียมฟังก์ชันดึงข้อมูลจาก SQL ที่ชี้ไปที่ไฟล์ "รหัสนักเรียน.xlsx")
  const student = await findStudentInDatabase(studentId); 
  if (!student) throw new Error("ไม่พบรหัสนักเรียนนี้ในระบบ");

  // 3. ทำการ Login ด้วย Username จำลอง (ใช้รหัสนักเรียน)
  const { error } = await sb().auth.signInWithPassword({ 
    email: `${studentId}@hwnote.app`, 
    password 
  });
  
  // ... เพิ่มขั้นตอนการดึงชื่อเล่นจาก student.ชื่อเล่น มาแสดงผล
}
const emailOf = (id: string) => `${id.trim()}@hwnote.local`;

// เช็กว่ารหัสนักเรียนนี้มีในทะเบียนไหม + ตั้งรหัสแล้วหรือยัง
export async function lookupStudent(studentId: string) {
  const { data } = await sb()
    .from("students")
    .select("username, nickname, birthdate, registered")
    .eq("username", studentId.trim())
    .maybeSingle();
  return data;
}

// เข้าระบบด้วยรหัสผ่านส่วนตัว
export async function studentSignIn(studentId: string, password: string) {
  const { error } = await sb().auth.signInWithPassword({
    email: emailOf(studentId),
    password,
  });
  if (error) throw new Error("รหัสผ่านไม่ถูกต้อง");
}

// ครั้งแรก / หลังโดนรีเซ็ต: ยืนยันวันเกิดแล้วตั้งรหัสใหม่
export async function firstTimeSetup(
  studentId: string,
  birthdate: string,
  newPassword: string
) {
  const stu = await lookupStudent(studentId);
  if (!stu) throw new Error("ไม่พบรหัสนักเรียนนี้");
  if (stu.birthdate !== birthdate) throw new Error("วันเดือนปีเกิดไม่ถูกต้อง");

  const email = emailOf(studentId);

  // ลองเข้าด้วยวันเกิด (กรณีเคยมีบัญชีแล้ว/โดนรีเซ็ต)
  let { error } = await sb().auth.signInWithPassword({ email, password: birthdate });

  // ยังไม่มีบัญชี → สร้างใหม่
  if (error) {
    const up = await sb().auth.signUp({ email, password: birthdate });
    if (up.error) throw new Error(up.error.message);
    const again = await sb().auth.signInWithPassword({ email, password: birthdate });
    if (again.error) throw new Error("สร้างบัญชีแล้วแต่เข้าไม่ได้ ลองใหม่อีกครั้ง");
  }

  // เปลี่ยนเป็นรหัสส่วนตัว
  const upd = await sb().auth.updateUser({ password: newPassword });
  if (upd.error) throw new Error(upd.error.message);

  await sb().from("students").update({ registered: true }).eq("username", studentId.trim());
  return stu.nickname;
}

// ปุ่มรีเซ็ตฝั่ง Admin
export async function adminResetPassword(studentId: string) {
  const { error } = await sb().rpc("admin_reset_password", { p_username: studentId });
  if (error) throw new Error(error.message);
}
