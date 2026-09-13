import { sb, hasSupabase } from "./supabase";
import { loadAll, saveAllLocal, type HomeworkEntry } from "./storage";
import { cachedMe } from "./auth";
import {
  applyConfig, defaultConfig, getConfig, getYear,
  currentAcademicYear, type ScheduleConfig,
} from "@/data/schedule";

const OUTBOX = "hwnote:outbox:v1";
export type SyncState = "idle" | "syncing" | "error";

let listeners: ((s: SyncState) => void)[] = [];
export function onSyncChange(cb: (s: SyncState) => void) {
  listeners.push(cb);
  return () => { listeners = listeners.filter((l) => l !== cb); };
}
const emit = (s: SyncState) => listeners.forEach((l) => l(s));

type Job = { entry: HomeworkEntry };
function readOutbox(): Job[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(OUTBOX) || "[]"); } catch { return []; }
}
function writeOutbox(j: Job[]) {
  localStorage.setItem(OUTBOX, JSON.stringify(j));
  window.dispatchEvent(new Event("hwnote:update"));
}
export function getOutboxSize() { return readOutbox().length; }

export function queueEntry(entry: HomeworkEntry) {
  const jobs = readOutbox().filter((j) => j.entry.id !== entry.id);
  jobs.push({ entry });
  writeOutbox(jobs);
  if (navigator.onLine) void syncNow();
}

/* ---------------- push ---------------- */
let syncing = false;
export async function syncNow() {
  const me = cachedMe();
  if (syncing || !hasSupabase() || !me || !navigator.onLine) return;
  const jobs = readOutbox();
  if (!jobs.length) return;

  syncing = true; emit("syncing");
  try {
        const c = sb(), year = getYear(), roomId = me.roomId;
    if (!roomId) return;
    const { error } = await c.from("homework").upsert(
      jobs.map((j) => ({
        id: j.entry.id, room_id: roomId, year, date: j.entry.date, subject_id: j.entry.subjectId,
        classwork: j.entry.classwork, homework: j.entry.homework,
        due_date: j.entry.dueDate || null,
        updated_at: new Date(j.entry.updatedAt || Date.now()).toISOString(),
        updated_by: j.entry.updatedBy || me.nickname,
      })), { onConflict: "id" });
    if (error) throw error;

    await c.from("completions").upsert(
      jobs.map((j) => ({
        homework_id: j.entry.id, user_id: me.id,
        done: j.entry.done, updated_at: new Date().toISOString(),
      })), { onConflict: "homework_id,user_id" });

    writeOutbox([]); emit("idle");
  } catch (e) { console.warn("[push]", e); emit("error"); }
  finally { syncing = false; }
}

/* ---------------- pull (ดึงทุกปี ไม่กรอง) ---------------- */
export async function pullAll() {
  const me = cachedMe();
  if (!hasSupabase() || !me || !navigator.onLine) return;
  try {
    const c = sb();
    const [{ data: hw, error }, { data: comps }] = await Promise.all([
      c.from("homework").select("*").order("date", { ascending: false }).limit(3000),
      c.from("completions").select("*").eq("user_id", me.id),
    ]);
    if (error) { console.warn("[pull]", error); return; }
    if (!hw) return;

    const done = new Map<string, boolean>((comps ?? []).map((x) => [x.homework_id, x.done]));
    const local = loadAll();
    const merged: Record<string, HomeworkEntry> = { ...local };

    hw.forEach((r) => {
      const at = new Date(r.updated_at).getTime();
      const cur = local[r.id];
      if (!cur || at > cur.updatedAt) {
        merged[r.id] = {
          id: r.id, date: r.date, subjectId: r.subject_id,
          classwork: r.classwork ?? "", homework: r.homework ?? "",
          dueDate: r.due_date ?? "", done: done.get(r.id) ?? cur?.done ?? false,
          updatedAt: at, updatedBy: r.updated_by ?? "",
        };
      } else {
        merged[r.id] = { ...cur, done: done.get(r.id) ?? cur.done };
      }
    });

    saveAllLocal(merged);
    window.dispatchEvent(new Event("hwnote:update"));
  } catch (e) { console.warn("[pull]", e); }
}

/* ---------------- realtime ---------------- */
export function subscribeAll() {
  if (!hasSupabase() || !cachedMe()) return () => {};
  const c = sb();
  const ch = c.channel("gm02")
    .on("postgres_changes", { event: "*", schema: "public", table: "homework" }, () => void pullAll())
    .on("postgres_changes", { event: "*", schema: "public", table: "schedules" }, () => void bootstrapSchedule())
    .subscribe();
  return () => { void c.removeChannel(ch); };
}

/* ---------------- ตารางเรียน ---------------- */
/** โหลด "ปีล่าสุดบนเซิร์ฟเวอร์" เป็นหลักเสมอ — ทุกเครื่องจะตรงกัน */
export async function bootstrapSchedule() {
  if (!hasSupabase()) return;
  try {
    const { data } = await sb()
      .from("schedules").select("year,config")
      .order("year", { ascending: false }).limit(1).maybeSingle();

    if (data?.config) {
      applyConfig({ ...(data.config as ScheduleConfig), year: data.year as number });
      return;
    }
    // ยังไม่มีตารางเลย → ให้ admin เท่านั้นที่สร้างครั้งแรก
    const me = cachedMe();
    if (me?.isAdmin) {
      const cfg = defaultConfig(currentAcademicYear());
      await saveSchedule(cfg);
    } else {
      applyConfig(defaultConfig(currentAcademicYear()), false);
    }
  } catch (e) { console.warn("[schedule]", e); }
}

export async function fetchSchedule(year?: number) {
  if (!hasSupabase()) return;
  if (year === undefined) return bootstrapSchedule();
  try {
    const { data } = await sb().from("schedules").select("*").eq("year", year).maybeSingle();
    if (data?.config) applyConfig({ ...(data.config as ScheduleConfig), year });
    else applyConfig(defaultConfig(year), false);
  } catch (e) { console.warn("[schedule]", e); }
}

export async function saveSchedule(cfg: ScheduleConfig) {
  const me = cachedMe();
  if (!hasSupabase() || !me) throw new Error("ต้องล็อกอินก่อน");
  if (!me.isAdmin) throw new Error("เฉพาะผู้ดูแลเท่านั้นที่แก้ตารางได้");
  const { error } = await sb().from("schedules").upsert(
    { year: cfg.year, config: cfg, updated_at: new Date().toISOString(), updated_by: me.nickname },
    { onConflict: "year" });
  if (error) throw new Error(error.message);
  applyConfig(cfg);
}

export async function listYears(): Promise<number[]> {
  if (!hasSupabase()) return [getYear()];
  const { data } = await sb().from("schedules").select("year").order("year", { ascending: false });
  const ys = (data ?? []).map((r) => r.year as number);
  return ys.length ? ys : [getYear()];
}

/** เรียกตอนเปิดแอป — โหลดตารางก่อน แล้วค่อยดึงการบ้าน */
export async function bootstrapAll() {
  await bootstrapSchedule();
  await pullAll();
  void syncNow();
}

export { getConfig };
