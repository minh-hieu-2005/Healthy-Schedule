// Nhắc nhở: uống nước theo giờ cố định và deadline quan trọng sắp tới.
// Hàm thuần (không phụ thuộc giao diện) để dễ kiểm thử.
import type { Category, Task } from "./types";
import { fmtDuration, fmtTime, parseDate, toMin, todayStr } from "./time";

export interface Reminder {
  id: string; // khoá duy nhất, dùng để không nhắc lặp lại
  kind: "water" | "deadline" | "start" | "morning" | "evening";
  title: string;
  body: string;
  taskId?: string;
  /** các khoá cần đánh dấu "đã nhắc" khi hiện nhắc nhở này */
  marks: string[];
  urgent?: boolean;
}

/** Tóm tắt lịch hôm nay (để nhắc bắt đầu việc, chào buổi sáng, tổng kết tối). */
export interface TodayInfo {
  date: string;
  wake: number;
  bed: number;
  blocks: { key: string; title: string; start: number; end: number; cat: Category; done: boolean; /** không nhắc giờ bắt đầu (task vừa tạo / đang tập trung) */ quiet?: boolean }[];
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
  /** nhắc trước khi task / buổi tập bắt đầu */
  start?: boolean;
  startLead?: number;
  /** lời chào buổi sáng + tổng kết buổi tối */
  daily?: boolean;
  today?: TodayInfo;
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
      const dl = deadlineTs(t);
      // mốc đã chạm tới, và task phải được tạo TRƯỚC mốc đó
      // (vừa tạo task có hạn sau 2 tiếng thì không nhắc ngay – bạn vừa nhập mà)
      const reached = ths.filter((h) => left <= h * 3600000 && t.createdAt <= dl - h * 3600000);
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
  const td = inp.today;
  if (td && td.date === date) {
    // nhắc trước khi task / buổi tập bắt đầu
    if (inp.start) {
      const lead = inp.startLead ?? 5;
      for (const b of td.blocks) {
        if (b.done || b.quiet || (b.cat !== "task" && b.cat !== "exercise")) continue;
        const until = b.start - nowM;
        if (until > lead || until < -2) continue;
        const id = `start:${date}:${b.key}`;
        if (inp.notified[id] || now < snoozedUntil(id)) continue;
        out.push({
          id,
          kind: "start",
          title: until > 0 ? `⏱ ${until} phút nữa: ${b.title}` : `▶️ Đến giờ: ${b.title}`,
          body: `${fmtTime(b.start)} – ${fmtTime(b.end)} (${fmtDuration(b.end - b.start)}). Chuẩn bị nước uống và tắt bớt thông báo mạng xã hội nhé!`,
          marks: [id],
        });
      }
    }
    if (inp.daily) {
      const tasks = td.blocks.filter((b) => b.cat === "task");
      const mid = `morning:${date}`;
      if (nowM >= td.wake && nowM < td.wake + 120 && !inp.notified[mid]) {
        const first = tasks.filter((b) => !b.done).sort((a, b) => a.start - b.start)[0];
        const mins = tasks.reduce((a, b) => a + b.end - b.start, 0);
        out.push({
          id: mid,
          kind: "morning",
          title: "☀️ Chào buổi sáng!",
          body: tasks.length
            ? `Hôm nay có ${tasks.length} phiên làm việc (${fmtDuration(mins)}). Việc đầu tiên lúc ${fmtTime(first?.start ?? tasks[0].start)}: ${first?.title ?? tasks[0].title}.`
            : "Hôm nay chưa có task nào. Tận hưởng một ngày nhẹ nhàng, hoặc thêm việc bạn muốn làm nhé!",
          marks: [mid],
        });
      }
      const eid = `evening:${date}`;
      const eStart = td.bed - 45;
      if (eStart < 1440 && nowM >= eStart && nowM < Math.min(td.bed, 1440) && !inp.notified[eid]) {
        const done = td.blocks.filter((b) => b.done && b.cat !== "sleep").length;
        const total = td.blocks.filter((b) => b.cat !== "sleep").length;
        out.push({
          id: eid,
          kind: "evening",
          title: "🌙 Tổng kết ngày",
          body: `Bạn đã hoàn thành ${done}/${total} hoạt động hôm nay${done === total ? " – tuyệt vời! 🎉" : ""}. Đi ngủ lúc ${fmtTime(td.bed)} để đủ giấc nhé.`,
          marks: [eid],
        });
      }
    }
  }
  return out;
}
