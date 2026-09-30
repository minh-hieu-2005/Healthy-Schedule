// Task lặp lại + xuất lịch sang Google Calendar / ứng dụng lịch khác (.ics).
import type { DayPlan, Task } from "./types";
import { addDays, fmtTime } from "./time";
import { uid } from "./demo";

/** Tạo lần tiếp theo của một task lặp lại (hạn và ngày làm dời theo chu kỳ). */
export function nextOccurrence(t: Task, now = Date.now()): Task | null {
  if (!t.repeat || t.repeat === "none") return null;
  const step = t.repeat === "daily" ? 1 : 7;
  return {
    ...t,
    id: uid(),
    deadlineDate: addDays(t.deadlineDate, step),
    planDate: addDays(t.planDate > t.deadlineDate ? t.deadlineDate : t.planDate, step),
    done: false,
    doneDate: undefined,
    nextId: undefined,
    createdAt: now,
    subtasks: t.subtasks?.map((s) => ({ ...s, id: uid(), done: false })),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");
/** "YYYYMMDDTHHMMSS" theo giờ địa phương (không có Z). */
function icsTime(date: string, min: number) {
  const dayShift = Math.floor(min / 1440);
  const d = addDays(date, dayShift).replace(/-/g, "");
  const m = ((min % 1440) + 1440) % 1440;
  return `${d}T${pad(Math.floor(m / 60))}${pad(m % 60)}00`;
}
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (c) => `\\${c}`);

/** File .ics cho các ngày đã xếp lịch. Mặc định chỉ xuất task, có thể kèm mọi hoạt động. */
export function buildIcs(plans: DayPlan[], opts: { all?: boolean } = {}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Smart Life//VI",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:Smart Life",
    "X-WR-TIMEZONE:Asia/Ho_Chi_Minh",
  ];
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  for (const p of plans) {
    for (const b of p.blocks) {
      if (!opts.all && b.cat !== "task") continue;
      if (b.cat === "sleep" && !opts.all) continue;
      lines.push(
        "BEGIN:VEVENT",
        `UID:${p.date}-${b.key.replace(/[^a-z0-9]/gi, "")}@smart-life`,
        `DTSTAMP:${stamp}`,
        `DTSTART;TZID=Asia/Ho_Chi_Minh:${icsTime(p.date, b.start)}`,
        `DTEND;TZID=Asia/Ho_Chi_Minh:${icsTime(p.date, b.end)}`,
        `SUMMARY:${esc(b.title)}`,
        `DESCRIPTION:${esc(`Smart Life · ${fmtTime(b.start)}–${fmtTime(b.end)}`)}`,
        "END:VEVENT",
      );
    }
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/** Link mở Google Calendar với sự kiện điền sẵn. */
export function googleCalendarLink(title: string, date: string, start: number, end: number, details = "") {
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${icsTime(date, start)}/${icsTime(date, end)}`,
    details,
    ctz: "Asia/Ho_Chi_Minh",
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}
