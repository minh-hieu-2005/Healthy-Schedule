import { useMemo, useState } from "react";
import { CalendarClock, Check, Clock3, Pencil, Plus, Trash2 } from "lucide-react";
import { peakFor, useStore } from "../store/useStore";
import { planRange } from "../engine/scheduler";
import type { Task } from "../engine/types";
import { diffDays, fmtDateShort, fmtDuration, fmtTime, relDayLabel, todayStr } from "../engine/time";
import { PRIORITY_META } from "../lib/categories";
import TaskForm from "../components/TaskForm";

type Tab = "pending" | "done";

export default function Tasks() {
  const s = useStore();
  const today = todayStr();
  const [tab, setTab] = useState<Tab>("pending");
  const [editing, setEditing] = useState<Task | null>(null);
  const [adding, setAdding] = useState(false);

  const range = useMemo(
    () =>
      s.profile
        ? planRange(
            {
              profile: s.profile,
              tasks: s.tasks,
              logs: s.logs,
              today,
              peak: peakFor(s.logs, today),
              todayPlan: s.plans[today],
            },
            14,
          )
        : [],
    [s.profile, s.tasks, s.logs, s.plans, today],
  );

  const schedule = (id: string) => {
    const out: { date: string; start: number; end: number }[] = [];
    for (const p of range) for (const b of p.blocks) if (b.taskId === id && !b.missed) out.push({ date: p.date, start: b.start, end: b.end });
    return out;
  };
  const unfitDay = (id: string) => range.find((p) => p.unfit.some((u) => u.taskId === id))?.date;

  const pending = s.tasks
    .filter((t) => !t.done)
    .sort((a, b) => `${a.deadlineDate}${a.deadlineTime}`.localeCompare(`${b.deadlineDate}${b.deadlineTime}`));
  const done = s.tasks.filter((t) => t.done).sort((a, b) => (b.doneDate ?? "").localeCompare(a.doneDate ?? ""));
  const list = tab === "pending" ? pending : done;
  const totalMin = pending.reduce((a, t) => a + t.estimate, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold">Task & deadline</h1>
          <p className="text-ink-2 mt-1">
            {pending.length} việc đang chờ · tổng khoảng {fmtDuration(totalMin)}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>
          <Plus size={18} /> Thêm task
        </button>
      </div>

      <div className="inline-flex rounded-full bg-white border border-line p-1" role="tablist">
        {(
          [
            ["pending", `Đang chờ (${pending.length})`],
            ["done", `Đã xong (${done.length})`],
          ] as [Tab, string][]
        ).map(([k, l]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`focus-ring rounded-full px-4 py-1.5 text-sm font-semibold ${tab === k ? "bg-ink text-white" : "text-ink-2"}`}
          >
            {l}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-4xl">{tab === "pending" ? "🎉" : "📝"}</p>
          <p className="mt-3 font-semibold">{tab === "pending" ? "Không còn việc nào đang chờ!" : "Chưa có task nào hoàn thành."}</p>
          {tab === "pending" && (
            <button className="btn btn-primary mt-4" onClick={() => setAdding(true)}>
              <Plus size={18} /> Thêm task đầu tiên
            </button>
          )}
        </div>
      ) : (
        <ul className="grid md:grid-cols-2 gap-3">
          {list.map((t) => {
            const left = diffDays(today, t.deadlineDate);
            const sch = schedule(t.id);
            const firstUnfit = unfitDay(t.id);
            return (
              <li key={t.id} className="card p-4 flex gap-3">
                <button
                  onClick={() => s.setTaskDone(t.id, !t.done)}
                  aria-pressed={t.done}
                  aria-label={t.done ? `Đánh dấu chưa xong ${t.title}` : `Hoàn thành ${t.title}`}
                  className={`focus-ring mt-0.5 h-7 w-7 shrink-0 rounded-full border-2 flex items-center justify-center ${
                    t.done ? "bg-brand border-brand text-white" : "border-[#c9c3dc] hover:border-brand"
                  }`}
                >
                  {t.done && <Check size={15} strokeWidth={3} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <p className={`font-semibold flex-1 ${t.done ? "line-through text-ink-3" : ""}`}>{t.title}</p>
                    <button className="focus-ring rounded-lg p-1.5 text-ink-3 hover:bg-brand-soft" onClick={() => setEditing(t)} aria-label={`Sửa ${t.title}`}>
                      <Pencil size={16} />
                    </button>
                    <button
                      className="focus-ring rounded-lg p-1.5 text-ink-3 hover:bg-coral-soft hover:text-[#c2361a]"
                      onClick={() => window.confirm(`Xoá task "${t.title}"?`) && s.deleteTask(t.id)}
                      aria-label={`Xoá ${t.title}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {t.description && <p className="text-sm text-ink-2 mt-0.5 line-clamp-2">{t.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className={`chip ${PRIORITY_META[t.priority].cls}`}>{PRIORITY_META[t.priority].label}</span>
                    <span className="chip bg-[#f0eef5] text-ink-2">
                      <Clock3 size={12} /> {fmtDuration(t.estimate)}
                    </span>
                    <span
                      className={`chip ${
                        t.done
                          ? "bg-[#f0eef5] text-ink-2"
                          : left < 0
                            ? "bg-[#ffe1e1] text-[#b3261e]"
                            : left <= 1
                              ? "bg-coral-soft text-[#b8431a]"
                              : "bg-[#f0eef5] text-ink-2"
                      }`}
                    >
                      <CalendarClock size={12} /> Hạn {t.deadlineTime} {fmtDateShort(t.deadlineDate)}
                      {!t.done && (left < 0 ? " · quá hạn" : left === 0 ? " · hôm nay" : ` · còn ${left} ngày`)}
                    </span>
                  </div>
                  {!t.done && (
                    <p className="mt-2 text-xs text-ink-3">
                      {sch.length > 0
                        ? `Đã xếp: ${summarizeSchedule(sch, today)}`
                        : firstUnfit
                          ? `⚠️ Không đủ thời gian ${relDayLabel(firstUnfit, today).toLowerCase()} – xem cảnh báo trên lịch`
                          : "Chưa xếp được trong 14 ngày tới"}
                      {firstUnfit && sch.length > 0 && " · ⚠️ còn thiếu thời gian"}
                    </p>
                  )}
                  {t.done && t.doneDate && <p className="mt-2 text-xs text-ink-3">Hoàn thành {relDayLabel(t.doneDate, today).toLowerCase()}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <TaskForm open={adding} onClose={() => setAdding(false)} />
      <TaskForm open={!!editing} task={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function summarizeSchedule(sch: { date: string; start: number; end: number }[], today: string) {
  const byDay = new Map<string, { start: number; end: number }[]>();
  for (const x of sch) byDay.set(x.date, [...(byDay.get(x.date) ?? []), x]);
  return [...byDay.entries()]
    .slice(0, 2)
    .map(([d, xs]) => `${relDayLabel(d, today).toLowerCase()} ${xs.map((x) => `${fmtTime(x.start)}–${fmtTime(x.end)}`).join(", ")}`)
    .join(" · ") + (byDay.size > 2 ? " …" : "");
}
