import { describe, expect, it } from "vitest";
import { dueReminders, type ReminderInput } from "./reminders";
import type { Task } from "./types";

const at = (hhmm: string, date = "2026-09-30") => {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  return new Date(y, m - 1, d, h, mi);
};

const task = (id: string, deadlineDate: string, deadlineTime: string, priority: Task["priority"] = "high"): Task => ({
  id,
  title: `Task ${id}`,
  description: "",
  estimate: 60,
  deadlineDate,
  deadlineTime,
  planDate: "2026-09-30",
  priority,
  done: false,
  createdAt: 0,
});

const base = (over: Partial<ReminderInput>): ReminderInput => ({
  now: at("07:00"),
  tasks: [],
  water: true,
  waterTimes: ["08:00", "14:00", "17:00"],
  deadline: true,
  notified: {},
  ...over,
});

describe("nhắc uống nước", () => {
  it("nhắc đúng lúc 8h, 14h, 17h", () => {
    expect(dueReminders(base({ now: at("07:59") }))).toHaveLength(0);
    for (const t of ["08:00", "14:00", "17:00"]) {
      const r = dueReminders(base({ now: at(t) }));
      expect(r).toHaveLength(1);
      expect(r[0].kind).toBe("water");
    }
  });
  it("mở web muộn trong vòng 60 phút vẫn được nhắc, quá 60 phút thì bỏ qua", () => {
    expect(dueReminders(base({ now: at("08:45") }))).toHaveLength(1);
    expect(dueReminders(base({ now: at("09:05") }))).toHaveLength(0);
  });
  it("đã nhắc rồi thì không nhắc lại, hoãn 10 phút thì nhắc lại sau", () => {
    const r = dueReminders(base({ now: at("08:00") }))[0];
    expect(dueReminders(base({ now: at("08:05"), notified: { [r.id]: 1 } }))).toHaveLength(0);
    const snoozed = { [r.id]: at("08:10").getTime() };
    expect(dueReminders(base({ now: at("08:05"), snoozed }))).toHaveLength(0);
    expect(dueReminders(base({ now: at("08:10"), snoozed }))).toHaveLength(1);
  });
  it("tắt nhắc uống nước thì không nhắc", () => {
    expect(dueReminders(base({ now: at("08:00"), water: false }))).toHaveLength(0);
  });
});

describe("nhắc deadline", () => {
  it("task ưu tiên cao: nhắc ở mốc 24h, 3h, 1h – mỗi mốc 1 lần", () => {
    const t = task("a", "2026-10-01", "12:00");
    const noWater = { water: false, tasks: [t] };
    expect(dueReminders(base({ ...noWater, now: at("11:00") }))).toHaveLength(0); // còn 25h
    const r24 = dueReminders(base({ ...noWater, now: at("12:30") }));
    expect(r24.map((r) => r.id)).toEqual(["dl:a:24"]);
    const notified = Object.fromEntries(r24[0].marks.map((k) => [k, 1]));
    expect(dueReminders(base({ ...noWater, now: at("13:00"), notified }))).toHaveLength(0);
    const r3 = dueReminders(base({ ...noWater, now: at("09:30", "2026-10-01"), notified }));
    expect(r3.map((r) => r.id)).toEqual(["dl:a:3"]);
  });
  it("mở web khi chỉ còn 30 phút: chỉ nhắc 1 lần ở mốc 1h (không dồn 3 thông báo)", () => {
    const t = task("b", "2026-09-30", "20:00");
    const r = dueReminders(base({ water: false, tasks: [t], now: at("19:30") }));
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe("dl:b:1");
    expect(r[0].urgent).toBe(true);
    expect(r[0].marks.sort()).toEqual(["dl:b:1", "dl:b:24", "dl:b:3"]);
  });
  it("task bình thường chỉ nhắc khi còn 1 tiếng; task đã xong / quá hạn không nhắc", () => {
    const n = task("c", "2026-09-30", "20:00", "normal");
    expect(dueReminders(base({ water: false, tasks: [n], now: at("17:30") }))).toHaveLength(0);
    expect(dueReminders(base({ water: false, tasks: [n], now: at("19:10") }))).toHaveLength(1);
    expect(dueReminders(base({ water: false, tasks: [{ ...n, done: true }], now: at("19:10") }))).toHaveLength(0);
    expect(dueReminders(base({ water: false, tasks: [n], now: at("20:30") }))).toHaveLength(0);
  });
  it("tắt nhắc deadline thì không nhắc", () => {
    const t = task("d", "2026-09-30", "20:00");
    expect(dueReminders(base({ water: false, deadline: false, tasks: [t], now: at("19:30") }))).toHaveLength(0);
  });
});

describe("nhắc bắt đầu việc, chào sáng, tổng kết tối", () => {
  const today = {
    date: "2026-09-30",
    wake: 390,
    bed: 1350,
    blocks: [
      { key: "task:x:840", title: "Ôn thi", start: 840, end: 930, cat: "task" as const, done: false },
      { key: "meal:lunch", title: "Bữa trưa", start: 720, end: 760, cat: "meal" as const, done: true },
    ],
  };
  const inp = (hhmm: string, over: Partial<ReminderInput> = {}) =>
    base({ now: at(hhmm), water: false, deadline: false, start: true, startLead: 5, daily: true, today, ...over });
  it("nhắc 5 phút trước khi task bắt đầu, không nhắc bữa ăn", () => {
    expect(dueReminders(inp("13:54")).filter((r) => r.kind === "start")).toHaveLength(0);
    const r = dueReminders(inp("13:55")).filter((x) => x.kind === "start");
    expect(r).toHaveLength(1);
    expect(r[0].title).toContain("5 phút nữa: Ôn thi");
  });
  it("task đã tick xong thì không nhắc", () => {
    const done = { ...today, blocks: [{ ...today.blocks[0], done: true }] };
    expect(dueReminders(inp("13:57", { today: done })).filter((r) => r.kind === "start")).toHaveLength(0);
  });
  it("task vừa tạo / đang tập trung (quiet) thì không nhắc giờ bắt đầu", () => {
    const quiet = { ...today, blocks: [{ ...today.blocks[0], quiet: true }] };
    expect(dueReminders(inp("13:57", { today: quiet })).filter((r) => r.kind === "start")).toHaveLength(0);
  });
  it("chào buổi sáng sau giờ thức dậy, tổng kết 45 phút trước giờ ngủ", () => {
    expect(dueReminders(inp("06:35")).map((r) => r.kind)).toContain("morning");
    expect(dueReminders(inp("21:50")).map((r) => r.kind)).toContain("evening");
    expect(dueReminders(inp("21:30")).map((r) => r.kind)).not.toContain("evening");
  });
  it("vừa tạo task có hạn sau 2 tiếng thì không nhắc ngay; tới mốc 1 tiếng mới nhắc", () => {
    const created = at("18:00").getTime();
    const t = { ...task("n", "2026-09-30", "20:00"), createdAt: created };
    expect(dueReminders(base({ water: false, tasks: [t], now: at("18:01") }))).toHaveLength(0);
    const r = dueReminders(base({ water: false, tasks: [t], now: at("19:00") }));
    expect(r.map((x) => x.id)).toEqual(["dl:n:1"]);
  });
});
