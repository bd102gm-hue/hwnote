export type HomeworkEntry = {
  id: string; date: string; subjectId: string;
  classwork: string; homework: string; dueDate: string;
  done: boolean; updatedAt: number; updatedBy?: string;
};

const KEY = "hwnote:entries:v1";

export function loadAll(): Record<string, HomeworkEntry> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
export function saveAllLocal(d: Record<string, HomeworkEntry>) {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(d));
}
export function saveAll(d: Record<string, HomeworkEntry>, changed?: HomeworkEntry) {
  saveAllLocal(d);
  if (changed) void import("./sync").then((m) => m.queueEntry(changed));
  window.dispatchEvent(new Event("hwnote:update"));
}

export function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
export function fromDateKey(k: string) {
  const [y,m,d] = k.split("-").map(Number); return new Date(y, m-1, d);
}
const TH_M = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
export function toThaiDate(k: string) { const [y,m,d]=k.split("-").map(Number); return `${d}/${m}/${y+543}`; }
export function toThaiShort(k: string) { const [y,m,d]=k.split("-").map(Number); return `${d} ${TH_M[m-1]} ${(y+543)%100}`; }
export function daysBetween(a: string, b: string) {
  return Math.round((fromDateKey(b).getTime() - fromDateKey(a).getTime()) / 86400000);
}
export function dueLabel(due: string, today: string) {
  const n = daysBetween(today, due);
  if (n < 0) return { text: `เลยมา ${-n} วัน`, tone: "overdue" as const };
  if (n === 0) return { text: "ส่งวันนี้", tone: "today" as const };
  if (n === 1) return { text: "ส่งพรุ่งนี้", tone: "tomorrow" as const };
  if (n <= 7) return { text: `อีก ${n} วัน`, tone: "week" as const };
  return { text: toThaiShort(due), tone: "later" as const };
}

export type Buckets = { overdue: HomeworkEntry[]; tomorrow: HomeworkEntry[]; week: HomeworkEntry[]; doneCount: number; total: number };

export function bucketize(entries: Record<string, HomeworkEntry>, today: string): Buckets {
  const list = Object.values(entries).filter((e) => e.homework?.trim() && e.homework.trim() !== "-");
  const act = list.filter((e) => !e.done && e.dueDate);
  const s = (a: HomeworkEntry, b: HomeworkEntry) => a.dueDate.localeCompare(b.dueDate);
  return {
    overdue: act.filter((e) => daysBetween(today, e.dueDate) < 0).sort(s),
    tomorrow: act.filter((e) => [0,1].includes(daysBetween(today, e.dueDate))).sort(s),
    week: act.filter((e) => { const d = daysBetween(today, e.dueDate); return d > 1 && d <= 7; }).sort(s),
    doneCount: list.filter((e) => e.done).length,
    total: list.length,
  };
}
