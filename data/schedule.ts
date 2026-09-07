export type SubjectId =
  | "club" | "buddhism" | "english" | "compsci" | "health"
  | "math" | "mathadv" | "trigono" | "geo" | "thai"
  | "science" | "pisa" | "art" | "guidance" | "history"
  | "chinese" | "project";

export type Subject = {
  name: string;
  short: string;
  color: string;
  teacher?: string;
  room?: string;
};

export const SUBJECTS: Record<SubjectId, Subject> = {
  club:     { name: "ชุมนุมวิชาการ",      short: "ชุมนุม",  color: "#a16207" },
  buddhism: { name: "พระพุทธศาสนา",       short: "พระพุทธ", color: "#f97316", teacher: "ครูฐิติพงศ์", room: "5415" },
  english:  { name: "ภาษาอังกฤษ",         short: "อังกฤษ",  color: "#3b82f6", teacher: "ครูสุดา",     room: "5312" },
  compsci:  { name: "วิทยาการคำนวณ",      short: "วิทย.คำ", color: "#a855f7", teacher: "ครูวิทวัส",   room: "คอม 2" },
  health:   { name: "สุขศึกษา",           short: "สุขศึกษา", color: "#10b981", teacher: "ครูอนันต์",   room: "โรงยิม" },
  math:     { name: "คณิตศาสตร์",         short: "คณิตฯ",   color: "#ef4444", teacher: "ครูปิยะ",     room: "5203" },
  mathadv:  { name: "คณิตศาสตร์เพิ่มเติม", short: "คณิตเพิ่ม", color: "#dc2626", teacher: "ครูปิยะ",     room: "5203" },
  trigono:  { name: "ตรีโกณมิติ",         short: "ตรีโก",   color: "#f43f5e", teacher: "ครูปิยะ",     room: "5203" },
  geo:      { name: "ภูมิศาสตร์",         short: "ภูมิฯ",   color: "#0891b2", teacher: "ครูมาลี",     room: "5410" },
  thai:     { name: "ภาษาไทย",            short: "ไทย",     color: "#ec4899", teacher: "ครูวรรณา",    room: "5108" },
  science:  { name: "วิทยาศาสตร์",        short: "วิทย์",   color: "#22c55e", teacher: "ครูนพดล",     room: "แล็บ 1" },
  pisa:     { name: "PISA",               short: "PISA",    color: "#64748b" },
  art:      { name: "ศิลปะ",              short: "ศิลปะ",   color: "#8b5cf6", teacher: "ครูจิรา",     room: "ศิลป์ 1" },
  guidance: { name: "แนะแนว",             short: "แนะแนว",  color: "#14b8a6", room: "ห้องแนะแนว" },
  history:  { name: "ประวัติศาสตร์",      short: "ประวัติ", color: "#b45309", teacher: "ครูมาลี",     room: "5410" },
  chinese:  { name: "ภาษาจีน",            short: "จีน",     color: "#e11d48", teacher: "ครูหลี่",     room: "5320" },
  project:  { name: "โครงงาน",            short: "โครงงาน", color: "#0ea5e9" },
};

/** เวลาเรียนแต่ละคาบ (คาบ 4 ต่อด้วยพักเที่ยง) */
export const PERIODS: Record<number, { start: string; end: string }> = {
  1: { start: "08.15", end: "09.05" },
  2: { start: "09.05", end: "09.55" },
  3: { start: "09.55", end: "10.45" },
  4: { start: "10.45", end: "11.35" },
  5: { start: "11.50", end: "12.40" },
  6: { start: "12.40", end: "13.30" },
  7: { start: "13.30", end: "14.20" },
  8: { start: "14.20", end: "15.10" },
};

export const DAY_NAMES = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
export const DAY_SHORT = ["", "จ.", "อ.", "พ.", "พฤ.", "ศ.", ""];
export const ALL_DAYS = [1, 2, 3, 4, 5] as const;

/** ตารางเรียน: day (1=จันทร์) → period → วิชา */
const TIMETABLE: Record<number, Record<number, SubjectId>> = {
  1: { 1: "trigono", 2: "trigono", 3: "geo", 5: "math", 6: "thai", 7: "science", 8: "english" },
  2: { 1: "science", 2: "science", 3: "english", 5: "geo", 6: "math", 7: "art", 8: "history" },
  3: { 1: "pisa", 2: "art", 3: "math", 5: "guidance", 6: "science", 7: "thai", 8: "chinese" },
  4: { 1: "club", 2: "buddhism", 3: "english", 4: "health", 5: "compsci", 6: "compsci", 7: "math", 8: "thai" },
  5: { 1: "math", 2: "mathadv", 3: "history", 5: "chinese", 6: "project", 7: "project", 8: "health" },
};

export type DaySlot = {
  key: string;
  subjectId: SubjectId;
  periods: number[];
  timeLabel: string;
};

/** วิชาเดียวกัน (เทียบชื่อ+ห้อง) เพื่อรวมคาบติดกัน */
function sameSubject(a: SubjectId, b: SubjectId) {
  return SUBJECTS[a].name === SUBJECTS[b].name && SUBJECTS[a].room === SUBJECTS[b].room;
}

/** ดึงวิชาของวันนั้น พร้อมรวมคาบติดกันอัตโนมัติ */
export function getSubjectsForDay(dayIndex: number): DaySlot[] {
  const day = TIMETABLE[dayIndex];
  if (!day) return [];

  const out: DaySlot[] = [];
  const nums = Object.keys(day).map(Number).sort((a, b) => a - b);

  for (const period of nums) {
    const id = day[period];
    const last = out[out.length - 1];

    if (last && sameSubject(last.subjectId, id) && last.periods[last.periods.length - 1] === period - 1) {
      last.periods.push(period);
      last.timeLabel = `${PERIODS[last.periods[0]].start}–${PERIODS[period].end}`;
    } else {
      out.push({
        key: `${dayIndex}-${period}-${id}`,
        subjectId: id,
        periods: [period],
        timeLabel: `${PERIODS[period].start}–${PERIODS[period].end}`,
      });
    }
  }
  return out;
}

/** ตารางทั้งสัปดาห์ ใช้ในหน้า /schedule */
export function getWeekGrid() {
  return ALL_DAYS.map((d) => ({ day: d as number, slots: getSubjectsForDay(d) }));
}
