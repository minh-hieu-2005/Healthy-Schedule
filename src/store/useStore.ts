// Trạng thái dữ liệu của người dùng hiện tại (tài khoản Google hoặc chế độ dùng thử).
// Việc lưu/tải theo từng tài khoản do src/cloud/session.ts đảm nhiệm.
import { create } from "zustand";
import type { Block, DayLog, DayOverride, DayPlan, Profile, Task } from "../engine/types";
import { demoExtras, demoLogs, demoProfile, demoTasks, uid } from "../engine/demo";
import {
  lastOverloadBefore,
  overloadAllowedOn,
  planDay,
  tasksForToday,
} from "../engine/scheduler";
import { predict, summarize } from "../engine/predict";
import { nextOccurrence } from "../engine/calendar";
import type { SleepRecord } from "../engine/motivation";
import { addDays, diffDays, nowMin, todayStr } from "../engine/time";

export interface ReminderSettings {
  water: boolean;
  waterTimes: string[];
  /** mục tiêu số cốc nước mỗi ngày */
  waterGoal: number;
  deadline: boolean;
  /** nhắc trước khi task / buổi tập bắt đầu */
  start: boolean;
  startLead: number;
  /** chào buổi sáng + tổng kết buổi tối */
  daily: boolean;
}

export const defaultReminders = (): ReminderSettings => ({
  water: true,
  waterTimes: ["08:00", "14:00", "17:00"],
  waterGoal: 8,
  deadline: true,
  start: true,
  startLead: 5,
  daily: true,
});

export interface UiPrefs {
  theme: "system" | "light" | "dark";
  /** chế độ gọn: ẩn di chuyển trên thời gian biểu */
  compact: boolean;
  /** đã ẩn thẻ "Bắt đầu với Smart Life" */
  hideGettingStarted: boolean;
}

export const defaultPrefs = (): UiPrefs => ({ theme: "system", compact: false, hideGettingStarted: false });

/** Phần dữ liệu được lưu lên tài khoản. */
export interface UserData {
  profile: Profile | null;
  tasks: Task[];
  /** checklist: ngày -> danh sách key block đã hoàn thành */
  checks: Record<string, string[]>;
  /** phiên task chỉ làm được một nửa: ngày -> key -> số phút đã cộng thêm vào task */
  partial: Record<string, Record<string, number>>;
  /** lịch đã chốt của hôm nay và các ngày đã qua */
  plans: Record<string, DayPlan>;
  logs: Record<string, DayLog>;
  /** điều chỉnh riêng từng ngày: bỏ qua / đổi giờ / ghim task */
  overrides: Record<string, DayOverride>;
  /** giờ ngủ thực tế (đêm kết thúc vào sáng ngày đó) */
  sleepActual: Record<string, SleepRecord>;
  reminders: ReminderSettings;
  prefs: UiPrefs;
  /** nhắc nhở đã hiện (để không hiện lặp lại): key -> thời điểm */
  notified: Record<string, number>;
  /** số cốc nước đã uống theo ngày */
  water: Record<string, number>;
  /** ngày đã chúc mừng hoàn thành lịch */
  celebrated: Record<string, boolean>;
  /** tuần (thứ Hai) đã xem tổng kết */
  recapSeen: string;
  isDemo: boolean;
}

export interface AppState extends UserData {
  setProfile: (p: Profile) => void;
  addTask: (t: Omit<Task, "id" | "createdAt" | "done">) => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  setTaskDone: (id: string, done: boolean, date?: string) => void;
  toggleCheck: (date: string, key: string) => void;
  /** tick "mới làm được một nửa": đánh dấu phiên và cộng thêm thời gian còn thiếu vào task */
  markHalf: (date: string, key: string) => void;
  savePlan: (plan: DayPlan) => void;
  saveLog: (log: DayLog) => void;
  skipBlock: (date: string, key: string, skip: boolean) => void;
  moveBlock: (date: string, key: string, start: number | null) => void;
  pinTask: (date: string, taskId: string, start: number | null) => void;
  /** dời task sang ngày khác (mặc định: ngày mai) */
  postponeTask: (taskId: string, toDate?: string) => void;
  setSleepActual: (date: string, rec: SleepRecord) => void;
  setReminders: (r: Partial<ReminderSettings>) => void;
  setPrefs: (p: Partial<UiPrefs>) => void;
  markNotified: (keys: string[], at?: number) => void;
  addWater: (date: string, delta?: number) => void;
  markCelebrated: (date: string) => void;
  setRecapSeen: (monday: string) => void;
  loadDemo: () => void;
  resetAll: () => void;
  /** nạp dữ liệu của tài khoản vừa đăng nhập */
  hydrate: (d: Partial<UserData>) => void;
}

export const emptyData = (): UserData => ({
  profile: null,
  tasks: [],
  checks: {},
  partial: {},
  plans: {},
  logs: {},
  overrides: {},
  sleepActual: {},
  reminders: defaultReminders(),
  prefs: defaultPrefs(),
  notified: {},
  water: {},
  celebrated: {},
  recapSeen: "",
  isDemo: false,
});

export const DATA_KEYS = Object.keys(emptyData()) as (keyof UserData)[];

/** Lấy phần dữ liệu cần lưu từ state. */
export const pickData = (s: AppState): UserData =>
  Object.fromEntries(DATA_KEYS.map((k) => [k, s[k]])) as unknown as UserData;

/** Giữ lại dữ liệu theo ngày trong một khoảng cho gọn. */
const prune = <T,>(rec: Record<string, T>, today: string, keep = 60) =>
  Object.fromEntries(Object.entries(rec).filter(([d]) => diffDays(d, today) <= keep));

/**
 * Đánh dấu xong / chưa xong một task. Task lặp lại khi xong sẽ tự tạo lần tiếp
 * theo; bỏ đánh dấu thì gỡ lần tiếp theo đó (nếu chưa đụng tới).
 */
function applyDone(tasks: Task[], id: string, done: boolean, date: string): Task[] {
  const t = tasks.find((x) => x.id === id);
  if (!t || t.done === done) return tasks;
  let out = tasks.map((x) => (x.id === id ? { ...x, done, doneDate: done ? date : undefined } : x));
  if (done && !t.nextId) {
    const next = nextOccurrence(t);
    if (next) {
      out = out.map((x) => (x.id === id ? { ...x, nextId: next.id } : x));
      out.push(next);
    }
  }
  if (!done && t.nextId) {
    const n = out.find((x) => x.id === t.nextId);
    const untouched = n && !n.done && !(n.subtasks ?? []).some((st) => st.done);
    if (untouched) out = out.filter((x) => x.id !== t.nextId).map((x) => (x.id === id ? { ...x, nextId: undefined } : x));
  }
  return out;
}

export const useStore = create<AppState>()((set, get) => {
  const setOverride = (date: string, fn: (o: DayOverride) => DayOverride) =>
    set((s) => ({ overrides: prune({ ...s.overrides, [date]: fn(s.overrides[date] ?? {}) }, todayStr(), 14) }));

  return {
    ...emptyData(),

    setProfile: (profile) => set({ profile }),

    addTask: (t) => {
      const id = uid();
      set((s) => ({ tasks: [...s.tasks, { ...t, id, createdAt: Date.now(), done: false }] }));
      return id;
    },

    updateTask: (id, patch) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),

    deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

    setTaskDone: (id, done, date = todayStr()) => set((s) => ({ tasks: applyDone(s.tasks, id, done, date) })),

    toggleCheck: (date, key) => {
      const s = get();
      const cur = new Set(s.checks[date] ?? []);
      let tasks = s.tasks;
      let partial = s.partial;
      if (cur.has(key)) {
        cur.delete(key);
        // bỏ tick phiên "làm một nửa" -> trả lại thời gian đã cộng thêm
        const added = s.partial[date]?.[key];
        if (added) {
          const block = s.plans[date]?.blocks.find((b) => b.key === key);
          if (block?.taskId)
            tasks = tasks.map((t) => (t.id === block.taskId ? { ...t, estimate: Math.max(5, t.estimate - added) } : t));
          const { [key]: _drop, ...rest } = s.partial[date];
          void _drop;
          partial = { ...s.partial, [date]: rest };
        }
      } else cur.add(key);
      const checks = { ...s.checks, [date]: [...cur] };
      // nếu mọi phiên của 1 task trong ngày đã tick -> đánh dấu task hoàn thành
      const plan = s.plans[date];
      const block = plan?.blocks.find((b) => b.key === key);
      if (plan && block?.taskId) {
        const all = plan.blocks.filter((b) => b.taskId === block.taskId && !b.missed);
        const allDone = all.every((b) => cur.has(b.key) && !partial[date]?.[b.key]);
        const t = tasks.find((x) => x.id === block.taskId);
        if (t && allDone && !t.done && plan.unfit.every((u) => u.taskId !== t.id)) tasks = applyDone(tasks, t.id, true, date);
        if (t && !allDone && t.done && t.doneDate === date) tasks = applyDone(tasks, t.id, false, date);
      }
      set({ checks, tasks, partial });
    },

    markHalf: (date, key) => {
      const s = get();
      const block = s.plans[date]?.blocks.find((b) => b.key === key);
      if (!block?.taskId) return;
      const half = Math.max(5, Math.round((block.end - block.start) / 2 / 5) * 5);
      const cur = new Set(s.checks[date] ?? []);
      cur.add(key);
      set({
        checks: { ...s.checks, [date]: [...cur] },
        partial: { ...s.partial, [date]: { ...(s.partial[date] ?? {}), [key]: half } },
        // phần chưa làm được cộng lại vào task để lịch tự xếp tiếp
        tasks: s.tasks.map((t) => (t.id === block.taskId ? { ...t, estimate: t.estimate + half } : t)),
      });
    },

    // lịch chi tiết giữ 21 ngày, nhật ký thống kê giữ 60 ngày
    savePlan: (plan) => set((s) => ({ plans: prune({ ...s.plans, [plan.date]: plan }, todayStr(), 21) })),
    saveLog: (log) => set((s) => ({ logs: prune({ ...s.logs, [log.date]: log }, todayStr()) })),

    skipBlock: (date, key, skip) =>
      setOverride(date, (o) => {
        const cur = new Set(o.skip ?? []);
        if (skip) cur.add(key);
        else cur.delete(key);
        return { ...o, skip: [...cur] };
      }),
    moveBlock: (date, key, start) =>
      setOverride(date, (o) => {
        const move = { ...(o.move ?? {}) };
        if (start === null) delete move[key];
        else move[key] = start;
        return { ...o, move };
      }),
    pinTask: (date, taskId, start) =>
      setOverride(date, (o) => {
        const pin = { ...(o.pin ?? {}) };
        if (start === null) delete pin[taskId];
        else pin[taskId] = start;
        return { ...o, pin };
      }),
    postponeTask: (taskId, toDate) => {
      const today = todayStr();
      const to = toDate ?? addDays(today, 1);
      set((s) => ({
        tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, planDate: to } : t)),
        overrides: {
          ...s.overrides,
          [today]: { ...(s.overrides[today] ?? {}), pin: Object.fromEntries(Object.entries(s.overrides[today]?.pin ?? {}).filter(([k]) => k !== taskId)) },
        },
      }));
    },

    setSleepActual: (date, rec) => set((s) => ({ sleepActual: prune({ ...s.sleepActual, [date]: rec }, todayStr(), 90) })),
    setReminders: (r) => set((s) => ({ reminders: { ...s.reminders, ...r } })),
    setPrefs: (p) => set((s) => ({ prefs: { ...s.prefs, ...p } })),
    markNotified: (keys, at = Date.now()) =>
      set((s) => {
        const cutoff = Date.now() - 14 * 86400000; // dọn các mục cũ hơn 14 ngày
        const kept = Object.fromEntries(Object.entries(s.notified).filter(([, t]) => t > cutoff));
        for (const k of keys) kept[k] = at;
        return { notified: kept };
      }),
    addWater: (date, delta = 1) =>
      set((s) => ({ water: prune({ ...s.water, [date]: Math.max(0, (s.water[date] ?? 0) + delta) }, todayStr(), 60) })),
    markCelebrated: (date) => set((s) => ({ celebrated: prune({ ...s.celebrated, [date]: true }, todayStr(), 14) })),
    setRecapSeen: (monday) => set({ recapSeen: monday }),

    loadDemo: () => {
      const today = todayStr();
      const keep = { reminders: get().reminders, prefs: get().prefs };
      set({
        ...emptyData(),
        ...keep,
        profile: demoProfile(),
        tasks: demoTasks(today),
        logs: demoLogs(today),
        ...demoExtras(today),
        isDemo: true,
      });
      // lịch mẫu của hôm nay được xếp cho cả ngày (không phụ thuộc giờ mở web)
      const plan = computeTodayPlan(get(), today, { fullDay: true });
      const checks = demoChecks(plan, today);
      set({ plans: { [today]: plan }, checks: { [today]: checks } });
      const st = get();
      set({ logs: { ...st.logs, [today]: summarize(plan, new Set(checks), st.tasks) } });
    },

    resetAll: () => set({ ...emptyData(), prefs: get().prefs }),

    hydrate: (d) =>
      set({
        ...emptyData(),
        ...d,
        reminders: { ...defaultReminders(), ...(d.reminders ?? {}) },
        prefs: { ...defaultPrefs(), ...(d.prefs ?? {}) },
      }),
  };
});

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
    o: s.overrides[today] ?? null,
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
  const override = s.overrides[today];
  const changed = new Set([...(override?.skip ?? []), ...Object.keys(override?.move ?? {})]);
  let locked: Block[] = [];
  if (prev && !opts.fullDay) {
    locked = prev.blocks
      .filter((b) => {
        if (b.taskId && !taskById.has(b.taskId)) return false; // task đã bị xoá
        if (changed.has(b.key) && !checked.has(b.key)) return false; // vừa bỏ qua / đổi giờ
        if (b.key.startsWith("cook:") && changed.has(b.key.replace("cook:", "meal:")) && !checked.has(b.key)) return false;
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
    override,
  });
  return { ...plan, sig: todaySig(s, today) };
}

export const yesterday = () => addDays(todayStr(), -1);
