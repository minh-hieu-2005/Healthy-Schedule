// =====================================================================
// Smart Life — thuật toán tự động xếp thời gian biểu lành mạnh
// ---------------------------------------------------------------------
// Nguyên tắc: sức khoẻ được xếp TRƯỚC (ngủ, ăn, tập), sau đó mới lấp các
// task/deadline vào thời gian rảnh. Khi không đủ chỗ, hệ thống tăng dần
// "mức cân bằng":
//
//   0. Bình thường   – đủ ngủ, ăn, tập, có nấu ăn + giải trí
//   1. Cân bằng      – bỏ bớt hoạt động optional (nấu ăn, giải trí)
//   2. Quá tải       – rút ngắn bữa ăn, tập nhẹ, ngủ ít hơn 1 tiếng
//   3. Quá tải nặng  – ngủ còn 6 tiếng (mức tối thiểu) -> cảnh báo thiếu ngủ
//
// Quy tắc bảo vệ: mỗi 2 ngày chỉ được quá tải 1 lần (OVERLOAD_GAP_DAYS).
// Nếu vẫn không đủ thời gian, các task CHƯA đến hạn sẽ được dời sang
// ngày hôm sau (task có hạn xa nhất / ưu tiên thấp nhất bị dời trước).
// =====================================================================

import type { Block, DayLog, DayPlan, PlanWarning, Profile, Task } from "./types";
import { addDays, diffDays, fmtDuration, fmtHours, round5, toMin, weekday } from "./time";

/** Khoảng cách tối thiểu (ngày) giữa 2 lần quá tải. */
export const OVERLOAD_GAP_DAYS = 2;
/** Số phút ngủ tối thiểu (6 tiếng) — không bao giờ xếp ít hơn. */
export const SLEEP_FLOOR = 360;
/** Một phiên làm task dài tối đa 90 phút rồi nghỉ. */
export const MAX_CHUNK = 90;
const MIN_CHUNK = 15;

interface Level {
  id: number;
  name: string;
  sleep: (target: number) => number;
  meal: number; // hệ số thời lượng bữa ăn
  ex: number; // hệ số thời lượng tập
  cook: boolean;
  fun: boolean;
  breakMin: number; // nghỉ giữa các phiên làm việc
  overload: boolean;
}

export const LEVELS: Level[] = [
  { id: 0, name: "Bình thường", sleep: (t) => t, meal: 1, ex: 1, cook: true, fun: true, breakMin: 10, overload: false },
  { id: 1, name: "Cân bằng", sleep: (t) => t, meal: 1, ex: 1, cook: false, fun: false, breakMin: 5, overload: false },
  { id: 2, name: "Quá tải", sleep: (t) => Math.min(t, Math.max(SLEEP_FLOOR, t - 60)), meal: 0.75, ex: 0.5, cook: false, fun: false, breakMin: 10, overload: true },
  { id: 3, name: "Quá tải", sleep: (t) => Math.min(t, SLEEP_FLOOR), meal: 0.6, ex: 0.3, cook: false, fun: false, breakMin: 5, overload: true },
];

export const MEAL_LABEL: Record<string, string> = {
  breakfast: "Bữa sáng",
  lunch: "Bữa trưa",
  dinner: "Bữa tối",
};

export interface PlanInput {
  date: string;
  profile: Profile;
  /** Các task (chưa xong) cần xếp trong ngày này. */
  tasks: Task[];
  /** Có được phép quá tải hôm nay không (quy tắc 2 ngày). */
  overloadAllowed: boolean;
  /** Chỉ xếp task sau thời điểm này (dùng cho "hôm nay"). */
  notBefore?: number;
  /** Các block đã hoàn thành — giữ nguyên khi xếp lại lịch. */
  locked?: Block[];
  /** Khung giờ năng suất dự đoán (giờ bắt đầu, giờ kết thúc). */
  peak?: { start: number; end: number } | null;
}

interface Interval {
  s: number;
  e: number;
  peak?: boolean;
}

interface BuildResult {
  blocks: Block[];
  unplaced: Map<string, number>;
  sleepMin: number;
  wake: number;
  bed: number;
  cookDropped: boolean;
  exShortened: boolean;
  funDropped: boolean;
  mealShortened: boolean;
  freeMin: number;
  notes: PlanWarning[];
}

const overlaps = (a: { start: number; end: number }, s: number, e: number) =>
  a.start < e && s < a.end;

const taskSortKey = (t: Task) => `${t.deadlineDate}T${t.deadlineTime}`;
const PRIO = { high: 0, normal: 1, low: 2 } as const;

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const k = taskSortKey(a).localeCompare(taskSortKey(b));
    if (k !== 0) return k;
    return PRIO[a.priority] - PRIO[b.priority];
  });
}

/** Xây lịch cho 1 ngày ở 1 mức cân bằng cụ thể. */
function build(input: PlanInput, level: Level, tasks: Task[]): BuildResult {
  const { profile, date } = input;
  const wd = weekday(date);
  const wake = toMin(profile.wakeTime);
  const sleepMin = level.sleep(profile.sleepTarget);
  const bed = wake + 1440 - sleepMin;
  const occ: Block[] = [];
  const notes: PlanWarning[] = [];
  const locked = input.locked ?? [];
  const lockedKeys = new Set(locked.map((b) => b.key));
  const lockedTaskMin = new Map<string, number>();
  for (const b of locked) {
    occ.push(b);
    if (b.taskId && !b.missed) lockedTaskMin.set(b.taskId, (lockedTaskMin.get(b.taskId) ?? 0) + (b.end - b.start));
  }
  const occupying = () => occ;

  const isFree = (s: number, e: number, lo = wake, hi = bed) =>
    s >= lo && e <= hi && !occupying().some((b) => overlaps(b, s, e));

  const findSlot = (pref: number, dur: number, range = 240): number | null => {
    for (let off = 0; off <= range; off += 5) {
      if (isFree(pref + off, pref + off + dur)) return pref + off;
      if (off > 0 && isFree(pref - off, pref - off + dur)) return pref - off;
    }
    return null;
  };

  const add = (b: Block) => {
    if (!lockedKeys.has(b.key)) occ.push(b);
  };

  // 1) Lịch cố định: học / làm + di chuyển
  const todaysCommit = profile.commitments.filter((c) => c.days.includes(wd));
  for (const c of todaysCommit) {
    const s = toMin(c.start);
    const e = toMin(c.end);
    if (e <= s) continue;
    if (s < wake) {
      notes.push({
        kind: "warning",
        title: `"${c.label}" bắt đầu trước giờ bạn thức dậy`,
        detail: "Hãy kiểm tra lại giờ thức dậy trong phần Cài đặt.",
      });
    }
    add({ key: `commit:${c.id}`, cat: c.kind, title: c.label, start: s, end: e });
  }
  if (profile.commute.enabled && profile.commute.minutes > 0) {
    const m = profile.commute.minutes;
    for (const c of todaysCommit) {
      const s = toMin(c.start);
      const e = toMin(c.end);
      const place = c.kind === "school" ? "trường" : "chỗ làm";
      const kin = `commute:${c.id}:in`;
      const kout = `commute:${c.id}:out`;
      if (!lockedKeys.has(kin) && !occupying().some((b) => overlaps(b, s - m, s)))
        add({ key: kin, cat: "commute", title: `Di chuyển đến ${place}`, start: s - m, end: s });
      if (!lockedKeys.has(kout) && !occupying().some((b) => overlaps(b, e, e + m)))
        add({ key: kout, cat: "commute", title: "Di chuyển về", start: e, end: e + m });
    }
  }

  // 2) Bữa ăn (+ nấu ăn nếu có)
  let cookDropped = false;
  let mealShortened = false;
  for (const meal of profile.meals) {
    if (!meal.enabled) continue;
    const mKey = `meal:${meal.id}`;
    if (lockedKeys.has(mKey)) continue;
    const dur = Math.max(15, round5(meal.duration * level.meal));
    const shortened = dur < meal.duration;
    if (shortened) mealShortened = true;
    const wantCook = profile.cooking.enabled && profile.cooking.minutes > 0 && meal.cook;
    const cookMin = wantCook && level.cook ? profile.cooking.minutes : 0;
    if (wantCook && !level.cook) cookDropped = true;
    let start = findSlot(toMin(meal.time) - cookMin, cookMin + dur);
    let cook = cookMin;
    if (start === null && cookMin > 0) {
      cookDropped = true;
      cook = 0;
      start = findSlot(toMin(meal.time), dur);
    }
    if (start === null) {
      notes.push({ kind: "warning", title: `Không tìm được giờ trống cho ${MEAL_LABEL[meal.id].toLowerCase()}` });
      continue;
    }
    if (cook > 0)
      add({ key: `cook:${meal.id}`, cat: "cooking", title: "Nấu ăn", start, end: start + cook });
    add({
      key: mKey,
      cat: "meal",
      title: MEAL_LABEL[meal.id],
      start: start + cook,
      end: start + cook + dur,
      shortened,
      note: shortened ? `Rút gọn còn ${dur} phút` : undefined,
    });
  }

  // 3) Tập luyện
  let exShortened = false;
  const ex = profile.exercise;
  if (ex.enabled && ex.days.includes(wd) && !lockedKeys.has("exercise")) {
    const dur = Math.max(15, round5(ex.duration * level.ex));
    exShortened = dur < ex.duration;
    const start = findSlot(toMin(ex.time), dur, 300);
    if (start !== null) {
      add({
        key: "exercise",
        cat: "exercise",
        title: exShortened ? "Cardio nhẹ nhàng" : ex.kind || "Tập luyện",
        start,
        end: start + dur,
        shortened: exShortened,
        note: exShortened ? `Thay cho ${ex.kind.toLowerCase()} ${ex.duration} phút` : undefined,
      });
    } else {
      notes.push({ kind: "warning", title: "Không còn chỗ trống để tập luyện hôm nay" });
    }
  }

  // 4) Giải trí (được giữ chỗ ở mức bình thường)
  const fun = profile.fun;
  let funPlaced = lockedKeys.has("fun");
  if (fun.enabled && fun.minutes > 0 && level.fun && !funPlaced) {
    const start = findSlot(toMin(fun.time), fun.minutes, 180);
    if (start !== null) {
      add({ key: "fun", cat: "fun", title: fun.label || "Giải trí", start, end: start + fun.minutes });
      funPlaced = true;
    }
  }

  // 5) Task: lấp vào thời gian rảnh
  // 30 phút đầu sau khi thức dậy dành cho vệ sinh cá nhân, không xếp task
  const lo = Math.max(wake + 30, input.notBefore ?? wake);
  const freeIntervals = (): Interval[] => {
    const busy = occupying()
      .map((b) => ({ s: Math.max(b.start, lo), e: Math.min(b.end, bed) }))
      .filter((b) => b.e > b.s)
      .sort((a, b) => a.s - b.s);
    const out: Interval[] = [];
    let cur = lo;
    for (const b of busy) {
      if (b.s > cur) out.push({ s: cur, e: b.s });
      cur = Math.max(cur, b.e);
    }
    if (bed > cur) out.push({ s: cur, e: bed });
    // tách theo khung giờ năng suất để task ưu tiên cao được xếp vào đó
    if (input.peak) {
      const ps = input.peak.start * 60;
      const pe = input.peak.end * 60;
      const split: Interval[] = [];
      for (const iv of out) {
        const cuts = [iv.s, ...[ps, pe].filter((x) => x > iv.s && x < iv.e), iv.e];
        for (let i = 0; i < cuts.length - 1; i++) {
          const s = cuts[i];
          const e = cuts[i + 1];
          split.push({ s, e, peak: s >= ps && e <= pe });
        }
      }
      return split;
    }
    return out;
  };

  let slots = freeIntervals();
  const breaks: Interval[] = [];
  const unplaced = new Map<string, number>();
  const chunkCount = new Map<string, number>();
  for (const b of locked) if (b.taskId) chunkCount.set(b.taskId, (chunkCount.get(b.taskId) ?? 0) + 1);

  for (const t of sortTasks(tasks)) {
    let remaining = t.estimate - (lockedTaskMin.get(t.id) ?? 0);
    if (remaining <= 0) continue;
    const limit = t.deadlineDate === date ? Math.min(bed, toMin(t.deadlineTime)) : bed;
    const want = Math.min(remaining, MAX_CHUNK);
    const fits = (iv: Interval) => Math.min(iv.e, limit) - iv.s >= want;
    const ordered = [...slots].sort((a, b) => {
      if (t.priority === "high" && !!a.peak !== !!b.peak) return a.peak ? -1 : 1;
      // ưu tiên khoảng trống đủ dài để làm liền một mạch
      if (fits(a) !== fits(b)) return fits(a) ? -1 : 1;
      if (!fits(a)) return b.e - b.s - (a.e - a.s); // không vừa: khoảng dài trước
      return a.s - b.s;
    });
    for (const sl of ordered) {
      if (remaining <= 0) break;
      while (remaining > 0) {
        // không bắt đầu phiên mới khi đang trong giờ nghỉ của phiên trước
        for (const br of breaks) if (sl.s >= br.s && sl.s < br.e) sl.s = br.e;
        const end = Math.min(sl.e, limit);
        const room = end - sl.s;
        if (room < Math.min(MIN_CHUNK, remaining)) break;
        let len = Math.min(remaining, MAX_CHUNK, room);
        const left = remaining - len;
        // tránh để lại một mẩu task quá ngắn (< 15 phút)
        if (left > 0 && left < MIN_CHUNK) {
          if (room >= remaining) len = remaining;
          else if (len - (MIN_CHUNK - left) >= MIN_CHUNK) len -= MIN_CHUNK - left;
        }
        const n = (chunkCount.get(t.id) ?? 0) + 1;
        chunkCount.set(t.id, n);
        occ.push({
          key: `task:${t.id}:${sl.s}`,
          cat: "task",
          title: t.title,
          start: sl.s,
          end: sl.s + len,
          taskId: t.id,
        });
        remaining -= len;
        if (level.breakMin > 0) breaks.push({ s: sl.s + len, e: sl.s + len + level.breakMin });
        sl.s += len + level.breakMin;
      }
    }
    slots = slots.filter((s) => s.e - s.s >= MIN_CHUNK);
    if (remaining > 0) unplaced.set(t.id, remaining);
  }

  // 6) Giải trí sau khi đã xếp task (mức cân bằng: nếu còn thời gian)
  let funDropped = false;
  if (fun.enabled && fun.minutes > 0 && !funPlaced) {
    if (!level.overload) {
      const gaps = freeIntervals()
        .filter((g) => g.e - g.s >= 30)
        .sort((a, b) => Math.abs(a.s - toMin(fun.time)) - Math.abs(b.s - toMin(fun.time)));
      if (gaps.length) {
        const g = gaps[0];
        const len = Math.min(fun.minutes, g.e - g.s);
        occ.push({
          key: "fun",
          cat: "fun",
          title: fun.label || "Giải trí",
          start: g.s,
          end: g.s + len,
          shortened: len < fun.minutes,
          note: len < fun.minutes ? `Rút gọn còn ${len} phút` : undefined,
        });
      } else funDropped = true;
    } else funDropped = true;
  }

  // 7) Ngủ
  if (!lockedKeys.has("sleep"))
    occ.push({
      key: "sleep",
      cat: "sleep",
      title: "Ngủ",
      start: bed,
      end: bed + sleepMin,
      shortened: sleepMin < profile.sleepTarget,
      note: sleepMin < profile.sleepTarget ? `Ít hơn mục tiêu ${fmtDuration(profile.sleepTarget - sleepMin)}` : undefined,
    });

  const busyAwake = occupying()
    .filter((b) => b.cat !== "sleep")
    .reduce((sum, b) => sum + Math.max(0, Math.min(b.end, bed) - Math.max(b.start, wake)), 0);

  // gộp các phiên liền nhau của cùng 1 task (nếu tổng vẫn <= MAX_CHUNK)
  const sorted = [...occ].sort((a, b) => a.start - b.start);
  const merged: Block[] = [];
  for (const b of sorted) {
    const prev = merged[merged.length - 1];
    if (
      prev && b.taskId && prev.taskId === b.taskId &&
      prev.end === b.start && b.end - prev.start <= MAX_CHUNK &&
      !lockedKeys.has(prev.key) && !lockedKeys.has(b.key)
    ) {
      merged[merged.length - 1] = { ...prev, end: b.end };
    } else merged.push(b);
  }

  return {
    blocks: merged,
    unplaced,
    sleepMin,
    wake,
    bed,
    cookDropped,
    exShortened,
    funDropped,
    mealShortened,
    freeMin: Math.max(0, bed - wake - busyAwake),
    notes,
  };
}

const totalUnplaced = (r: BuildResult) => [...r.unplaced.values()].reduce((a, b) => a + b, 0);

/** Xếp lịch cho 1 ngày: chọn mức cân bằng thấp nhất đủ chỗ cho mọi task. */
export function planDay(input: PlanInput): DayPlan {
  const { profile, date } = input;
  const candidates = LEVELS.filter((l) => !l.overload || input.overloadAllowed);

  const lockedTaskIds = new Set((input.locked ?? []).filter((b) => b.taskId && !b.missed).map((b) => b.taskId!));
  let active = [...input.tasks];

  const tryFit = (set: Task[]) => {
    for (const lv of candidates) {
      const r = build(input, lv, set);
      if (totalUnplaced(r) === 0) return { r, lv };
    }
    return null;
  };

  let fit = tryFit(active);
  const moved: Task[] = [];
  if (!fit) {
    // Quá tải thật sự: dời các task CHƯA đến hạn sang ngày khác
    const movable = active
      .filter((t) => t.deadlineDate > date && !lockedTaskIds.has(t.id))
      .sort((a, b) => {
        const k = taskSortKey(b).localeCompare(taskSortKey(a)); // hạn xa nhất trước
        if (k !== 0) return k;
        return PRIO[b.priority] - PRIO[a.priority]; // ưu tiên thấp trước
      });
    while (!fit && movable.length) {
      const t = movable.shift()!;
      active = active.filter((x) => x.id !== t.id);
      moved.push(t);
      fit = tryFit(active);
    }
  }
  const lv = fit?.lv ?? candidates[candidates.length - 1];
  const r = fit?.r ?? build(input, lv, active);

  const unfit = [...r.unplaced.entries()].map(([taskId, missing]) => ({
    taskId,
    title: input.tasks.find((t) => t.id === taskId)?.title ?? "",
    missing,
  }));

  const overloadBlocked = !input.overloadAllowed && (moved.length > 0 || unfit.length > 0);

  // ---------------- Cảnh báo ----------------
  const warnings: PlanWarning[] = [];
  if (r.sleepMin <= SLEEP_FLOOR && r.sleepMin < profile.sleepTarget) {
    warnings.push({
      kind: "danger",
      title: `Cảnh báo thiếu ngủ: đêm nay chỉ còn ${fmtHours(r.sleepMin)}`,
      detail:
        "Giấc ngủ đã giảm xuống mức tối thiểu và Smart Life sẽ không cắt thêm nữa. Ngủ dưới 6 tiếng làm giảm trí nhớ và khả năng tập trung – hãy ngủ bù vào ngày mai.",
    });
  }
  if (lv.overload) {
    const parts: string[] = [];
    if (r.sleepMin < profile.sleepTarget) parts.push(`ngủ còn ${fmtHours(r.sleepMin)}`);
    if (r.mealShortened) parts.push("rút ngắn bữa ăn");
    if (r.exShortened) parts.push("chuyển sang cardio nhẹ");
    warnings.push({
      kind: "warning",
      title: "Hôm nay bạn đang quá tải",
      detail: `Smart Life đã ${parts.join(", ") || "cân bằng lại lịch"} để kịp deadline. Ngày mai và ngày kia lịch sẽ không được phép quá tải nữa.`,
    });
  } else if (lv.id >= 1 && (r.cookDropped || r.funDropped)) {
    warnings.push({
      kind: "info",
      title: "Lịch đã được cân bằng",
      detail: "Hôm nay khá nhiều việc nên Smart Life tạm bỏ bớt hoạt động tuỳ chọn (nấu ăn, giải trí) để giữ đủ giờ ngủ và ăn.",
    });
  }
  if (overloadBlocked) {
    warnings.push({
      kind: "info",
      title: "Không cho phép quá tải 2 ngày liên tiếp",
      detail: `Bạn vừa quá tải gần đây. Để bảo vệ sức khoẻ, mỗi ${OVERLOAD_GAP_DAYS} ngày chỉ được quá tải 1 lần, nên hôm nay lịch giữ đủ giờ ngủ và ăn.`,
    });
  }
  if (moved.length) {
    warnings.push({
      kind: "info",
      title: `Đã dời ${moved.length} task chưa đến hạn sang ngày ${moved.length > 1 ? "sau" : "mai"}`,
      detail: moved.map((t) => `• ${t.title}`).join("\n"),
    });
  }
  for (const u of unfit) {
    warnings.push({
      kind: "danger",
      title: `Không đủ thời gian cho "${u.title}" (thiếu ${fmtDuration(u.missing)})`,
      detail: "Hãy giảm thời gian dự tính, chia nhỏ task, bỏ bớt việc khác hoặc xin gia hạn.",
    });
  }
  warnings.push(...r.notes);

  return {
    date,
    level: lv.id,
    levelName: lv.name,
    overload: lv.overload,
    sleepMin: r.sleepMin,
    wake: r.wake,
    bed: r.bed,
    blocks: r.blocks,
    moved: moved.map((t) => ({ taskId: t.id, title: t.title })),
    unfit,
    overloadBlocked,
    warnings,
    freeMin: r.freeMin,
  };
}

/** Ngày quá tải gần nhất trước `before` (không tính chính ngày đó). */
export function lastOverloadBefore(logs: Record<string, DayLog>, before: string): string | null {
  let best: string | null = null;
  for (const l of Object.values(logs)) {
    if (l.overload && l.date < before && (!best || l.date > best)) best = l.date;
  }
  return best;
}

export const overloadAllowedOn = (date: string, lastOverload: string | null) =>
  !lastOverload || diffDays(lastOverload, date) >= OVERLOAD_GAP_DAYS;

export interface RangeContext {
  profile: Profile;
  tasks: Task[];
  logs: Record<string, DayLog>;
  today: string;
  peak?: { start: number; end: number } | null;
  /** Lịch hôm nay đã được lưu (giữ nguyên các block đã hoàn thành). */
  todayPlan?: DayPlan | null;
}

/** Tasks cần xếp cho hôm nay: chưa xong và ngày làm <= hôm nay. */
export const tasksForToday = (tasks: Task[], today: string) =>
  tasks.filter((t) => !t.done && t.planDate <= today);

/**
 * Mô phỏng lịch cho nhiều ngày liên tiếp, để các task bị dời ở ngày trước
 * được chuyển sang ngày sau, và quy tắc "2 ngày quá tải 1 lần" được áp dụng.
 */
export function planRange(ctx: RangeContext, days: number): DayPlan[] {
  const out: DayPlan[] = [];
  let lastOverload = lastOverloadBefore(ctx.logs, ctx.today);
  let carry: Task[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(ctx.today, i);
    let plan: DayPlan;
    if (i === 0 && ctx.todayPlan) {
      plan = ctx.todayPlan;
    } else {
      const dayTasks =
        i === 0
          ? tasksForToday(ctx.tasks, date)
          : [...carry, ...ctx.tasks.filter((t) => !t.done && t.planDate === date)];
      plan = planDay({
        date,
        profile: ctx.profile,
        tasks: dayTasks,
        overloadAllowed: overloadAllowedOn(date, lastOverload),
        peak: ctx.peak,
      });
    }
    if (plan.overload) lastOverload = date;
    carry = plan.moved
      .map((m) => ctx.tasks.find((t) => t.id === m.taskId))
      .filter((t): t is Task => !!t);
    out.push(plan);
  }
  return out;
}
