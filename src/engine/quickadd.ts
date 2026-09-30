// Thêm nhanh task bằng 1 dòng, hiểu cách gõ tự nhiên của người Việt.
// Ví dụ: "Ôn thi Vĩ mô 2h thứ 6 !"  -> 2 tiếng, hạn thứ Sáu, ưu tiên cao
//        "Nộp bài 30p mai lúc 17h"  -> 30 phút, hạn ngày mai 17:00
import type { Priority } from "./types";
import { addDays, diffDays, todayStr, weekday } from "./time";

export interface QuickParse {
  title: string;
  estimate?: number;
  deadlineDate?: string;
  deadlineTime?: string;
  priority?: Priority;
  /** nhãn mô tả những gì đã hiểu, để hiện cho người dùng */
  chips: string[];
}

const WD: Record<string, number> = {
  "2": 1, hai: 1, "3": 2, ba: 2, "4": 3, "tư": 3, tu: 3, "5": 4, "năm": 4, nam: 4,
  "6": 5, "sáu": 5, sau: 5, "7": 6, "bảy": 6, bay: 6,
};
const WD_NAME = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

const pad = (n: number) => String(n).padStart(2, "0");

/** Ngày gần nhất (kể cả hôm nay) rơi vào thứ `wd`. */
function nextWeekday(today: string, wd: number) {
  const diff = (wd - weekday(today) + 7) % 7;
  return addDays(today, diff);
}

export function parseQuickAdd(input: string, today: string = todayStr()): QuickParse {
  let s = ` ${input.trim()} `;
  const out: QuickParse = { title: "", chips: [] };
  const take = (re: RegExp, fn: (m: RegExpMatchArray) => boolean | void) => {
    const m = s.match(re);
    if (m && fn(m) !== false) s = s.replace(m[0], " ");
  };

  // ưu tiên cao: "!" hoặc từ khoá
  take(/\s(!+|gấp|khẩn|quan trọng)(?=\s)/i, () => {
    out.priority = "high";
  });

  // giờ nộp: "lúc 17h", "trước 17h30", "@17:30", "17:30"
  take(/\s(?:lúc|trước|@)\s*(\d{1,2})(?:[:h](\d{2}))?h?(?=\s)/i, (m) => {
    const h = Number(m[1]);
    const mi = Number(m[2] ?? 0);
    if (h > 23 || mi > 59) return false;
    out.deadlineTime = `${pad(h)}:${pad(mi)}`;
  });
  if (!out.deadlineTime)
    take(/\s(\d{1,2}):(\d{2})(?=\s)/, (m) => {
      const h = Number(m[1]);
      const mi = Number(m[2]);
      if (h > 23 || mi > 59) return false;
      out.deadlineTime = `${pad(h)}:${pad(mi)}`;
    });

  // thời lượng: "2h", "1h30", "1,5 tiếng", "45p", "90 phút"
  take(/\s(\d+(?:[.,]\d+)?)\s*(?:h|g|giờ|tiếng)\s*(\d{1,2})?\s*(?:p|ph|phút)?(?=\s)/i, (m) => {
    const h = Number(m[1].replace(",", "."));
    const extra = Number(m[2] ?? 0);
    const min = Math.round(h * 60 + extra);
    if (!min || min > 12 * 60) return false;
    out.estimate = min;
  });
  if (!out.estimate)
    take(/\s(\d{1,3})\s*(?:p|ph|phút|m)(?=\s)/i, (m) => {
      const min = Number(m[1]);
      if (!min || min > 720) return false;
      out.estimate = min;
    });

  // ngày: hôm nay / mai / ngày kia / thứ X / CN / tuần sau / dd/mm
  take(/\s(hôm nay|hnay|nay)(?=\s)/i, () => {
    out.deadlineDate = today;
  });
  if (!out.deadlineDate)
    // "mai" viết thường mới hiểu là ngày mai ("chị Mai" là tên người)
    take(/\s(ngày mai|Ngày mai|mai)(?=\s)/, () => {
      out.deadlineDate = addDays(today, 1);
    });
  if (!out.deadlineDate)
    take(/\s(ngày kia|mốt)(?=\s)/i, () => {
      out.deadlineDate = addDays(today, 2);
    });
  if (!out.deadlineDate)
    take(/\s(?:thứ|t)\s*(2|3|4|5|6|7|hai|ba|tư|tu|năm|nam|sáu|sau|bảy|bay)(?=\s)/i, (m) => {
      out.deadlineDate = nextWeekday(today, WD[m[1].toLowerCase()]);
    });
  if (!out.deadlineDate)
    take(/\s(cn|chủ nhật)(?=\s)/i, () => {
      out.deadlineDate = nextWeekday(today, 0);
    });
  if (!out.deadlineDate)
    take(/\s(tuần sau|tuần tới)(?=\s)/i, () => {
      out.deadlineDate = addDays(today, 7);
    });
  if (!out.deadlineDate)
    take(/\s(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?(?=\s)/, (m) => {
      const d = Number(m[1]);
      const mo = Number(m[2]);
      if (d < 1 || d > 31 || mo < 1 || mo > 12) return false;
      let y = m[3] ? Number(m[3]) : Number(today.slice(0, 4));
      let iso = `${y}-${pad(mo)}-${pad(d)}`;
      if (!m[3] && iso < today) {
        y += 1;
        iso = `${y}-${pad(mo)}-${pad(d)}`;
      }
      out.deadlineDate = iso;
    });

  out.title = s.replace(/\s+/g, " ").replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, "").trim();

  if (out.estimate) out.chips.push(`⏱ ${out.estimate >= 60 ? `${Math.floor(out.estimate / 60)}h${out.estimate % 60 ? pad(out.estimate % 60) : ""}` : `${out.estimate} phút`}`);
  if (out.deadlineDate) {
    const diff = diffDays(today, out.deadlineDate);
    const name = diff === 0 ? "Hôm nay" : diff === 1 ? "Ngày mai" : `${WD_NAME[weekday(out.deadlineDate)]} ${out.deadlineDate.slice(8)}/${out.deadlineDate.slice(5, 7)}`;
    out.chips.push(`📅 ${name}`);
  }
  if (out.deadlineTime) out.chips.push(`🕔 ${out.deadlineTime}`);
  if (out.priority === "high") out.chips.push("❗ Ưu tiên cao");
  return out;
}
