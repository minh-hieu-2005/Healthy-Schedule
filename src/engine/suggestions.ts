// Gợi ý phương án thay thế (tính năng Premium).
import type { Suggestion } from "./types";

const FOOD = [
  "Cơm gạo lứt + ức gà áp chảo + rau luộc",
  "Phở gà (ít mỡ, thêm rau)",
  "Salad cá ngừ + bánh mì nguyên cám",
  "Bún chả (ít nước chấm, nhiều rau)",
  "Poke bowl cá hồi",
  "Cơm tấm sườn nướng + đồ chua, bỏ mỡ hành",
  "Bánh mì trứng ốp la + sữa chua không đường",
  "Miến gà + rau cải",
  "Cơm văn phòng: cá kho + canh rau",
  "Gỏi cuốn tôm thịt (4–5 cuốn)",
];

const CARDIO = [
  "Nhảy dây 3 hiệp × 3 phút",
  "Đi bộ nhanh quanh khu nhà 15 phút",
  "Jumping jacks + squat + plank (bài 12 phút)",
  "Yoga giãn cơ 15 phút theo video",
  "Leo cầu thang 10 phút",
];

const QUICK_FUN = [
  "Nghe 3 bài nhạc yêu thích, không lướt mạng",
  "Đi dạo 10 phút ngoài trời",
  "Gọi điện 10 phút cho bạn thân",
  "Chơi 1 ván game ngắn rồi dừng",
];

const SLEEP = [
  "Ngủ trưa 20 phút (power nap) – không quá 30 phút",
  "Tối mai đi ngủ sớm hơn 30–60 phút để bù",
  "Tránh cà phê sau 15:00 để ngủ sâu hơn",
];

/** Chọn n phần tử "xoay vòng" theo ngày để mỗi ngày gợi ý một khác. */
function pick<T>(list: T[], seed: string, n: number): T[] {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const out: T[] = [];
  for (let i = 0; i < Math.min(n, list.length); i++) out.push(list[(h + i * 3) % list.length]);
  return [...new Set(out)];
}

export function buildSuggestions(o: {
  date: string;
  cookDropped: boolean;
  exShortened: boolean;
  funDropped: boolean;
  sleepCut: boolean;
  exerciseKind: string;
}): Suggestion[] {
  const s: Suggestion[] = [];
  if (o.cookDropped)
    s.push({
      id: "cook",
      forCat: "cooking",
      title: "Không kịp nấu ăn? Đặt đồ ship lành mạnh",
      options: pick(FOOD, o.date, 3),
    });
  if (o.exShortened)
    s.push({
      id: "ex",
      forCat: "exercise",
      title: `Không đủ giờ ${o.exerciseKind.toLowerCase() || "tập"}? Thử cardio nhẹ nhàng`,
      options: pick(CARDIO, o.date, 3),
    });
  if (o.funDropped)
    s.push({
      id: "fun",
      forCat: "fun",
      title: "Giải trí nhanh 10 phút để nạp lại năng lượng",
      options: pick(QUICK_FUN, o.date, 2),
    });
  if (o.sleepCut)
    s.push({ id: "sleep", forCat: "sleep", title: "Bù giấc ngủ thông minh", options: SLEEP });
  return s;
}

/** Gợi ý thay thế cho 1 hoạt động bất kỳ (bấm vào hoạt động trên lịch). */
export function alternativesFor(cat: string, date: string, exerciseKind: string): Suggestion | null {
  if (cat === "cooking" || cat === "meal")
    return { id: "alt-food", forCat: "cooking", title: "Thay vì nấu: đặt món ship lành mạnh", options: pick(FOOD, date + cat, 4) };
  if (cat === "exercise")
    return { id: "alt-ex", forCat: "exercise", title: `Thay cho ${exerciseKind.toLowerCase() || "buổi tập"}: cardio nhẹ`, options: pick(CARDIO, date, 4) };
  if (cat === "fun")
    return { id: "alt-fun", forCat: "fun", title: "Giải trí nhanh mà vẫn thư giãn", options: QUICK_FUN };
  return null;
}
