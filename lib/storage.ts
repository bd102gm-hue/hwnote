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

/** หา entry แบบยืดหยุ่น — กันกรณี id ไม่ตรงเพราะตารางเคยถูกแก้ */
export function findEntry(
  all: Record<string, HomeworkEntry>,
  dateKey: string, slotKey: string, subjectId: string
): HomeworkEntry | undefined {
  const exact = all[`${dateKey}__${slotKey}`];
  if (exact) return exact;

  // slotKey = "day-period-subjectId" → จับคู่จาก วัน + คาบแรก
  const [, period] = slotKey.split("-");
  const byPeriod = Object.values(all).find(
    (e) => e.date === dateKey && e.id.includes(`__${slotKey.split("-")[0]}-${period}-`)
  );
  if (byPeriod) return byPeriod;

  return Object.values(all).find((e) => e.date === dateKey && e.subjectId === subjectId);
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

export type Buckets = {
  overdue: HomeworkEntry[]; urgent: HomeworkEntry[]; week: HomeworkEntry[];
  noDue: HomeworkEntry[]; doneCount: number; total: number;
};

const real = (e: HomeworkEntry) => {
  const h = e.homework?.trim();
  return Boolean(h && h !== "-" && h !== "−");
};

export function bucketize(entries: Record<string, HomeworkEntry>, today: string): Buckets {
  const list = Object.values(entries).filter(real);
  const act = list.filter((e) => !e.done);
  const s = (a: HomeworkEntry, b: HomeworkEntry) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
  return {
    overdue: act.filter((e) => e.dueDate && daysBetween(today, e.dueDate) < 0).sort(s),
    urgent: act.filter((e) => e.dueDate && [0, 1].includes(daysBetween(today, e.dueDate))).sort(s),
    week: act.filter((e) => { if (!e.dueDate) return false; const d = daysBetween(today, e.dueDate); return d > 1 && d <= 7; }).sort(s),
    noDue: act.filter((e) => !e.dueDate).sort((a, b) => b.date.localeCompare(a.date)),
    doneCount: list.filter((e) => e.done).length,
    total: list.length,
  };
}
