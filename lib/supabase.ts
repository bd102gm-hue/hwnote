import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** ตัดช่องว่างและ / ท้ายออกอัตโนมัติ กันค่าที่ก๊อปมาผิดรูป */
function cleanUrl(v?: string) {
  if (!v) return "";
  let u = v.trim().replace(/\/+$/, "");
  // เผลอก๊อป path เกินมา เช่น .../rest/v1
  u = u.replace(/\/(rest|auth|storage|realtime)(\/.*)?$/i, "");
  return u;
}

const url = cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

export function hasSupabase() {
  return Boolean(url && key && /^https:\/\/.+\.supabase\.co$/i.test(url));
}

/** ข้อความบอกว่าค่าผิดตรงไหน ใช้โชว์ในหน้าตั้งค่า */
export function supabaseConfigError(): string | null {
  if (!url && !key) return null;
  if (!url) return "ยังไม่ได้ใส่ NEXT_PUBLIC_SUPABASE_URL";
  if (!key) return "ยังไม่ได้ใส่ NEXT_PUBLIC_SUPABASE_ANON_KEY";
  if (!/^https:\/\//i.test(url)) return "URL ต้องขึ้นต้นด้วย https://";
  if (!/\.supabase\.co$/i.test(url)) return `URL ไม่ถูกต้อง (ตอนนี้คือ ${url})`;
  if (key.length < 100) return "anon key สั้นผิดปกติ — อาจก๊อปมาไม่ครบ";
  return null;
}

let _client: SupabaseClient | null = null;

export function sb(): SupabaseClient {
  if (!hasSupabase()) throw new Error(supabaseConfigError() ?? "ยังไม่ได้ตั้งค่า Supabase");
  if (!_client) {
    _client = createClient(url, key, {
      realtime: { params: { eventsPerSecond: 5 } },
      auth: { persistSession: false },
    });
  }
  return _client;
}
