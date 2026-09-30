// Trạng thái ứng dụng của NGƯỜI DÙNG ĐANG ĐĂNG NHẬP.
// Việc lưu/tải theo từng tài khoản do src/cloud/sync.ts đảm nhiệm.
import { create } from "zustand";
import type { Block, DayLog, DayPlan, Profile, Task } from "../engine/types";
import { demoLogs, demoProfile, demoTasks, uid } from "../engine/demo";
import {
  lastOverloadBefore,
  overloadAllowedOn,
  planDay,
  tasksForToday,
} from "../engine/scheduler";
import { predict, summarize } from "../engine/predict";
import { addDays, diffDays, nowMin, todayStr } from "../engine/time";

export interface ReminderSettings {
  water: boolean;
  waterTimes: string[];
  deadline: boolean;
}

export const defaultReminders = (): ReminderSettings => ({
  water: true,
  waterTimes: ["08:00", "14:00", "17:00"],
  deadline: true,
});

/** Phần dữ liệu được lưu lên tài khoản. */
export interface UserData {
  profile: Profile | null;
  tasks: Task[];
  /** checklist: ngày -> danh sách key block đã hoàn thành */
  checks: Record<string, string[]>;
  /** lịch đã chốt của hôm nay và các ngày đã qua */
  plans: Record<string, DayPlan>;
  logs: Record<string, DayLog>;
  reminders: ReminderSettings;
  /** nhắc nhở đã hiện (để không hiện lặp lại): key -> thời điểm */
  notified: Record<string, number>;
  /** số lần đã uống nước theo ngày (bấm "Đã uống" trên thông báo) */
  water: Record<string, number>;
  isDemo: boolean;
}

export interface AppState extends UserData {
  setProfile: (p: Profile) => void;
  addTask: (t: Omit<Task, "id" | "createdAt" | "done">) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  setTaskDone: (id: string, done: boolean, date?: string) => void;
  toggleCheck: (date: string, key: string) => void;
  savePlan: (plan: DayPlan) => void;
  saveLog: (log: DayLog) => void;
  setReminders: (r: Partial<ReminderSettings>) => void;
  markNotified: (keys: string[], at?: number) => void;
  addWater: (date: string) => void;
  loadDemo: () => void;
  resetAll: () => void;
  /** nạp dữ liệu của tài khoản vừa đăng nhập */
  hydrate: (d: Partial<UserData>) => void;
}

export const emptyData = (): UserData => ({
  profile: null,
  tasks: [],
  checks: {},
  plans: {},
  logs: {},
  reminders: defaultReminders(),
  notified: {},
  water: {},
  isDemo: false,
});

export const DATA_KEYS = Object.keys(emptyData()) as (keyof UserData)[];

/** Lấy phần dữ liệu cần lưu từ state. */
export const pickData = (s: AppState): UserData =>
  Object.fromEntries(DATA_KEYS.map((k) => [k, s[k]])) as unknown as UserData;

/** Giữ lại dữ liệu theo ngày trong một khoảng cho gọn. */
const prune = <T,>(rec: Record<string, T>, today: string, keep = 60) =>
  Object.fromEntries(Object.entries(rec).filter(([d]) => diffDays(d, today) <= keep));

export const useStore = create<AppState>()((set, get) => ({
  ...emptyData(),

  setProfile: (profile) => set({ profile }),

  addTask: (t) =>
    set((s) => ({ tasks: [...s.tasks, { ...t, id: uid(), createdAt: Date.now(), done: false }] })),

  updateTask: (id, patch) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),

  deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

  setTaskDone: (id, done, date = todayStr()) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, done, doneDate: done ? date : undefined } : t)),
    })),

  toggleCheck: (date, key) => {
    const s = get();
    const cur = new Set(s.checks[date] ?? []);
    if (cur.has(key)) cur.delete(key);
    else cur.add(key);
    const checks = { ...s.checks, [date]: [...cur] };
    // nếu mọi phiên của 1 task trong ngày đã tick -> đánh dấu task hoàn thành
    const plan = s.plans[date];
    let tasks = s.tasks;
    const block = plan?.blocks.find((b) => b.key === key);
    if (plan && block?.taskId) {
      const all = plan.blocks.filter((b) => b.taskId === block.taskId && !b.missed);
      const allDone = all.every((b) => cur.has(b.key));
      const t = s.tasks.find((x) => x.id === block.taskId);
      if (t && allDone && !t.done && plan.unfit.every((u) => u.taskId !== t.id))
        tasks = s.tasks.map((x) => (x.id === t.id ? { ...x, done: true, doneDate: date } : x));
      if (t && !allDone && t.done && t.doneDate === date)
        tasks = s.tasks.map((x) => (x.id === t.id ? { ...x, done: false, doneDate: undefined } : x));
    }
    set({ checks, tasks });
  },

  // lịch chi tiết giữ 21 ngày, nhật ký thống kê giữ 60 ngày
  savePlan: (plan) => set((s) => ({ plans: prune({ ...s.plans, [plan.date]: plan }, todayStr(), 21) })),
  saveLog: (log) => set((s) => ({ logs: prune({ ...s.logs, [log.date]: log }, todayStr()) })),

  setReminders: (r) => set((s) => ({ reminders: { ...s.reminders, ...r } })),
  markNotified: (keys, at = Date.now()) =>
    set((s) => {
      const cutoff = Date.now() - 14 * 86400000; // dọn các mục cũ hơn 14 ngày
      const kept = Object.fromEntries(Object.entries(s.notified).filter(([, t]) => t > cutoff));
      for (const k of keys) kept[k] = at;
      return { notified: kept };
    }),
  addWater: (date) => set((s) => ({ water: prune({ ...s.water, [date]: (s.water[date] ?? 0) + 1 }, todayStr(), 30) })),

  loadDemo: () => {
    const today = todayStr();
    const keep = { reminders: get().reminders };
    set({ ...emptyData(), ...keep, profile: demoProfile(), tasks: demoTasks(today), logs: demoLogs(today), isDemo: true });
    // lịch mẫu của hôm nay được xếp cho cả ngày (không phụ thuộc giờ mở web)
    const plan = computeTodayPlan(get(), today, { fullDay: true });
    const checks = demoChecks(plan, today);
    set({ plans: { [today]: plan }, checks: { [today]: checks } });
    const st = get();
    set({ logs: { ...st.logs, [today]: summarize(plan, new Set(checks), st.tasks) } });
  },

  resetAll: () => set({ ...emptyData() }),

  hydrate: (d) =>
    set({
      ...emptyData(),
      ...d,
      reminders: { ...defaultReminders(), ...(d.reminders ?? {}) },
    }),
}));

/** Demo: tick sẵn các hoạt động buổi sáng để thấy checklist hoạt động. */
function demoChecks(plan: DayPlan, today: string): string[] {
  const cutoff = Math.min(nowMin(), 12 * 60);
  if (today !== todayStr()) return [];
  return plan.blocks.filter((b) => b.end <= cutoff && b.cat !== "task").map((b) => b.key);
}

export const peakFor = (logs: Record<string, DayLog>, date: string) => {
  const pr = predict(logs, date);
  return pr.enoughData && pr.peakStart !== null ? { start: pr.peakStart, end: pr.peakEnd! } : null;
};

/** Chữ ký dữ liệu đầu vào của lịch hôm nay. */
export function todaySig(s: AppState, today: string): string {
  const lastOv = lastOverloadBefore(s.logs, today);
  return JSON.stringify({
    p: s.profile,
    t: tasksForToday(s.tasks, today).map((t) => [t.id, t.title, t.estimate, t.deadlineDate, t.deadlineTime, t.priority]),
    d: s.tasks.filter((t) => t.done && t.doneDate === today).map((t) => t.id),
    ov: overloadAllowedOn(today, lastOv),
    pk: peakFor(s.logs, today),
  });
}

/**
 * Xếp (lại) lịch hôm nay. Các block đã qua giờ, đã tick, hoặc thuộc task đã
 * hoàn thành được giữ nguyên; phần việc còn lại chỉ được xếp từ bây giờ trở đi.
 */
export function computeTodayPlan(
  s: AppState,
  today: string,
  opts: { fullDay?: boolean } = {},
): DayPlan {
  const profile = s.profile!;
  const prev = s.plans[today];
  const now = nowMin();
  const checked = new Set(s.checks[today] ?? []);
  const taskById = new Map(s.tasks.map((t) => [t.id, t]));
  let locked: Block[] = [];
  if (prev && !opts.fullDay) {
    locked = prev.blocks
      .filter((b) => {
        if (b.taskId && !taskById.has(b.taskId)) return false; // task đã bị xoá
        const t = b.taskId ? taskById.get(b.taskId) : undefined;
        if (checked.has(b.key)) return true;
        if (t?.done && t.doneDate === today) return true;
        return b.end <= now && b.cat !== "sleep";
      })
      .map((b) => {
        const t = b.taskId ? taskById.get(b.taskId) : undefined;
        const missed = !!b.taskId && !checked.has(b.key) && !(t?.done && t.doneDate === today);
        return { ...b, missed };
      });
  }
  const lastOv = lastOverloadBefore(s.logs, today);
  const plan = planDay({
    date: today,
    profile,
    tasks: tasksForToday(s.tasks, today),
    overloadAllowed: overloadAllowedOn(today, lastOv),
    // không xếp phần việc còn lại vào khoảng thời gian đã qua
    notBefore: opts.fullDay ? undefined : now,
    locked,
    peak: peakFor(s.logs, today),
  });
  return { ...plan, sig: todaySig(s, today) };
}

export const yesterday = () => addDays(todayStr(), -1);
