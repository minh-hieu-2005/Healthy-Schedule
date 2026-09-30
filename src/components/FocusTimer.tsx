import { useEffect, useState } from "react";
import { Check, CircleDashed, Maximize2, Minimize2, Pause, Play, X } from "lucide-react";
import { useFocus } from "../store/ui";
import { useStore } from "../store/useStore";
import { nowMin } from "../engine/time";

const mmss = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(ss).padStart(2, "0")}`;
};

/** Tìm phiên task tương ứng trong lịch hôm nay (lịch có thể vừa được xếp lại). */
function resolveBlockKey(date: string, blockKey: string, taskId?: string) {
  const plan = useStore.getState().plans[date];
  if (!plan) return null;
  if (plan.blocks.some((b) => b.key === blockKey)) return blockKey;
  if (!taskId) return null;
  const now = nowMin();
  const checked = new Set(useStore.getState().checks[date] ?? []);
  const cands = plan.blocks.filter((b) => b.taskId === taskId && !b.missed && !checked.has(b.key));
  return (cands.find((b) => b.start <= now && now < b.end) ?? cands.sort((a, b) => a.start - b.start)[0])?.key ?? null;
}

/** Chế độ tập trung: đồng hồ đếm ngược tới hết phiên làm việc. */
export default function FocusTimer() {
  const s = useFocus((st) => st.session);
  const { pause, resume, minimize, stop } = useFocus();
  const [, force] = useState(0);

  useEffect(() => {
    if (!s) return;
    const id = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [s]);

  useEffect(() => {
    if (!s || s.minimized) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") minimize(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s, minimize]);

  if (!s) return null;
  const paused = s.pausedLeft !== undefined;
  const left = paused ? s.pausedLeft! : s.endAt - Date.now();
  const total = Math.max(1, s.endAt - s.startedAt);
  const progress = Math.min(1, Math.max(0, 1 - left / total));
  const over = left <= 0;

  const finish = (half: boolean) => {
    const st = useStore.getState();
    const key = resolveBlockKey(s.date, s.blockKey, s.taskId);
    if (key) {
      if (half) st.markHalf(s.date, key);
      else if (!(st.checks[s.date] ?? []).includes(key)) st.toggleCheck(s.date, key);
    }
    stop();
  };

  if (s.minimized)
    return (
      <button
        onClick={() => minimize(false)}
        className="focus-ring fixed z-[45] left-3 bottom-[5.25rem] md:bottom-6 md:left-6 flex items-center gap-2 rounded-full bg-night text-white pl-3 pr-4 py-2 shadow-2xl"
        aria-label={`Đang tập trung: ${s.title}, còn ${mmss(left)}. Bấm để mở`}
      >
        <span className={`h-2.5 w-2.5 rounded-full ${paused ? "bg-amber-soft" : "bg-lime animate-pulse"}`} />
        <span className="text-sm font-bold tabular-nums">{over ? "Hết giờ" : mmss(left)}</span>
        <span className="text-xs text-white/70 max-w-[9rem] truncate">{s.title}</span>
        <Maximize2 size={14} className="text-white/70" />
      </button>
    );

  const R = 92;
  const C = 2 * Math.PI * R;
  return (
    <div className="fixed inset-0 z-[70] bg-night/95 text-white flex items-center justify-center p-5" role="dialog" aria-modal="true" aria-label="Chế độ tập trung">
      <div className="w-full max-w-sm text-center pop-in">
        <div className="flex justify-between">
          <button className="focus-ring rounded-full p-2 text-white/70 hover:bg-white/10" onClick={() => minimize(true)} aria-label="Thu nhỏ">
            <Minimize2 size={20} />
          </button>
          <button
            className="focus-ring rounded-full p-2 text-white/70 hover:bg-white/10"
            onClick={() => window.confirm("Dừng phiên tập trung? (Hoạt động chưa được đánh dấu xong)") && stop()}
            aria-label="Dừng"
          >
            <X size={20} />
          </button>
        </div>
        <p className="mt-2 text-sm font-semibold text-lime">🎯 Chế độ tập trung</p>
        <h2 className="mt-1 text-2xl font-extrabold leading-snug">{s.title}</h2>
        <div className="relative mx-auto mt-6 h-56 w-56">
          <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="100" cy="100" r={R} fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="10" />
            <circle
              cx="100"
              cy="100"
              r={R}
              fill="none"
              stroke="#d4ff3a"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - progress)}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center" aria-live="polite">
            <span className="text-5xl font-extrabold tabular-nums">{over ? "0:00" : mmss(left)}</span>
            <span className="text-sm text-white/70 mt-1">{over ? "Hết giờ rồi!" : paused ? "Đang tạm dừng" : "còn lại"}</span>
          </div>
        </div>
        <p className="mt-4 text-sm text-white/70">
          {over ? "Bạn đã làm xong phiên này chưa?" : "Cất điện thoại, tắt thông báo mạng xã hội. Bạn làm được!"}
        </p>
        <div className="mt-6 grid gap-2">
          <button className="btn btn-lime py-3 text-base" onClick={() => finish(false)}>
            <Check size={19} /> Xong phiên này
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn bg-white/10 text-white hover:bg-white/20" onClick={() => (paused ? resume() : pause())} disabled={over}>
              {paused ? <Play size={17} /> : <Pause size={17} />} {paused ? "Tiếp tục" : "Tạm dừng"}
            </button>
            <button className="btn bg-white/10 text-white hover:bg-white/20" onClick={() => finish(true)}>
              <CircleDashed size={17} /> Mới được một nửa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
