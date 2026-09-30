// Động lực quay lại mỗi ngày: chuỗi ngày, huy hiệu, tổng kết tuần.
import type { DayLog, Task } from "./types";
import { addDays, diffDays, todayStr, weekday } from "./time";

/** Giờ ngủ thực tế của đêm kết thúc vào sáng ngày `date` (phút từ 00:00). */
export interface SleepRecord {
  bed: number; // vd 23:30 -> 1410, 00:30 -> 30
  wake: number; // vd 06:30 -> 390
}

export const sleepMinutes = (r: SleepRecord) => {
  const d = r.wake - r.bed;
  return d > 0 ? d : d + 1440;
};

/** Một ngày "thành công": đã tick ít nhất 70% hoạt động. */
export const DAY_OK_RATE = 0.7;
export const dayOk = (l?: DayLog) => !!l && l.blocksTotal > 0 && l.blocksDone / l.blocksTotal >= DAY_OK_RATE;

function runEndingAt(ok: (d: string) => boolean, end: string, maxDays = 400) {
  let n = 0;
  let d = end;
  while (n < maxDays && ok(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

function bestRun(dates: string[], ok: (d: string) => boolean) {
  const sorted = [...dates].sort();
  let best = 0;
  let cur = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    if (ok(d) && (prev === null || diffDays(prev, d) === 1) && cur > 0) cur++;
    else cur = ok(d) ? 1 : 0;
    prev = d;
    best = Math.max(best, cur);
  }
  return best;
}

export interface MotivationInput {
  logs: Record<string, DayLog>;
  sleepActual: Record<string, SleepRecord>;
  water: Record<string, number>;
  waterGoal: number;
  tasks: Task[];
  sleepTarget: number;
  today?: string;
}

export interface Badge {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  progress: number;
  target: number;
  earned: boolean;
}

export function motivation(inp: MotivationInput) {
  const today = inp.today ?? todayStr();
  const okDay = (d: string) => dayOk(inp.logs[d]);
  const sleepOk = (d: string) => {
    const r = inp.sleepActual[d];
    return !!r && sleepMinutes(r) >= inp.sleepTarget - 30;
  };
  // hôm nay chưa xong thì chuỗi tính tới hôm qua (không làm "đứt" chuỗi giữa ngày)
  const streak = okDay(today) ? runEndingAt(okDay, today) : runEndingAt(okDay, addDays(today, -1));
  const sleepStreak = sleepOk(today) ? runEndingAt(sleepOk, today) : runEndingAt(sleepOk, addDays(today, -1));

  const logDates = Object.keys(inp.logs);
  const bestStreak = Math.max(streak, bestRun(logDates, okDay));
  const bestSleep = Math.max(sleepStreak, bestRun(Object.keys(inp.sleepActual), sleepOk));
  const waterDays = Object.values(inp.water).filter((n) => n >= inp.waterGoal).length;
  const tasksDone = inp.tasks.filter((t) => t.done).length;
  const bestBalance = bestRun(logDates, (d) => !!inp.logs[d] && !inp.logs[d].overload);
  const started = Object.values(inp.logs).some((l) => l.blocksDone > 0) ? 1 : 0;

  const b = (id: string, emoji: string, title: string, desc: string, progress: number, target: number): Badge => ({
    id,
    emoji,
    title,
    desc,
    progress: Math.min(progress, target),
    target,
    earned: progress >= target,
  });
  const badges: Badge[] = [
    b("start", "🌱", "Khởi đầu", "Tick hoạt động đầu tiên", started, 1),
    b("streak3", "🔥", "Chuỗi 3 ngày", "3 ngày liên tiếp hoàn thành ≥ 70% lịch", bestStreak, 3),
    b("streak7", "🏆", "Tuần hoàn hảo", "7 ngày liên tiếp hoàn thành ≥ 70% lịch", bestStreak, 7),
    b("sleep5", "😴", "Ngủ đủ giấc", "5 đêm liên tiếp ngủ đủ (theo giờ ngủ thực tế)", bestSleep, 5),
    b("water5", "💧", "Uống đủ nước", `5 ngày uống đủ ${inp.waterGoal} cốc`, waterDays, 5),
    b("tasks10", "🎯", "Chiến binh deadline", "Hoàn thành 10 task", tasksDone, 10),
    b("balance7", "⚖️", "Sống cân bằng", "7 ngày liên tiếp không bị quá tải", bestBalance, 7),
  ];
  return { streak, sleepStreak, bestStreak, badges };
}

export interface WeekRecap {
  from: string;
  to: string;
  days: number;
  avgSleepActual: number | null;
  avgSleepPlanned: number | null;
  taskDoneMin: number;
  completion: number;
  overloadDays: number;
  waterDays: number;
  bestDay: { date: string; rate: number } | null;
}

/** Tổng kết tuần (thứ Hai – Chủ nhật) chứa ngày `anyDate`. */
export function weekRecap(inp: MotivationInput, anyDate: string): WeekRecap {
  const monday = addDays(anyDate, -((weekday(anyDate) + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const logs = days.map((d) => inp.logs[d]).filter((l): l is DayLog => !!l);
  const actual = days.map((d) => inp.sleepActual[d]).filter(Boolean).map((r) => sleepMinutes(r!));
  const bt = logs.reduce((a, l) => a + l.blocksTotal, 0);
  const bd = logs.reduce((a, l) => a + l.blocksDone, 0);
  let bestDay: WeekRecap["bestDay"] = null;
  for (const l of logs) {
    const rate = l.blocksTotal ? l.blocksDone / l.blocksTotal : 0;
    if (!bestDay || rate > bestDay.rate) bestDay = { date: l.date, rate };
  }
  return {
    from: monday,
    to: days[6],
    days: logs.length,
    avgSleepActual: actual.length ? Math.round(actual.reduce((a, b) => a + b, 0) / actual.length) : null,
    avgSleepPlanned: logs.length ? Math.round(logs.reduce((a, l) => a + l.sleepMin, 0) / logs.length) : null,
    taskDoneMin: logs.reduce((a, l) => a + l.taskDoneMin, 0),
    completion: bt ? bd / bt : 0,
    overloadDays: logs.filter((l) => l.overload).length,
    waterDays: days.filter((d) => (inp.water[d] ?? 0) >= inp.waterGoal).length,
    bestDay,
  };
}
