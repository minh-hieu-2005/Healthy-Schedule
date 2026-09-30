// Hồ sơ mặc định và bộ dữ liệu mẫu (dùng để demo / thuyết trình).
import type { DayLog, Profile, Task } from "./types";
import { addDays, weekday } from "./time";

export const uid = () => Math.random().toString(36).slice(2, 10);

export const defaultProfile = (): Profile => ({
  name: "",
  wakeTime: "06:30",
  sleepTarget: 480,
  meals: [
    { id: "breakfast", enabled: true, time: "07:00", duration: 20, cook: false },
    { id: "lunch", enabled: true, time: "12:00", duration: 40, cook: false },
    { id: "dinner", enabled: true, time: "18:45", duration: 45, cook: true },
  ],
  exercise: { enabled: true, kind: "Gym", time: "17:30", duration: 60, days: [1, 3, 5] },
  commitments: [],
  commute: { enabled: true, minutes: 20 },
  cooking: { enabled: true, minutes: 30 },
  fun: { enabled: true, label: "Giải trí", time: "21:00", minutes: 60 },
});

export const demoProfile = (): Profile => ({
  ...defaultProfile(),
  name: "Minh Anh",
  commitments: [
    { id: "c1", label: "Học trên trường", kind: "school", days: [1, 2, 3, 4, 5], start: "07:30", end: "11:30" },
    { id: "c2", label: "Học buổi chiều", kind: "school", days: [1, 3], start: "13:30", end: "16:00" },
    { id: "c3", label: "Làm thêm ở quán cà phê", kind: "work", days: [2, 4, 6], start: "13:30", end: "17:00" },
  ],
  fun: { enabled: true, label: "Giải trí (phim, game, lướt mạng)", time: "21:00", minutes: 60 },
});

/** PRNG có seed — dữ liệu mẫu giống nhau mỗi lần tạo. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function demoTasks(today: string): Task[] {
  const t = (
    title: string,
    estimate: number,
    dueIn: number,
    priority: Task["priority"],
    description: string,
    time = "23:59",
    extra: Partial<Task> = {},
  ): Task => ({
    id: uid(),
    title,
    description,
    estimate,
    deadlineDate: addDays(today, dueIn),
    deadlineTime: time,
    planDate: today,
    priority,
    done: false,
    createdAt: Date.now(),
    ...extra,
  });
  return [
    t("Bài tập nhóm Tài chính quốc tế", 120, 0, "high", "Hoàn thiện phần phân tích tỷ giá và gửi cho nhóm trưởng."),
    t("Đọc chương 4 giáo trình Marketing", 60, 1, "normal", "Tóm tắt 1 trang để thảo luận trên lớp."),
    t("Làm slide thuyết trình Kinh tế vĩ mô", 90, 2, "high", "10 slide, chủ đề lạm phát 2025–2026."),
    t("Ôn thi giữa kỳ Nguyên lý kế toán", 150, 3, "normal", "Làm lại đề năm trước + ôn bút toán.", "23:59", { planDate: addDays(today, 1) }),
    t("Viết báo cáo thực tập (bản nháp)", 120, 6, "low", "Phần giới thiệu doanh nghiệp và mô tả công việc.", "23:59", {
      planDate: addDays(today, 1),
      subtasks: [
        { id: uid(), title: "Giới thiệu doanh nghiệp", done: true },
        { id: uid(), title: "Mô tả công việc đã làm", done: false },
        { id: uid(), title: "Bài học rút ra", done: false },
      ],
    }),
    t("Ghi nhật ký học tập tuần", 30, 4, "normal", "Tổng kết những gì đã học trong tuần.", "21:00", { repeat: "weekly", planDate: addDays(today, 4) }),
    t("Nộp form đăng ký CLB tiếng Anh", 15, 0, "low", "Điền form online.", "20:00", {
      done: true,
      doneDate: today,
    }),
    t("Bài tập cá nhân Toán cao cấp", 60, -1, "normal", "Chương 3 – ma trận.", "23:59", {
      planDate: addDays(today, -2),
      done: true,
      doneDate: addDays(today, -1),
    }),
  ];
}

/** Lịch sử 35 ngày: khung giờ 19–21h có tỉ lệ hoàn thành cao nhất. */
export function demoLogs(today: string): Record<string, DayLog> {
  const r = rng(20260929);
  const logs: Record<string, DayLog> = {};
  for (let i = 35; i >= 1; i--) {
    const date = addDays(today, -i);
    // 2 ngày trước từng quá tải, hôm qua bình thường -> hôm nay vẫn được quá tải
    const overload = i === 2 || i === 9 || i === 16 || i === 24;
    const sleepMin = overload ? 360 + Math.round(r() * 2) * 30 : 420 + Math.round(r() * 2) * 30;
    const hourPlanned = Array(24).fill(0);
    const hourDone = Array(24).fill(0);
    const hoursUsed = [9, 10, 14, 15, 16, 19, 20, 21, 22];
    let taskPlannedMin = 0;
    let taskDoneMin = 0;
    for (const h of hoursUsed) {
      if (r() < 0.35) continue;
      const p = 30 + Math.round(r() * 6) * 5;
      const base = h >= 19 && h <= 20 ? 0.9 : h === 9 || h === 10 ? 0.72 : h >= 21 ? 0.55 : 0.45;
      const d = Math.min(p, Math.round((p * Math.min(1, base + (r() - 0.5) * 0.2)) / 5) * 5);
      hourPlanned[h] = p;
      hourDone[h] = d;
      taskPlannedMin += p;
      taskDoneMin += d;
    }
    const blocksTotal = 11 + Math.round(r() * 4);
    const blocksDone = Math.max(5, Math.round(blocksTotal * (0.62 + r() * 0.33)));
    const wd = weekday(date);
    const hasEx = [1, 3, 5].includes(wd);
    const schoolMin = wd === 0 ? 0 : wd === 6 ? 0 : [1, 3].includes(wd) ? 390 : 240;
    const workMin = [2, 4, 6].includes(wd) ? 210 : 0;
    logs[date] = {
      date,
      level: overload ? 3 : r() < 0.3 ? 1 : 0,
      overload,
      sleepMin,
      minutes: {
        sleep: sleepMin,
        school: schoolMin,
        work: workMin,
        task: taskPlannedMin,
        exercise: hasEx ? (overload ? 30 : 60) : 0,
        meal: overload ? 75 : 105,
        cooking: overload ? 0 : 30,
        commute: schoolMin || workMin ? 60 : 0,
        fun: overload ? 0 : 45 + Math.round(r() * 3) * 15,
      },
      blocksTotal,
      blocksDone: Math.min(blocksTotal, blocksDone),
      taskPlannedMin,
      taskDoneMin,
      hourPlanned,
      hourDone,
    };
  }
  return logs;
}

/** Dữ liệu mẫu bổ sung: giờ ngủ thực tế và số cốc nước 2 tuần gần đây. */
export function demoExtras(today: string) {
  const r = rng(99);
  const sleepActual: Record<string, { bed: number; wake: number }> = {};
  const water: Record<string, number> = {};
  for (let i = 14; i >= 0; i--) {
    const d = addDays(today, -i);
    // phần lớn các đêm ngủ 22:30–23:30, thỉnh thoảng thức khuya
    const late = r() < 0.2;
    const bed = late ? 60 + Math.round(r() * 3) * 15 : 1350 + Math.round(r() * 4) * 15;
    sleepActual[d] = { bed: bed % 1440, wake: 390 + Math.round(r() * 2) * 10 };
    if (i > 0) water[d] = 4 + Math.round(r() * 5);
  }
  water[today] = 2;
  return { sleepActual, water };
}

export interface ProfileTemplate {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  make: () => Profile;
}

/** Mẫu hồ sơ chọn 1 chạm khi bắt đầu. */
export const TEMPLATES: ProfileTemplate[] = [
  {
    id: "student-am",
    emoji: "🎒",
    title: "Sinh viên học buổi sáng",
    desc: "Học 7:30–11:30 từ T2–T6, gym tối T2/T4/T6",
    make: () => ({
      ...defaultProfile(),
      commitments: [{ id: uid(), label: "Học trên trường", kind: "school", days: [1, 2, 3, 4, 5], start: "07:30", end: "11:30" }],
    }),
  },
  {
    id: "student-pm",
    emoji: "☕",
    title: "Học buổi chiều + làm thêm",
    desc: "Học 13:00–17:00 T2–T6, làm thêm sáng T7 & CN",
    make: () => ({
      ...defaultProfile(),
      wakeTime: "07:00",
      meals: defaultProfile().meals.map((m) => (m.id === "breakfast" ? { ...m, time: "07:30" } : m.id === "lunch" ? { ...m, time: "11:45" } : m)),
      exercise: { enabled: true, kind: "Chạy bộ", time: "06:30", duration: 30, days: [2, 4, 6] },
      commitments: [
        { id: uid(), label: "Học trên trường", kind: "school", days: [1, 2, 3, 4, 5], start: "13:00", end: "17:00" },
        { id: uid(), label: "Làm thêm", kind: "work", days: [0, 6], start: "08:00", end: "12:00" },
      ],
    }),
  },
  {
    id: "office",
    emoji: "💼",
    title: "Người đi làm giờ hành chính",
    desc: "Làm 8:00–17:00 T2–T6, tập gym 18:00 T3/T5",
    make: () => ({
      ...defaultProfile(),
      commute: { enabled: true, minutes: 30 },
      exercise: { enabled: true, kind: "Gym", time: "18:00", duration: 60, days: [2, 4] },
      meals: defaultProfile().meals.map((m) => (m.id === "dinner" ? { ...m, time: "19:30" } : m)),
      commitments: [{ id: uid(), label: "Đi làm", kind: "work", days: [1, 2, 3, 4, 5], start: "08:00", end: "17:00" }],
    }),
  },
  {
    id: "custom",
    emoji: "✏️",
    title: "Tự thiết lập",
    desc: "Bắt đầu từ lịch trống, tự nhập giờ học / làm",
    make: () => defaultProfile(),
  },
];
