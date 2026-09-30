import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { WEEKDAY_SHORT } from "../engine/time";

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector<HTMLElement>("input,textarea,select,button")?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-[2px] p-0 sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`pop-in w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"} max-h-[92dvh] overflow-y-auto overscroll-contain bg-card rounded-t-3xl sm:rounded-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-6 shadow-2xl`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button className="focus-ring rounded-full p-2 hover:bg-brand-soft" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`focus-ring relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-brand" : "bg-control-off"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-card shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export function DaysPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Chọn ngày trong tuần">
      {order.map((d) => {
        const on = value.includes(d);
        return (
          <button
            key={d}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== d) : [...value, d].sort())}
            className={`focus-ring h-9 w-10 rounded-xl text-sm font-semibold transition-colors ${
              on ? "bg-brand text-white" : "bg-card border border-line text-ink-2 hover:bg-brand-soft"
            }`}
          >
            {WEEKDAY_SHORT[d]}
          </button>
        );
      })}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="block text-xs text-ink-3 mt-1">{hint}</span>}
    </label>
  );
}

export function ProgressRing({ value, size = 64, stroke = 7 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Hoàn thành ${Math.round(v * 100)}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-brand-soft)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--color-brand)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - v)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset .5s ease" }}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize={size / 4.2} fontWeight={700} fill="var(--color-ink)">
        {Math.round(v * 100)}%
      </text>
    </svg>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <h2 className="text-lg font-bold">{children}</h2>
      {action}
    </div>
  );
}

/** Ô nhập số: cho gõ tự do, chỉ giới hạn min/max khi rời ô. */
export function NumInput({
  value,
  onChange,
  min,
  max,
  step = 5,
  className = "field",
  ...rest
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  className?: string;
  "aria-label"?: string;
  id?: string;
}) {
  const [txt, setTxt] = useState(String(value));
  useEffect(() => {
    setTxt(String(value));
  }, [value]);
  const commit = () => {
    const n = Number(txt);
    const v = Number.isFinite(n) && txt.trim() !== "" ? Math.min(max, Math.max(min, Math.round(n))) : value;
    setTxt(String(v));
    if (v !== value) onChange(v);
  };
  return (
    <input
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      step={step}
      className={className}
      value={txt}
      onChange={(e) => setTxt(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
      {...rest}
    />
  );
}

/** Chọn giờ dạng 24h (hiển thị đúng kiểu Việt Nam trên mọi trình duyệt). */
export function TimeSelect({
  value,
  onChange,
  from = 0,
  to = 24 * 60 - 15,
  step = 15,
  className = "field",
  label,
  extra = [],
}: {
  value: number;
  onChange: (min: number) => void;
  from?: number;
  to?: number;
  step?: number;
  className?: string;
  label: string;
  /** các giờ lẻ muốn có trong danh sách (vd 23:59) */
  extra?: number[];
}) {
  const opts = new Set<number>(extra);
  // bắt đầu từ mốc tròn (vd 14:10 -> 14:15) để danh sách dễ đọc
  for (let m = Math.ceil(from / step) * step; m <= to; m += step) opts.add(m);
  opts.add(value);
  const list = [...opts].sort((a, b) => a - b);
  const fmt = (m: number) => {
    const mm = ((m % 1440) + 1440) % 1440;
    return `${String(Math.floor(mm / 60)).padStart(2, "0")}:${String(mm % 60).padStart(2, "0")}${m >= 1440 ? " (hôm sau)" : ""}`;
  };
  return (
    <select className={className} value={value} aria-label={label} onChange={(e) => onChange(Number(e.target.value))}>
      {list.map((m) => (
        <option key={m} value={m}>
          {fmt(m)}
        </option>
      ))}
    </select>
  );
}

/** Ô chọn giờ dạng chuỗi "HH:MM" (24h). */
export function TimeField({
  value,
  onChange,
  label,
  className = "field",
  from = 0,
  to = 23 * 60 + 45,
  step = 15,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  className?: string;
  from?: number;
  to?: number;
  step?: number;
}) {
  const [h, m] = value.split(":").map(Number);
  const cur = (h || 0) * 60 + (m || 0);
  return (
    <TimeSelect
      label={label}
      className={className}
      value={cur}
      from={from}
      to={to}
      step={step}
      onChange={(v) => onChange(`${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`)}
    />
  );
}
