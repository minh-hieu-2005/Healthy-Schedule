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
  sleep: { label: "Ngủ", icon: Moon, color: "#4a3aa7", tint: "#ecebf8" },
  meal: { label: "Ăn uống", icon: UtensilsCrossed, color: "#b27800", tint: "#fff4d6" },
  exercise: { label: "Vận động", icon: Dumbbell, color: "#128a60", tint: "#dcf6ec" },
  school: { label: "Đi học", icon: GraduationCap, color: "#2a78d6", tint: "#e3effc" },
  work: { label: "Đi làm", icon: Briefcase, color: "#2a78d6", tint: "#e3effc" },
  commute: { label: "Di chuyển", icon: Bus, color: "#6b6780", tint: "#f0eef5" },
  cooking: { label: "Nấu ăn", icon: ChefHat, color: "#b27800", tint: "#fff4d6" },
  fun: { label: "Giải trí", icon: Gamepad2, color: "#c2477a", tint: "#fde8f0" },
  task: { label: "Task", icon: Target, color: "#d4541f", tint: "#fdebe3" },
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
  high: { label: "Ưu tiên cao", cls: "bg-[#fdebe3] text-[#b8431a]" },
  normal: { label: "Bình thường", cls: "bg-brand-soft text-brand-dark" },
  low: { label: "Thấp", cls: "bg-[#f0eef5] text-ink-2" },
} as const;

export const LEVEL_META: Record<number, { cls: string; emoji: string; desc: string }> = {
  0: { cls: "bg-[#dcf6ec] text-[#0f7a55]", emoji: "🌿", desc: "Lịch thoải mái, đủ ngủ và có thời gian giải trí." },
  1: { cls: "bg-[#fff4d6] text-[#8a5d00]", emoji: "⚖️", desc: "Nhiều việc – đã tạm bỏ bớt hoạt động tuỳ chọn." },
  2: { cls: "bg-[#fdebe3] text-[#b8431a]", emoji: "🔥", desc: "Quá tải – đã rút ngắn ăn, ngủ, tập." },
  3: { cls: "bg-[#ffe1e1] text-[#b3261e]", emoji: "🔥", desc: "Quá tải – giấc ngủ ở mức tối thiểu 6 tiếng." },
};
