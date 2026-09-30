// Dự đoán khung giờ làm việc năng suất cho ngày hôm sau,
// dựa trên dữ liệu các ngày trước (tỉ lệ hoàn thành task theo từng giờ).
import type { Block, DayLog, DayPlan, Prediction, Task } from "./types";
import { diffDays, weekday } from "./time";

const WINDOW = 2; // độ dài khung giờ năng suất (tiếng)
const LOOKBACK = 28; // xét tối đa 28 ngày gần nhất

export function predict(logs: Record<string, DayLog>, targetDate: string): Prediction {
  const past = Object.values(logs)
    .filter((l) => l.date < targetDate && diffDays(l.date, targetDate) <= LOOKBACK)
    .sort((a, b) => a.date.localeCompare(b.date));
  const withTasks = past.filter((l) => l.taskPlannedMin > 0);

  const planned = Array(24).fill(0);
  const done = Array(24).fill(0);
  for (const l of withTasks) {
    // ngày gần đây có trọng số cao hơn
    const w = 1 + Math.max(0, 14 - diffDays(l.date, targetDate)) / 14;
    for (let h = 0; h < 24; h++) {
      planned[h] += (l.hourPlanned[h] ?? 0) * w;
      done[h] += (l.hourDone[h] ?? 0) * w;
    }
  }
  const hourRate = [];
  for (let h = 5; h < 24; h++) {
    hourRate.push({ hour: h, rate: planned[h] >= 20 ? done[h] / planned[h] : 0, planned: planned[h] });
  }

  // khung WINDOW tiếng liên tiếp có tỉ lệ hoàn thành cao nhất
  let best = -1;
  let peakStart: number | null = null;
  for (let h = 5; h <= 24 - WINDOW; h++) {
    let ok = true;
    let p = 0;
    let d = 0;
    for (let k = 0; k < WINDOW; k++) {
      if (planned[h + k] < 20) ok = false;
      p += planned[h + k];
      d += done[h + k];
    }
    if (!ok) continue;
    // làm mượt: ưu tiên khung có nhiều dữ liệu hơn
    const score = (d + 1) / (p + 2) + Math.min(p, 600) / 60000;
    if (score > best) {
      best = score;
      peakStart = h;
    }
  }

  // số phút làm việc tập trung dự kiến: trung bình có trọng số 7 ngày gần nhất
  const wdTarget = weekday(targetDate);
  const recent = past.slice(-7);
  let wSum = 0;
  let focus = 0;
  for (const l of recent) {
    const w = weekday(l.date) === wdTarget ? 2 : 1;
    wSum += w;
    focus += l.taskDoneMin * w;
  }
  const expectedFocusMin = wSum ? Math.round(focus / wSum / 5) * 5 : 0;

  const bt = recent.reduce((a, l) => a + l.blocksTotal, 0);
  const bd = recent.reduce((a, l) => a + l.blocksDone, 0);
  const completionRate = bt ? bd / bt : 0;
  const enoughData = withTasks.length >= 3 && peakStart !== null;

  let tip = "Hãy dùng Smart Life thêm vài ngày và tick checklist để hệ thống học thói quen của bạn.";
  if (enoughData) {
    const rate = Math.round(((done[peakStart!] + done[peakStart! + 1]) / (planned[peakStart!] + planned[peakStart! + 1])) * 100);
    tip = `Bạn hoàn thành ${rate}% việc được xếp vào ${peakStart}:00–${peakStart! + WINDOW}:00. Task ưu tiên cao sẽ được ưu tiên xếp vào khung giờ này.`;
  }

  return {
    enoughData,
    sampleDays: withTasks.length,
    peakStart: enoughData ? peakStart : null,
    peakEnd: enoughData ? peakStart! + WINDOW : null,
    hourRate,
    expectedFocusMin,
    completionRate,
    tip,
  };
}

/** Tóm tắt 1 ngày từ lịch + checklist để lưu vào lịch sử. */
export function summarize(plan: DayPlan, checked: Set<string>, tasks: Task[]): DayLog {
  const minutes: DayLog["minutes"] = {};
  const hourPlanned = Array(24).fill(0);
  const hourDone = Array(24).fill(0);
  let blocksDone = 0;
  let taskPlannedMin = 0;
  let taskDoneMin = 0;
  const isDone = (b: Block) =>
    checked.has(b.key) || (!!b.taskId && !!tasks.find((t) => t.id === b.taskId && t.done && t.doneDate === plan.date));
  for (const b of plan.blocks) {
    const len = b.end - b.start;
    minutes[b.cat] = (minutes[b.cat] ?? 0) + len;
    const d = isDone(b);
    if (d) blocksDone++;
    if (b.cat === "task") {
      taskPlannedMin += len;
      if (d) taskDoneMin += len;
      for (let m = b.start; m < b.end; m += 5) {
        const h = Math.floor((m % 1440) / 60);
        hourPlanned[h] += 5;
        if (d) hourDone[h] += 5;
      }
    }
  }
  return {
    date: plan.date,
    level: plan.level,
    overload: plan.overload,
    sleepMin: plan.sleepMin,
    minutes,
    blocksTotal: plan.blocks.length,
    blocksDone,
    taskPlannedMin,
    taskDoneMin,
    hourPlanned,
    hourDone,
  };
}
