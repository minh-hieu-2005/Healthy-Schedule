// Tiện ích thời gian: "HH:MM" <-> phút, ngày "YYYY-MM-DD".

export const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const fmtTime = (min: number): string => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

export const fmtDuration = (min: number): string => {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} phút`;
  if (r === 0) return `${h} tiếng`;
  return `${h}h${String(r).padStart(2, "0")}`;
};

export const fmtHours = (min: number): string => {
  const h = min / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1).replace(".", ",")} tiếng`;
};

export const round5 = (n: number) => Math.round(n / 5) * 5;

export const todayStr = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const parseDate = (s: string): Date => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (s: string, n: number): string => {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return todayStr(d);
};

/** Số ngày từ a đến b (b - a). */
export const diffDays = (a: string, b: string): number =>
  Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000);

export const weekday = (s: string): number => parseDate(s).getDay();

export const WEEKDAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
export const WEEKDAY_LONG = [
  "Chủ nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];

export const fmtDateShort = (s: string): string => {
  const d = parseDate(s);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const fmtDateLong = (s: string): string =>
  `${WEEKDAY_LONG[weekday(s)]}, ${fmtDateShort(s)}`;

export const relDayLabel = (s: string, today: string): string => {
  const d = diffDays(today, s);
  if (d === 0) return "Hôm nay";
  if (d === 1) return "Ngày mai";
  if (d === -1) return "Hôm qua";
  return fmtDateLong(s);
};

export const nowMin = (d: Date = new Date()) => d.getHours() * 60 + d.getMinutes();
