import { useEffect, useState } from "react";
import { Check, Coffee, Moon, Play, Zap } from "lucide-react";
import type { Block, DayPlan, Task } from "../../engine/types";
import { fmtDuration, fmtTime, nowMin, todayStr } from "../../engine/time";
import { CAT } from "../../lib/categories";
import { useFocus } from "../../store/ui";
import { useStore } from "../../store/useStore";

/** Thời gian hiện tại (phút), tự cập nhật mỗi 30 giây. */
export function useNowMin() {
  const [m, setM] = useState(nowMin());
  useEffect(() => {
    const id = setInterval(() => setM(nowMin()), 30000);
    return () => clearInterval(id);
  }, []);
  return m;
}

export const roundUp5 = (m: number) => Math.ceil(m / 5) * 5;

/** Bắt đầu tập trung cho một task: ghim vào bây giờ (nếu chưa tới giờ) rồi mở đồng hồ. */
export function startFocusNow(task: Task, block?: Block) {
  const st = useStore.getState();
  const date = todayStr();
  const now = nowMin();
  const inBlock = block && block.start <= now && now < block.end;
  let endMin: number;
  if (inBlock) endMin = block!.end;
  else {
    const start = roundUp5(now);
    st.pinTask(date, task.id, start);
    endMin = start + Math.min(90, Math.max(15, block ? block.end - block.start : task.estimate));
  }
  const end = new Date();
  end.setHours(0, endMin, 0, 0);
  useFocus.getState().start({
    date,
    blockKey: inBlock ? block!.key : "",
    taskId: task.id,
    title: task.title,
    endAt: end.getTime(),
  });
}

export default function NowNext({
  plan,
  isDone,
  onToggle,
  onOpen,
  taskMap,
}: {
  plan: DayPlan;
  isDone: (b: Block) => boolean;
  onToggle: (b: Block) => void;
  onOpen: (b: Block) => void;
  taskMap: Map<string, Task>;
}) {
  const now = useNowMin();
  const blocks = plan.blocks.filter((b) => !b.missed);
  const current = blocks.find((b) => b.start <= now && now < b.end && b.cat !== "sleep");
  const next = blocks.filter((b) => b.start > now && !isDone(b)).sort((a, b) => a.start - b.start)[0];
  const asleep = now >= plan.bed || now < plan.wake;

  // việc có thể làm sớm trong lúc rảnh: phiên task tiếp theo chưa xong
  const nextTask = blocks.filter((b) => b.cat === "task" && b.start > now && !isDone(b)).sort((a, b) => a.start - b.start)[0];

  const box = (b: Block, label: string, sub: string, big: boolean) => {
    const m = CAT[b.cat];
    return (
      <button
        onClick={() => onOpen(b)}
        className={`focus-ring w-full text-left flex items-center gap-3 rounded-2xl p-3 ${big ? "" : "opacity-95"}`}
        style={{ background: m.tint }}
      >
        <span className="h-10 w-10 shrink-0 rounded-xl bg-card/80 flex items-center justify-center" style={{ color: m.color }}>
          <m.icon size={20} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[11px] font-bold uppercase tracking-wide text-ink-3">{label}</span>
          <span className={`block font-bold leading-snug ${big ? "text-lg" : ""} ${isDone(b) ? "line-through opacity-60" : ""}`}>{b.title}</span>
          <span className="block text-xs text-ink-2">{sub}</span>
        </span>
      </button>
    );
  };

  if (asleep && !current)
    return (
      <section className="card p-4 flex items-center gap-3" aria-label="Bây giờ">
        <span className="h-10 w-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center">
          <Moon size={20} />
        </span>
        <p className="text-sm">
          <b>Đến giờ nghỉ ngơi rồi 😴</b> Ngủ đủ giấc để mai học tập hiệu quả hơn. Lịch ngày mai đã sẵn sàng.
        </p>
      </section>
    );

  const task = current?.taskId ? taskMap.get(current.taskId) : undefined;
  const pct = current ? Math.min(100, Math.round(((now - current.start) / (current.end - current.start)) * 100)) : 0;

  return (
    <section className="card p-3 md:p-4 space-y-2.5" aria-label="Đang diễn ra và tiếp theo">
      {current ? (
        <div>
          {box(current, "Đang diễn ra", `${fmtTime(current.start)} – ${fmtTime(current.end)} · còn ${fmtDuration(current.end - now)}`, true)}
          <div className="mt-2 h-1.5 rounded-full bg-sunken overflow-hidden" aria-hidden="true">
            <div className="h-full bg-brand rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {task && !isDone(current) && (
              <button className="btn btn-primary text-sm py-2" onClick={() => startFocusNow(task, current)}>
                <Play size={16} /> Bắt đầu tập trung
              </button>
            )}
            {!isDone(current) ? (
              <button className="btn btn-ghost text-sm py-2" onClick={() => onToggle(current)}>
                <Check size={16} /> Đã xong
              </button>
            ) : (
              <span className="chip bg-ok-soft text-ok text-sm py-1.5 px-3">✓ Đã xong</span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl bg-sunken p-3">
          <span className="h-10 w-10 shrink-0 rounded-xl bg-card flex items-center justify-center text-ink-2">
            <Coffee size={20} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink-3">Bây giờ · {fmtTime(now)}</p>
            <p className="font-bold">Thời gian trống{next ? ` đến ${fmtTime(next.start)}` : ""}</p>
          </div>
          {nextTask && nextTask.taskId && taskMap.get(nextTask.taskId) && next && next.start - now >= 20 && (
            <button className="btn btn-primary text-sm py-2 shrink-0" onClick={() => startFocusNow(taskMap.get(nextTask.taskId!)!, nextTask)}>
              <Zap size={16} /> Làm sớm
            </button>
          )}
        </div>
      )}
      {next && box(next, `Tiếp theo · sau ${fmtDuration(next.start - now)}`, `${fmtTime(next.start)} – ${fmtTime(next.end)}`, false)}
    </section>
  );
}
