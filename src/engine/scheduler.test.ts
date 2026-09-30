import { describe, expect, it } from "vitest";
import { planDay, planRange, SLEEP_FLOOR, overloadAllowedOn } from "./scheduler";
import { demoLogs, demoProfile, demoTasks, defaultProfile } from "./demo";
import { predict, summarize } from "./predict";
import type { Block, Profile, Task } from "./types";
import { addDays } from "./time";

const DAY = "2026-09-29"; // Thứ Ba
const MON = "2026-09-28";

const task = (id: string, estimate: number, dueIn: number, extra: Partial<Task> = {}): Task => ({
  id,
  title: `Task ${id}`,
  description: "",
  estimate,
  deadlineDate: addDays(DAY, dueIn),
  deadlineTime: "23:59",
  planDate: DAY,
  priority: "normal",
  done: false,
  createdAt: 0,
  ...extra,
});

const base = (profile: Profile, tasks: Task[], extra = {}) => ({
  date: DAY,
  profile,
  tasks,
  overloadAllowed: true,
  ...extra,
});

const noOverlap = (blocks: Block[]) => {
  const real = [...blocks].sort((a, b) => a.start - b.start);
  for (let i = 1; i < real.length; i++) expect(real[i].start).toBeGreaterThanOrEqual(real[i - 1].end);
};

describe("planDay", () => {
  it("ngày nhẹ nhàng: mức bình thường, đủ ngủ, có nấu ăn và giải trí", () => {
    const p = planDay(base(demoProfile(), [task("a", 60, 1)]));
    expect(p.level).toBe(0);
    expect(p.sleepMin).toBe(480);
    expect(p.blocks.some((b) => b.cat === "cooking")).toBe(true);
    expect(p.blocks.some((b) => b.cat === "fun")).toBe(true);
    expect(p.blocks.filter((b) => b.cat === "task").reduce((a, b) => a + b.end - b.start, 0)).toBe(60);
    noOverlap(p.blocks);
  });

  it("chia task dài thành các phiên tối đa 90 phút", () => {
    const p = planDay(base(defaultProfile(), [task("a", 200, 1)]));
    const chunks = p.blocks.filter((b) => b.taskId === "a");
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    chunks.forEach((c) => expect(c.end - c.start).toBeLessThanOrEqual(90));
  });

  it("nhiều deadline: cân bằng lại, rồi quá tải nhưng không ngủ dưới 6 tiếng (bản free)", () => {
    const p = planDay(base(demoProfile(), [task("a", 300, 0), task("b", 200, 0)]));
    expect(p.level).toBeGreaterThanOrEqual(1);
    expect(p.sleepMin).toBeGreaterThanOrEqual(SLEEP_FLOOR);
    noOverlap(p.blocks);
  });

  it("quá tải thật sự: dời task chưa đến hạn sang ngày khác, giữ task đến hạn hôm nay", () => {
    const p = planDay(base(demoProfile(), [task("due", 240, 0), task("later", 300, 4), task("mid", 120, 1)]));
    expect(p.moved.map((m) => m.taskId)).toContain("later");
    expect(p.moved.map((m) => m.taskId)).not.toContain("due");
    expect(p.blocks.some((b) => b.taskId === "due")).toBe(true);
  });

  it("không được quá tải 2 ngày liên tiếp", () => {
    expect(overloadAllowedOn(DAY, addDays(DAY, -1))).toBe(false);
    expect(overloadAllowedOn(DAY, addDays(DAY, -2))).toBe(true);
    const p = planDay(base(demoProfile(), [task("a", 300, 0), task("b", 240, 2)], { overloadAllowed: false }));
    expect(p.overload).toBe(false);
    expect(p.sleepMin).toBe(480);
    expect(p.overloadBlocked).toBe(true);
    expect(p.moved.length).toBeGreaterThan(0);
  });

  it("không bao giờ ngủ dưới 6 tiếng; khi chạm mức 6 tiếng thì cảnh báo thiếu ngủ", () => {
    const p = planDay(base(demoProfile(), [task("a", 600, 0)]));
    expect(p.sleepMin).toBe(SLEEP_FLOOR);
    expect(p.warnings.some((w) => w.kind === "danger" && w.title.includes("thiếu ngủ"))).toBe(true);
    expect(p.unfit.length).toBe(1);
  });

  it("task có hạn trong ngày chỉ được xếp trước giờ hạn", () => {
    const p = planDay(base(defaultProfile(), [task("a", 60, 0, { deadlineTime: "10:00" })]));
    const c = p.blocks.filter((b) => b.taskId === "a");
    c.forEach((b) => expect(b.end).toBeLessThanOrEqual(600));
  });

  it("hôm nay: không xếp task vào quá khứ và giữ nguyên block đã hoàn thành", () => {
    const locked: Block[] = [{ key: "task:a:480", cat: "task", title: "A", start: 480, end: 540, taskId: "a" }];
    const p = planDay(base(defaultProfile(), [task("a", 120, 1)], { notBefore: 900, locked }));
    const c = p.blocks.filter((b) => b.taskId === "a");
    expect(c.find((b) => b.key === "task:a:480")).toBeTruthy();
    const fresh = c.filter((b) => b.key !== "task:a:480");
    expect(fresh.reduce((a, b) => a + b.end - b.start, 0)).toBe(60);
    fresh.forEach((b) => expect(b.start).toBeGreaterThanOrEqual(900));
  });

  it("task ưu tiên cao được xếp vào khung giờ năng suất", () => {
    const p = planDay(base(defaultProfile(), [task("a", 60, 1, { priority: "high" })], { peak: { start: 19, end: 21 } }));
    const c = p.blocks.find((b) => b.taskId === "a")!;
    expect(c.start).toBeGreaterThanOrEqual(19 * 60);
    expect(c.end).toBeLessThanOrEqual(21 * 60);
  });

  it("ngày có lịch học: di chuyển trước/sau giờ học", () => {
    const p = planDay({ ...base(demoProfile(), []), date: MON });
    expect(p.blocks.filter((b) => b.cat === "commute").length).toBeGreaterThanOrEqual(2);
    noOverlap(p.blocks);
  });
});

describe("planRange", () => {
  it("task bị dời hôm nay xuất hiện ở ngày mai", () => {
    const tasks = [task("due", 240, 0), task("later", 300, 4), task("mid", 120, 1)];
    const days = planRange(
      { profile: demoProfile(), tasks, logs: {}, today: DAY },
      3,
    );
    const movedIds = days[0].moved.map((m) => m.taskId);
    expect(movedIds.length).toBeGreaterThan(0);
    const tomorrowIds = days[1].blocks.filter((b) => b.taskId).map((b) => b.taskId);
    movedIds.forEach((id) => expect([...tomorrowIds, ...days[1].moved.map((m) => m.taskId)]).toContain(id));
    // hôm nay quá tải -> ngày mai không được quá tải
    if (days[0].overload) expect(days[1].overload).toBe(false);
  });
});

describe("predict", () => {
  it("tìm ra khung giờ năng suất từ dữ liệu mẫu (19–21h)", () => {
    const pr = predict(demoLogs(DAY), DAY);
    expect(pr.enoughData).toBe(true);
    expect(pr.peakStart).toBe(19);
    expect(pr.expectedFocusMin).toBeGreaterThan(0);
  });

  it("chưa đủ dữ liệu thì không đoán bừa", () => {
    expect(predict({}, DAY).enoughData).toBe(false);
  });

  it("summarize đếm checklist và phút task theo giờ", () => {
    const p = planDay(base(defaultProfile(), [task("a", 60, 1)]));
    const k = p.blocks.find((b) => b.taskId === "a")!.key;
    const log = summarize(p, new Set([k]), []);
    expect(log.blocksDone).toBe(1);
    expect(log.taskDoneMin).toBe(60);
    expect(log.hourDone.reduce((a, b) => a + b, 0)).toBe(60);
  });

  it("dữ liệu demo xếp được lịch hôm nay", () => {
    const tasks = demoTasks(DAY);
    const p = planDay(base(demoProfile(), tasks.filter((t) => !t.done)));
    noOverlap(p.blocks);
    expect(p.blocks.some((b) => b.cat === "task")).toBe(true);
  });
});
