import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function hasSupabase() {
  return Boolean(url && key);
}

let _client: SupabaseClient | null = null;

export function sb(): SupabaseClient {
  if (!hasSupabase()) throw new Error("ยังไม่ได้ตั้งค่า Supabase");
  if (!_client) {
    _client = createClient(url!, key!, {
      realtime: { params: { eventsPerSecond: 5 } },
      auth: { persistSession: false },
    });
  }
  return _client;
}
