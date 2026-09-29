// Kiểu dữ liệu dùng chung cho toàn bộ Smart Life.

/** Nhóm hoạt động — quyết định màu sắc, icon và cách thống kê. */
export type Category =
  | "sleep" // ngủ
  | "meal" // ăn
  | "exercise" // tập luyện
  | "school" // đi học
  | "work" // đi làm
  | "commute" // di chuyển
  | "cooking" // nấu ăn
  | "fun" // giải trí
  | "task"; // task / deadline

export type Priority = "low" | "normal" | "high";

export interface Commitment {
  id: string;
  label: string;
  kind: "school" | "work";
  /** 0 = Chủ nhật, 1 = Thứ 2, ... 6 = Thứ 7 */
  days: number[];
  start: string; // "07:30"
  end: string; // "11:30"
}

export type MealId = "breakfast" | "lunch" | "dinner";

export interface MealSetting {
  id: MealId;
  enabled: boolean;
  time: string;
  duration: number; // phút
  /** Có tự nấu bữa này không (hoạt động optional "nấu ăn"). */
  cook: boolean;
}

export interface Profile {
  name: string;
  wakeTime: string; // giờ thức dậy, vd "06:30"
  sleepTarget: number; // số phút ngủ mong muốn, vd 480 = 8 tiếng
  meals: MealSetting[];
  exercise: {
    enabled: boolean;
    kind: string; // "Gym", "Chạy bộ", ...
    time: string;
    duration: number;
    days: number[];
  };
  commitments: Commitment[];
  /** Hoạt động optional */
  commute: { enabled: boolean; minutes: number };
  cooking: { enabled: boolean; minutes: number };
  fun: { enabled: boolean; label: string; time: string; minutes: number };
}

export interface Task {
  id: string;
  title: string;
  description: string;
  estimate: number; // thời gian thực hiện dự tính (phút)
  deadlineDate: string; // "YYYY-MM-DD"
  deadlineTime: string; // "23:59"
  planDate: string; // ngày muốn bắt đầu làm
  priority: Priority;
  done: boolean;
  doneDate?: string;
  createdAt: number;
}

export interface Block {
  key: string;
  cat: Category;
  title: string;
  start: number; // phút tính từ 00:00 của ngày (có thể > 1440 nếu sau nửa đêm)
  end: number;
  taskId?: string;
  note?: string;
  /** Hoạt động đã bị rút ngắn so với bình thường */
  shortened?: boolean;
  /** Task được làm tranh thủ trong giờ học (Premium) */
  atSchool?: boolean;
  /** Phiên task đã qua giờ mà chưa tick — task được xếp lại phần còn thiếu */
  missed?: boolean;
}

export type WarningKind = "danger" | "warning" | "info" | "success";

export interface PlanWarning {
  kind: WarningKind;
  title: string;
  detail?: string;
}

export interface Suggestion {
  id: string;
  forCat: Category;
  title: string;
  options: string[];
}

export interface DayPlan {
  date: string;
  level: number;
  levelName: string;
  overload: boolean;
  urgent: boolean;
  sleepMin: number;
  wake: number;
  bed: number;
  blocks: Block[];
  moved: { taskId: string; title: string }[];
  unfit: { taskId: string; title: string; missing: number }[];
  overloadBlocked: boolean;
  warnings: PlanWarning[];
  suggestions: Suggestion[];
  freeMin: number;
  /** chữ ký dữ liệu đầu vào — đổi thì cần xếp lại lịch */
  sig?: string;
}

/** Tóm tắt một ngày — dùng cho thống kê và dự đoán. */
export interface DayLog {
  date: string;
  level: number;
  overload: boolean;
  sleepMin: number;
  minutes: Partial<Record<Category, number>>;
  blocksTotal: number;
  blocksDone: number;
  taskPlannedMin: number;
  taskDoneMin: number;
  /** số phút task đã lên lịch / đã hoàn thành theo từng giờ (0..23) */
  hourPlanned: number[];
  hourDone: number[];
}

export interface Prediction {
  enoughData: boolean;
  sampleDays: number;
  peakStart: number | null; // giờ, vd 9
  peakEnd: number | null; // vd 11
  hourRate: { hour: number; rate: number; planned: number }[];
  expectedFocusMin: number;
  completionRate: number;
  tip: string;
}
