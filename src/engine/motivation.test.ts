import { describe, expect, it } from "vitest";
import { motivation, sleepMinutes, weekRecap } from "./motivation";
import { buildIcs, googleCalendarLink, nextOccurrence } from "./calendar";
import type { DayLog, DayPlan, Task } from "./types";
import { addDays } from "./time";

const T = "2026-09-30";
const log = (date: string, done: number, total = 10, overload = false): DayLog => ({
  date,
  level: 0,
  overload,
  sleepMin: 480,
  minutes: {},
  blocksTotal: total,
  blocksDone: done,
  taskPlannedMin: 60,
  taskDoneMin: done >= 7 ? 60 : 0,
  hourPlanned: Array(24).fill(0),
  hourDone: Array(24).fill(0),
});

describe("chuỗi ngày & huy hiệu", () => {
  it("chuỗi tính các ngày liên tiếp hoàn thành >= 70%, hôm nay chưa xong không làm đứt chuỗi", () => {
    const logs = Object.fromEntries(
      [
        log(addDays(T, -4), 3),
        log(addDays(T, -3), 8),
        log(addDays(T, -2), 9),
        log(addDays(T, -1), 7),
        log(T, 2),
      ].map((l) => [l.date, l]),
    );
    const m = motivation({ logs, sleepActual: {}, water: {}, waterGoal: 8, tasks: [], sleepTarget: 480, today: T });
    expect(m.streak).toBe(3);
    expect(m.badges.find((b) => b.id === "streak3")!.earned).toBe(true);
    expect(m.badges.find((b) => b.id === "streak7")!.progress).toBe(3);
  });
  it("giờ ngủ thực tế qua nửa đêm và chuỗi ngủ đủ", () => {
    expect(sleepMinutes({ bed: 1410, wake: 390 })).toBe(420);
    expect(sleepMinutes({ bed: 30, wake: 450 })).toBe(420);
    const sleepActual = Object.fromEntries([0, 1, 2].map((i) => [addDays(T, -i), { bed: 1380, wake: 390 }]));
    const m = motivation({ logs: {}, sleepActual, water: {}, waterGoal: 8, tasks: [], sleepTarget: 480, today: T });
    expect(m.sleepStreak).toBe(3);
  });
  it("tổng kết tuần", () => {
    const logs = { [T]: log(T, 8), [addDays(T, -1)]: log(addDays(T, -1), 5, 10, true) };
    const r = weekRecap({ logs, sleepActual: {}, water: { [T]: 8 }, waterGoal: 8, tasks: [], sleepTarget: 480 }, T);
    expect(r.from).toBe("2026-09-28");
    expect(r.days).toBe(2);
    expect(r.overloadDays).toBe(1);
    expect(r.waterDays).toBe(1);
    expect(r.bestDay?.date).toBe(T);
  });
});

describe("task lặp lại & xuất lịch", () => {
  const t: Task = {
    id: "a", title: "Nộp nhật ký", description: "", estimate: 30, deadlineDate: T, deadlineTime: "20:00",
    planDate: T, priority: "normal", done: true, doneDate: T, createdAt: 0, repeat: "weekly",
    subtasks: [{ id: "s", title: "Viết", done: true }],
  };
  it("hoàn thành task lặp hằng tuần -> tạo lần tiếp theo sau 7 ngày", () => {
    const n = nextOccurrence(t)!;
    expect(n.deadlineDate).toBe("2026-10-07");
    expect(n.done).toBe(false);
    expect(n.subtasks![0].done).toBe(false);
    expect(nextOccurrence({ ...t, repeat: "none" })).toBeNull();
  });
  it("file .ics và link Google Calendar", () => {
    const plan = {
      date: T,
      blocks: [
        { key: "task:a:1140", cat: "task", title: "Nộp nhật ký", start: 1140, end: 1170, taskId: "a" },
        { key: "meal:dinner", cat: "meal", title: "Bữa tối", start: 1110, end: 1140 },
      ],
    } as unknown as DayPlan;
    const ics = buildIcs([plan]);
    expect(ics).toContain("SUMMARY:Nộp nhật ký");
    expect(ics).toContain("DTSTART;TZID=Asia/Ho_Chi_Minh:20260930T190000");
    expect(ics).not.toContain("Bữa tối");
    expect(buildIcs([plan], { all: true })).toContain("Bữa tối");
    expect(googleCalendarLink("A", T, 1140, 1170)).toContain("dates=20260930T190000%2F20260930T193000");
  });
});
