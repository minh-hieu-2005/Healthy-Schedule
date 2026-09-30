import {
  Briefcase,
  Bus,
  ChefHat,
  Dumbbell,
  Gamepad2,
  GraduationCap,
  Moon,
  Target,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "../engine/types";

export interface CatMeta {
  label: string;
  icon: LucideIcon;
  color: string; // màu đậm (icon, viền)
  tint: string; // nền nhạt
}

export const CAT: Record<Category, CatMeta> = {
  sleep: { label: "Ngủ", icon: Moon, color: "var(--cat-sleep)", tint: "var(--tint-sleep)" },
  meal: { label: "Ăn uống", icon: UtensilsCrossed, color: "var(--cat-meal)", tint: "var(--tint-meal)" },
  exercise: { label: "Vận động", icon: Dumbbell, color: "var(--cat-exercise)", tint: "var(--tint-exercise)" },
  school: { label: "Đi học", icon: GraduationCap, color: "var(--cat-study)", tint: "var(--tint-study)" },
  work: { label: "Đi làm", icon: Briefcase, color: "var(--cat-study)", tint: "var(--tint-study)" },
  commute: { label: "Di chuyển", icon: Bus, color: "var(--cat-commute)", tint: "var(--tint-commute)" },
  cooking: { label: "Nấu ăn", icon: ChefHat, color: "var(--cat-meal)", tint: "var(--tint-meal)" },
  fun: { label: "Giải trí", icon: Gamepad2, color: "var(--cat-fun)", tint: "var(--tint-fun)" },
  task: { label: "Task", icon: Target, color: "var(--cat-task)", tint: "var(--tint-task)" },
};

/** Nhóm dùng cho biểu đồ (thứ tự cố định = thứ tự màu đã kiểm định). */
export const CHART_GROUPS = [
  { id: "study", label: "Học / Làm", color: "#2a78d6", cats: ["school", "work"] as Category[] },
  { id: "task", label: "Task", color: "#eb6834", cats: ["task"] as Category[] },
  { id: "exercise", label: "Vận động", color: "#1baf7a", cats: ["exercise"] as Category[] },
  { id: "meal", label: "Ăn uống & nấu ăn", color: "#eda100", cats: ["meal", "cooking"] as Category[] },
  { id: "fun", label: "Giải trí", color: "#e87ba4", cats: ["fun"] as Category[] },
] as const;

export const PRIORITY_META = {
  high: { label: "Ưu tiên cao", cls: "bg-hot-soft text-hot" },
  normal: { label: "Bình thường", cls: "bg-brand-soft text-brand-dark" },
  low: { label: "Thấp", cls: "bg-sunken text-ink-2" },
} as const;

export const LEVEL_META: Record<number, { cls: string; emoji: string; desc: string }> = {
  0: { cls: "bg-ok-soft text-ok", emoji: "🌿", desc: "Lịch thoải mái, đủ ngủ và có thời gian giải trí." },
  1: { cls: "bg-amber-soft text-amber", emoji: "⚖️", desc: "Nhiều việc – đã tạm bỏ bớt hoạt động tuỳ chọn." },
  2: { cls: "bg-hot-soft text-hot", emoji: "🔥", desc: "Quá tải – đã rút ngắn ăn, ngủ, tập." },
  3: { cls: "bg-danger-soft text-danger", emoji: "🔥", desc: "Quá tải – giấc ngủ ở mức tối thiểu 6 tiếng." },
};
