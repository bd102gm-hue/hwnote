export type Subject = { name: string; short: string; color: string; teacher?: string; room?: string };
export type Timetable = Record<string, Record<string, string>>;
export type ScheduleConfig = {
  year: number;
  roomName?: string;
  subjects: Record<string, Subject>;
  timetable: Timetable;
  duty: Record<string, string>;
};

export const PERIODS: Record<number, { start: string; end: string }> = {
  0:{start:"08.00",end:"08.15"},1:{start:"08.15",end:"09.05"},2:{start:"09.05",end:"09.55"},
  3:{start:"10.10",end:"11.00"},4:{start:"11.00",end:"11.50"},5:{start:"11.50",end:"12.40"},
  6:{start:"12.40",end:"13.30"},7:{start:"13.30",end:"14.20"},8:{start:"14.20",end:"15.10"},
  9:{start:"15.10",end:"16.00"},10:{start:"16.00",end:"16.50"},11:{start:"16.50",end:"17.40"},
};
export const LUNCH_PERIOD = 4;
export const DAY_NAMES = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"];
export const ALL_DAYS = [1, 2, 3, 4, 5] as const;

export function currentAcademicYear() {
  const d = new Date();
  const be = d.getFullYear() + 543;
  return d.getMonth() < 3 ? be - 1 : be;
}

const DEFAULT_SUBJECTS: Record<string, Subject> = {
  homeroom:{name:"โฮมรูม",short:"โฮมรูม",color:"#94a3b8"},
  trigono:{name:"ตรีโกณมิติ",short:"ตรีโก",color:"#f43f5e",teacher:"ครูสุนิสา",room:"5415"},
  geo:{name:"ภูมิศาสตร์",short:"ภูมิฯ",color:"#0891b2",teacher:"ครูสุกัญญา",room:"5415"},
  math:{name:"คณิตศาสตร์",short:"คณิตฯ",color:"#ef4444",teacher:"ครูรัตนา",room:"5415"},
  thai:{name:"ภาษาไทย",short:"ไทย",color:"#ec4899",teacher:"ครูฐิติพงศ์",room:"5415"},
  englishls:{name:"อังกฤษฟัง-พูด",short:"อ.ฟัง-พูด",color:"#2563eb",teacher:"ครูธนาดา",room:"5418"},
  englishlsB:{name:"อังกฤษฟัง-พูด",short:"อ.ฟัง-พูด",color:"#2563eb",teacher:"ครูธนาดา",room:"5415"},
  scouts:{name:"ลูกเสือ/เนตรนารี",short:"ลูกเสือ",color:"#65a30d"},
  science:{name:"วิทยาศาสตร์",short:"วิทย์",color:"#22c55e",teacher:"ครูปรานวดี",room:"4202"},
  scienceB:{name:"วิทยาศาสตร์",short:"วิทย์",color:"#22c55e",teacher:"ครูปรานวดี",room:"5415"},
  english:{name:"ภาษาอังกฤษ",short:"อังกฤษ",color:"#3b82f6",teacher:"ครูเมทินี",room:"5415"},
  career:{name:"การงานอาชีพ",short:"การงาน",color:"#d97706",teacher:"ครูวศินี",room:"7205"},
  pisa:{name:"ประชุมระดับ / PISA",short:"PISA",color:"#64748b"},
  art:{name:"ศิลปะ",short:"ศิลปะ",color:"#8b5cf6",teacher:"ครูธนาพิพัฒน์",room:"4109"},
  guidance:{name:"แนะแนว",short:"แนะแนว",color:"#14b8a6",teacher:"ครูปิยาภรณ์",room:"5415"},
  mathadv:{name:"คณิตศาสตร์เสริม",short:"คณิตเสริม",color:"#dc2626",teacher:"ครูโกรบ",room:"5415"},
  chinese:{name:"ภาษาจีน",short:"จีน",color:"#e11d48",teacher:"ครูวิชญ์ / ครูฐิตา",room:"ห้องโสตฯ"},
  club:{name:"ชุมนุมวิชาการ",short:"ชุมนุม",color:"#a16207"},
  buddhism:{name:"พระพุทธศาสนา",short:"พระพุทธ",color:"#f97316",teacher:"ครูสุกัญญา",room:"5415"},
  compsci:{name:"วิทยาการคำนวณ",short:"วิทย.คำ",color:"#a855f7",teacher:"ครูคอม A",room:"COM 1"},
  health:{name:"สุขศึกษา",short:"สุขศึกษา",color:"#10b981",teacher:"ครูบุษบา",room:"5415"},
  volunteer:{name:"จิตอาสา",short:"จิตอาสา",color:"#0d9488"},
  history:{name:"ประวัติศาสตร์",short:"ประวัติ",color:"#b45309",teacher:"ครูกรภัทร์",room:"5415"},
  mathproject:{name:"โครงงานคณิตศาสตร์",short:"โครงงาน",color:"#0ea5e9",teacher:"ครูมัลลิกา",room:"5415"},
  pe:{name:"พลศึกษา",short:"พละ",color:"#84cc16",teacher:"ครูอภิรักษ์",room:"ลานสุคนธ์"},
  anticorrupt:{name:"ป้องกันทุจริต",short:"ป้องกันฯ",color:"#78716c",teacher:"ครูกรภัทร์",room:"5415"},
};

const DEFAULT_TIMETABLE: Timetable = {
  "1":{"0":"homeroom","1":"trigono","2":"trigono","3":"geo","5":"math","6":"chinese","7":"englishls","8":"scouts"},
  "2":{"0":"homeroom","1":"science","2":"science","3":"english","5":"geo","6":"math","7":"thai","8":"career","9":"career"},
  "3":{"0":"homeroom","1":"pisa","2":"art","3":"math","5":"guidance","6":"scienceB","7":"mathadv","8":"thai","9":"chinese"},
  "4":{"0":"homeroom","1":"club","2":"buddhism","3":"english","5":"compsci","6":"compsci","7":"englishlsB","8":"health","9":"math","10":"volunteer"},
  "5":{"0":"homeroom","1":"math","2":"mathadv","3":"history","5":"thai","6":"mathproject","7":"mathproject","8":"art","9":"pe","10":"anticorrupt"},
};

export function defaultConfig(year = currentAcademicYear()): ScheduleConfig {
  return {
    year,
    roomName: `GM02-${year}`,
    subjects: JSON.parse(JSON.stringify(DEFAULT_SUBJECTS)),
    timetable: JSON.parse(JSON.stringify(DEFAULT_TIMETABLE)),
    duty: { "1": "", "2": "", "3": "", "4": "", "5": "" },
  };
}

const KEY = "hwnote:schedule:v3";

export const SUBJECTS: Record<string, Subject> = {};
let _cfg: ScheduleConfig = defaultConfig();

function hydrate(cfg: ScheduleConfig) {
  _cfg = cfg;
  Object.keys(SUBJECTS).forEach((k) => delete SUBJECTS[k]);
  Object.assign(SUBJECTS, cfg.subjects || {});
}
hydrate(defaultConfig());

if (typeof window !== "undefined") {
  try { const raw = localStorage.getItem(KEY); if (raw) hydrate(JSON.parse(raw)); } catch {}
}

export function getConfig(): ScheduleConfig { return JSON.parse(JSON.stringify(_cfg)); }
export function applyConfig(cfg: ScheduleConfig, persist = true) {
  hydrate(cfg);
  if (persist && typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(cfg));
    window.dispatchEvent(new Event("hwnote:update"));
  }
}
export function getYear() { return _cfg.year; }
export function getDuty(dayIndex: number) { return _cfg.duty?.[String(dayIndex)] || ""; }

/* ---------- ข้อมูลห้อง (ตั้งจาก auth) ---------- */
let _room = { code: "", school: "", className: "" };

export function setRoomInfo(r: { code?: string; school?: string; className?: string }) {
  _room = { ..._room, ...r };
}
export function getRoomInfo() { return { ..._room }; }
export function roomName() {
  return _room.className?.trim() || "ห้องเรียน";
}
export function schoolName() { return _room.school?.trim() || ""; }
export function roomCode() { return _room.code || ""; }
export function fullRoomLabel() {
  const s = schoolName();
  return s ? `${s} · ${roomName()}` : roomName();
}


export type DaySlot = { key: string; subjectId: string; periods: number[]; timeLabel: string };

function same(a: string, b: string) {
  const x = SUBJECTS[a], y = SUBJECTS[b];
  return !!x && !!y && x.name === y.name && x.room === y.room;
}

export function getSubjectsForDay(dayIndex: number): DaySlot[] {
  const day = _cfg.timetable?.[String(dayIndex)];
  if (!day) return [];
  const out: DaySlot[] = [];
  Object.keys(day).map(Number).sort((a, b) => a - b).forEach((p) => {
    const id = day[String(p)];
    if (!id || !SUBJECTS[id]) return;
    const last = out[out.length - 1];
    if (last && same(last.subjectId, id) && last.periods[last.periods.length - 1] === p - 1) {
      last.periods.push(p);
      last.timeLabel = `${PERIODS[last.periods[0]].start}–${PERIODS[p].end}`;
    } else {
      out.push({ key: `${dayIndex}-${p}-${id}`, subjectId: id, periods: [p], timeLabel: `${PERIODS[p].start}–${PERIODS[p].end}` });
    }
  });
  return out;
}

export function getWeekGrid() {
  return ALL_DAYS.map((d) => ({ day: d as number, slots: getSubjectsForDay(d) }));
}
