// Nhắc nhở: uống nước theo giờ cố định và deadline quan trọng sắp tới.
// Hàm thuần (không phụ thuộc giao diện) để dễ kiểm thử.
import type { Task } from "./types";
import { fmtDuration, parseDate, toMin, todayStr } from "./time";

export interface Reminder {
  id: string; // khoá duy nhất, dùng để không nhắc lặp lại
  kind: "water" | "deadline";
  title: string;
  body: string;
  taskId?: string;
  /** các khoá cần đánh dấu "đã nhắc" khi hiện nhắc nhở này */
  marks: string[];
  urgent?: boolean;
}

export interface ReminderInput {
  now: Date;
  tasks: Task[];
  water: boolean;
  waterTimes: string[];
  deadline: boolean;
  notified: Record<string, number>;
  /** hoãn nhắc: khoá -> thời điểm được nhắc lại */
  snoozed?: Record<string, number>;
}

/** Cửa sổ thời gian nhắc uống nước sau mốc giờ (nếu mở web muộn vẫn được nhắc). */
export const WATER_WINDOW_MIN = 60;
/** Mốc nhắc deadline (giờ trước hạn). Task ưu tiên cao: 24h, 3h, 1h; task khác: 1h. */
export const HIGH_THRESHOLDS = [24, 3, 1];
export const NORMAL_THRESHOLDS = [1];

export const deadlineTs = (t: Task) => {
  const d = parseDate(t.deadlineDate);
  const m = toMin(t.deadlineTime || "23:59");
  d.setHours(Math.floor(m / 60), m % 60, 0, 0);
  return d.getTime();
};

const WATER_TIPS = [
  "Một cốc nước (~250ml) giúp bạn tỉnh táo và tập trung hơn.",
  "Uống nước đều đặn giúp giảm mệt mỏi và đau đầu khi học lâu.",
  "Đứng dậy vươn vai, uống một cốc nước rồi quay lại làm tiếp nhé!",
];

export function dueReminders(inp: ReminderInput): Reminder[] {
  const out: Reminder[] = [];
  const now = inp.now.getTime();
  const date = todayStr(inp.now);
  const nowM = inp.now.getHours() * 60 + inp.now.getMinutes();
  const snoozedUntil = (k: string) => inp.snoozed?.[k] ?? 0;

  if (inp.water) {
    inp.waterTimes.forEach((t, i) => {
      const id = `water:${date}:${t}`;
      const m = toMin(t);
      const inWindow = nowM >= m && nowM < m + WATER_WINDOW_MIN;
      if (inWindow && !inp.notified[id] && now >= snoozedUntil(id)) {
        out.push({
          id,
          kind: "water",
          title: `💧 ${t} – Đến giờ uống nước rồi!`,
          body: WATER_TIPS[i % WATER_TIPS.length],
          marks: [id],
        });
      }
    });
  }

  if (inp.deadline) {
    for (const t of inp.tasks) {
      if (t.done) continue;
      const left = deadlineTs(t) - now;
      if (left <= 0) continue;
      const ths = t.priority === "high" ? HIGH_THRESHOLDS : NORMAL_THRESHOLDS;
      // mốc nhỏ nhất đã chạm tới (vd còn 2 tiếng -> mốc 3h)
      const reached = ths.filter((h) => left <= h * 3600000);
      if (!reached.length) continue;
      const h = Math.min(...reached);
      const id = `dl:${t.id}:${h}`;
      if (inp.notified[id] || now < snoozedUntil(id)) continue;
      const leftMin = Math.max(1, Math.round(left / 60000));
      out.push({
        id,
        kind: "deadline",
        taskId: t.id,
        urgent: h <= 1,
        title: `⏰ Còn ${fmtDuration(leftMin)}: ${t.title}`,
        body: `Hạn nộp ${t.deadlineTime} ngày ${t.deadlineDate.split("-").reverse().join("/")}${
          t.priority === "high" ? " · Ưu tiên cao" : ""
        }. Thời gian dự tính cần ${fmtDuration(t.estimate)}.`,
        // đánh dấu cả các mốc lớn hơn để không nhắc lùi lại
        marks: ths.filter((x) => x >= h).map((x) => `dl:${t.id}:${x}`),
      });
    }
  }
  return out;
}
