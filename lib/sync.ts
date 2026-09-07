import { sb, hasSupabase } from "./supabase";
import { loadAll, saveAllLocal, type HomeworkEntry } from "./storage";
import type { SubjectId } from "@/data/schedule";

const OUTBOX = "hwnote:outbox:v1";
const PROFILE = "hwnote:profile:v1";

export type Profile = {
  deviceId: string;
  nickname: string;
  roomId?: string;
  roomCode?: string;
};

export type SyncState = "idle" | "syncing" | "error";

/* ---------------- uuid (fallback สำหรับ http / เบราว์เซอร์เก่า) ---------------- */
function uuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/* ---------------- listeners ---------------- */
let listeners: ((s: SyncState) => void)[] = [];

export function onSyncChange(cb: (s: SyncState) => void) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}
const emit = (s: SyncState) => listeners.forEach((l) => l(s));

/* ---------------- profile ---------------- */
export function getProfile(): Profile {
  if (typeof window === "undefined") return { deviceId: "", nickname: "นักเรียน" };
  const raw = localStorage.getItem(PROFILE);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      /* fallthrough */
    }
  }
  const p: Profile = { deviceId: uuid(), nickname: "นักเรียน" };
  localStorage.setItem(PROFILE, JSON.stringify(p));
  return p;
}

export function setProfile(patch: Partial<Profile>) {
  const p = { ...getProfile(), ...patch };
  localStorage.setItem(PROFILE, JSON.stringify(p));
  window.dispatchEvent(new Event("hwnote:update"));
  return p;
}

/* ---------------- outbox ---------------- */
type Job = { entry: HomeworkEntry; at: number };

function readOutbox(): Job[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(OUTBOX) || "[]");
  } catch {
    return [];
  }
}

function writeOutbox(jobs: Job[]) {
  localStorage.setItem(OUTBOX, JSON.stringify(jobs));
  window.dispatchEvent(new Event("hwnote:update"));
}

export function getOutboxSize() {
  return readOutbox().length;
}

/** เรียกทุกครั้งที่มีการแก้ไข — local เขียนไปแล้ว ตรงนี้แค่เข้าคิว */
export function queueEntry(entry: HomeworkEntry) {
  const jobs = readOutbox().filter((j) => j.entry.id !== entry.id);
  jobs.push({ entry, at: Date.now() });
  writeOutbox(jobs);
  if (typeof navigator !== "undefined" && navigator.onLine) void syncNow();
}

/* ---------------- push ---------------- */
let syncing = false;

export async function syncNow() {
  if (syncing) return;
  const p = getProfile();
  if (!hasSupabase() || !p.roomId || !navigator.onLine) return;

  const jobs = readOutbox();
  if (!jobs.length) return;

  syncing = true;
  emit("syncing");
  try {
    const client = sb();

    const hw = jobs.map((j) => ({
      id: j.entry.id,
      room_id: p.roomId,
      date: j.entry.date,
      subject_id: j.entry.subjectId,
      classwork: j.entry.classwork,
      homework: j.entry.homework,
      due_date: j.entry.dueDate || null,
      updated_at: new Date(j.entry.updatedAt).toISOString(),
      updated_by: p.nickname,
    }));

    const { error } = await client.from("homework").upsert(hw, { onConflict: "id" });
    if (error) throw error;

    const comps = jobs.map((j) => ({
      homework_id: j.entry.id,
      device_id: p.deviceId,
      done: j.entry.done,
      updated_at: new Date().toISOString(),
    }));
    await client.from("completions").upsert(comps, { onConflict: "homework_id,device_id" });

    writeOutbox([]);
    emit("idle");
  } catch (e) {
    console.warn("[sync] push failed", e);
    emit("error");
  } finally {
    syncing = false;
  }
}

/* ---------------- pull ---------------- */
export async function pullAll() {
  const p = getProfile();
  if (!hasSupabase() || !p.roomId || !navigator.onLine) return;

  try {
    const client = sb();
    const [{ data: hw }, { data: comps }] = await Promise.all([
      client.from("homework").select("*").eq("room_id", p.roomId),
      client.from("completions").select("*").eq("device_id", p.deviceId),
    ]);
    if (!hw) return;

    const doneMap = new Map<string, boolean>((comps ?? []).map((c) => [c.homework_id, c.done]));
    const local = loadAll();
    const merged: Record<string, HomeworkEntry> = { ...local };

    hw.forEach((r) => {
      const remoteAt = new Date(r.updated_at).getTime();
      const cur = local[r.id];

      // last-write-wins
      if (!cur || remoteAt > cur.updatedAt) {
        merged[r.id] = {
          id: r.id,
          date: r.date,
          subjectId: r.subject_id as SubjectId,
          classwork: r.classwork ?? "",
          homework: r.homework ?? "",
          dueDate: r.due_date ?? "",
          done: doneMap.get(r.id) ?? cur?.done ?? false,
          updatedAt: remoteAt,
        };
      } else {
        merged[r.id] = { ...cur, done: doneMap.get(r.id) ?? cur.done };
      }
    });

    saveAllLocal(merged);
    window.dispatchEvent(new Event("hwnote:update"));
  } catch (e) {
    console.warn("[sync] pull failed", e);
  }
}

/* ---------------- realtime ---------------- */
export function subscribeRoom() {
  const p = getProfile();
  if (!hasSupabase() || !p.roomId) return () => {};

  const client = sb();
  const ch = client
    .channel(`room:${p.roomId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "homework", filter: `room_id=eq.${p.roomId}` },
      () => void pullAll()
    )
    .subscribe();

  return () => {
    void client.removeChannel(ch);
  };
}

/* ---------------- room ---------------- */
function genCode() {
  const s = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return "M202-" + Array.from({ length: 4 }, () => s[Math.floor(Math.random() * s.length)]).join("");
}

export async function createRoom(nickname: string, roomName = "ม.2/2") {
  if (!hasSupabase()) throw new Error("ยังไม่ได้ตั้งค่า Supabase (ดู .env.local)");
  const client = sb();
  const code = genCode();

  const { data, error } = await client.from("rooms").insert({ code, name: roomName }).select().single();
  if (error) throw new Error("สร้างห้องไม่สำเร็จ: " + error.message);

  const p = setProfile({ nickname, roomId: data.id, roomCode: data.code });
  await client
    .from("members")
    .upsert({ room_id: data.id, device_id: p.deviceId, nickname, role: "editor" }, { onConflict: "room_id,device_id" });

  // ดันการบ้านที่จดไว้ก่อนหน้าขึ้นห้องใหม่ทั้งหมด
  const all = Object.values(loadAll());
  if (all.length) writeOutbox(all.map((entry) => ({ entry, at: Date.now() })));
  await syncNow();

  return data;
}

export async function joinRoom(code: string, nickname: string) {
  if (!hasSupabase()) throw new Error("ยังไม่ได้ตั้งค่า Supabase (ดู .env.local)");
  const client = sb();

  const { data, error } = await client
    .from("rooms")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();

  if (error || !data) throw new Error("ไม่พบห้องนี้ ลองเช็กรหัสอีกครั้ง");

  const p = setProfile({ nickname, roomId: data.id, roomCode: data.code });
  await client
    .from("members")
    .upsert({ room_id: data.id, device_id: p.deviceId, nickname, role: "member" }, { onConflict: "room_id,device_id" });

  await pullAll();
  return data;
}

export function leaveRoom() {
  setProfile({ roomId: undefined, roomCode: undefined });
}
