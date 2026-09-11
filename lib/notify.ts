import { loadAll, bucketize, toDateKey, toThaiShort, type HomeworkEntry } from "./storage";
import { SUBJECTS } from "@/data/schedule";

const SEEN = "hwnote:notified:v1";

export function notifyState(): "unsupported" | "default" | "granted" | "denied" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as "default" | "granted" | "denied";
}

export async function askPermission() {
  if (notifyState() === "unsupported") return "unsupported";
  const r = await Notification.requestPermission();
  if (r === "granted") void checkDue(true);
  return r;
}

function seen(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(SEEN) || "{}"); } catch { return {}; }
}
function markSeen(id: string, day: string) {
  const s = seen(); s[id] = day;
  localStorage.setItem(SEEN, JSON.stringify(s));
}

const nameOf = (e: HomeworkEntry) => SUBJECTS[e.subjectId]?.name ?? "การบ้าน";

/** งานที่ต้องเตือน = เลยกำหนด + ส่งวันนี้/พรุ่งนี้ */
export function urgentList(): HomeworkEntry[] {
  const today = toDateKey(new Date());
  const b = bucketize(loadAll(), today);
  return [...b.overdue, ...b.urgent];
}

/** ยิงแจ้งเตือน (วันละครั้งต่อรายการ) */
export async function checkDue(force = false) {
  if (notifyState() !== "granted") return;
  const today = toDateKey(new Date());
  const s = seen();
  const list = urgentList().filter((e) => force || s[e.id] !== today);
  if (!list.length) return;

  const reg = await navigator.serviceWorker?.getRegistration();

  if (list.length === 1) {
    const e = list[0];
    fire(reg, `⏰ ${nameOf(e)}`, `${e.homework} · ส่ง ${toThaiShort(e.dueDate)}`);
  } else {
    fire(reg, `⏰ มีงานค้าง ${list.length} ชิ้น`,
      list.slice(0, 3).map((e) => `• ${nameOf(e)}`).join("\n"));
  }
  list.forEach((e) => markSeen(e.id, today));
}

function fire(reg: ServiceWorkerRegistration | undefined, title: string, body: string) {
  const opts: NotificationOptions = {
    body, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", tag: "hwnote-due",
  };
  try {
    if (reg) void reg.showNotification(title, opts);
    else new Notification(title, opts);
  } catch (e) { console.warn("[notify]", e); }
}
