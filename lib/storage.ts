import type { SubjectId } from "@/data/schedule";

export type HomeworkEntry = {
  id: string;
  date: string;
  subjectId: SubjectId;
  classwork: string;
  homework: string;
  dueDate: string;
  done: boolean;
  updatedAt: number;
};

const KEY = "hwnote:entries:v1";

export function loadAll(): Record<string, HomeworkEntry> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

/** เขียน localStorage อย่างเดียว (ใช้ตอน pull จาก server กันลูป) */
export function saveAllLocal(data: Record<string, HomeworkEntry>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(data));
}

/** เขียน local + เข้าคิว sync (ส่ง `changed` เพื่อให้ซิงก์ขึ้นคลาวด์) */
export function saveAll(data: Record<string, HomeworkEntry>, changed?: HomeworkEntry) {
  saveAllLocal(data);
  if (changed) {
    void import("./sync").then((m) => m.queueEntry(changed));
  }
  window.dispatchEvent(new Event("hwnote:update"));
}

/* ---------------- date helpers ---------------- */

export function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function fromDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const TH_MONTH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

export function toThaiDate(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return `${d}/${m}/${y + 543}`;
}

export function toThaiShort(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return `${d} ${TH_MONTH[m - 1]} ${(y + 543) % 100}`;
}

export function daysBetween(a: string, b: string) {
  return Math.round((fromDateKey(b).getTime() - fromDateKey(a).getTime()) / 86400000);
}

export function dueLabel(dueDate: string, today: string) {
  const diff = daysBetween(today, dueDate);
  if (diff < 0) return { text: `เลยมา ${-diff} วัน`, tone: "overdue" as const };
  if (diff === 0) return { text: "ส่งวันนี้", tone: "today" as const };
  if (diff === 1) return { text: "ส่งพรุ่งนี้", tone: "tomorrow" as const };
  if (diff <= 7) return { text: `อีก ${diff} วัน`, tone: "week" as const };
  return { text: toThaiShort(dueDate), tone: "later" as const };
}

/* ---------------- buckets ---------------- */

export type Buckets = {
  overdue: HomeworkEntry[];
  tomorrow: HomeworkEntry[];
  week: HomeworkEntry[];
  doneCount: number;
  total: number;
};

export function bucketize(entries: Record<string, HomeworkEntry>, today: string): Buckets {
  const list = Object.values(entries).filter(
    (e) => e.homework && e.homework.trim() !== "" && e.homework.trim() !== "-"
  );
  const active = list.filter((e) => !e.done && e.dueDate);

  return {
    overdue: active
      .filter((e) => daysBetween(today, e.dueDate) < 0)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    tomorrow: active
      .filter((e) => [0, 1].includes(daysBetween(today, e.dueDate)))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    week: active
      .filter((e) => {
        const d = daysBetween(today, e.dueDate);
        return d > 1 && d <= 7;
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    doneCount: list.filter((e) => e.done).length,
    total: list.length,
  };
}
