import { useState } from "react";
import {
  CalendarPlus,
  CalendarX2,
  Check,
  CircleDashed,
  Clock,
  Pencil,
  Pin,
  PinOff,
  Play,
  RotateCcw,
  SkipForward,
} from "lucide-react";
import type { Block, Task } from "../../engine/types";
import { addDays, fmtDateLong, fmtDateShort, fmtDuration, fmtTime, nowMin, relDayLabel, todayStr } from "../../engine/time";
import { CAT, PRIORITY_META } from "../../lib/categories";
import { useStore } from "../../store/useStore";
import { googleCalendarLink } from "../../engine/calendar";
import { Modal, TimeSelect } from "../ui";
import TaskForm from "../TaskForm";
import { roundUp5, startFocusNow } from "./NowNext";

const ROUTINE = /^(meal:|cook:|exercise$|fun$)/;

/** Chi tiết 1 hoạt động + các hành động điều chỉnh lịch. */
export default function BlockSheet({ block, date, onClose }: { block: Block | null; date: string; onClose: () => void }) {
  const s = useStore();
  const [editing, setEditing] = useState<Task | null>(null);
  const [picking, setPicking] = useState(false);
  const [time, setTime] = useState(0);
  if (editing)
    return (
      <TaskForm
        open
        task={editing}
        onClose={() => {
          setEditing(null);
          onClose();
        }}
      />
    );
  if (!block) return null;

  const today = todayStr();
  const m = CAT[block.cat];
  const task = block.taskId ? s.tasks.find((t) => t.id === block.taskId) : undefined;
  const checked = (s.checks[date] ?? []).includes(block.key);
  const done = checked || !!(task?.done && task.doneDate === date);
  const past = date < today;
  const isToday = date === today;
  const now = nowMin();
  const plan = s.plans[date];
  const lo = isToday ? Math.max(roundUp5(now), plan?.wake ?? 360) : plan?.wake ?? 360;
  const hi = (plan?.bed ?? 1380) - 15;
  const routine = ROUTINE.test(block.key);
  const commit = block.key.startsWith("commit:") || block.key.startsWith("commute:");
  const moved = s.overrides[date]?.move?.[block.key] !== undefined;
  const pinned = !!task && s.overrides[date]?.pin?.[task.id] !== undefined;

  const close = () => {
    setPicking(false);
    onClose();
  };
  const openPicker = () => {
    setTime(Math.min(hi, Math.max(Math.ceil(lo / 15) * 15, Math.ceil(block.start / 15) * 15)));
    setPicking(true);
  };
  const applyTime = () => {
    if (task) s.pinTask(date, task.id, time);
    else s.moveBlock(date, block.key, time);
    close();
  };

  const Action = ({
    icon: Icon,
    label,
    onClick,
    primary,
    disabled,
    hint,
  }: {
    icon: typeof Play;
    label: string;
    onClick: () => void;
    primary?: boolean;
    disabled?: boolean;
    hint?: string;
  }) => (
    <button
      className={`btn justify-start text-sm py-2.5 ${primary ? "btn-primary" : "btn-ghost"}`}
      onClick={onClick}
      disabled={disabled}
      title={hint}
    >
      <Icon size={17} /> {label}
      {hint && disabled && <span className="ml-auto text-[11px] font-normal opacity-80">{hint}</span>}
    </button>
  );

  return (
    <Modal open onClose={close} title={block.title}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl p-3" style={{ background: m.tint }}>
          <m.icon size={20} style={{ color: m.color }} />
          <span className="font-semibold">{m.label}</span>
          <span className="ml-auto text-sm font-semibold">
            {relDayLabel(date, today)} · {fmtTime(block.start)} – {fmtTime(block.end)} · {fmtDuration(block.end - block.start)}
          </span>
        </div>
        {block.userSet && <p className="text-xs text-brand font-semibold">📌 Giờ này do bạn tự chọn</p>}

        {task && (
          <div className="space-y-2 text-sm">
            {task.description && <p className="text-ink-2 whitespace-pre-line">{task.description}</p>}
            <p>
              <b>Hạn nộp:</b> {task.deadlineTime} · {fmtDateLong(task.deadlineDate)} · <b>Tổng:</b> {fmtDuration(task.estimate)}
            </p>
            <p className="flex flex-wrap gap-1.5">
              <span className={`chip ${PRIORITY_META[task.priority].cls}`}>{PRIORITY_META[task.priority].label}</span>
              {task.repeat && task.repeat !== "none" && (
                <span className="chip bg-sunken text-ink-2">🔁 {task.repeat === "daily" ? "Hằng ngày" : "Hằng tuần"}</span>
              )}
            </p>
            {!!task.subtasks?.length && (
              <ul className="rounded-2xl border border-line p-2 space-y-1">
                {task.subtasks.map((st) => (
                  <li key={st.id}>
                    <label className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-bg cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-brand"
                        checked={st.done}
                        onChange={() =>
                          s.updateTask(task.id, {
                            subtasks: task.subtasks!.map((x) => (x.id === st.id ? { ...x, done: !x.done } : x)),
                          })
                        }
                      />
                      <span className={st.done ? "line-through text-ink-3" : ""}>{st.title}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {picking ? (
          <div className="rounded-2xl border-2 border-brand/40 p-3 space-y-3">
            <p className="text-sm font-semibold">{task ? "Làm task này lúc mấy giờ?" : `Đổi giờ ${block.title.toLowerCase()} ${relDayLabel(date, today).toLowerCase()}`}</p>
            <TimeSelect label="Chọn giờ bắt đầu" value={time} onChange={setTime} from={lo} to={hi} step={15} />
            <p className="text-xs text-ink-3">Các hoạt động khác sẽ tự xếp lại quanh giờ bạn chọn. Giờ ngủ và giờ học/làm vẫn được giữ.</p>
            <div className="flex gap-2 justify-end">
              <button className="btn btn-ghost text-sm" onClick={() => setPicking(false)}>
                Huỷ
              </button>
              <button className="btn btn-primary text-sm" onClick={applyTime}>
                <Check size={16} /> Áp dụng
              </button>
            </div>
          </div>
        ) : past ? (
          <p className="text-sm text-ink-3">Ngày đã qua – chỉ xem lại.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {task && !done && isToday && (
              <Action
                icon={Play}
                label="Làm ngay bây giờ"
                primary
                onClick={() => {
                  startFocusNow(task, block);
                  close();
                }}
              />
            )}
            {task && !done && (
              <Action icon={Clock} label="Đổi giờ làm" onClick={openPicker} />
            )}
            {task && !done && (
              <Action
                icon={SkipForward}
                label={isToday ? "Để mai làm" : "Dời sang ngày sau"}
                disabled={task.deadlineDate <= date}
                hint={task.deadlineDate <= date ? "Hạn hôm nay" : undefined}
                onClick={() => {
                  s.postponeTask(task.id, addDays(date, 1));
                  close();
                }}
              />
            )}
            {task && pinned && (
              <Action
                icon={PinOff}
                label="Bỏ giờ đã chọn"
                onClick={() => {
                  s.pinTask(date, task.id, null);
                  close();
                }}
              />
            )}
            {task && !done && isToday && block.start <= nowMin() && !checked && (
              <Action
                icon={CircleDashed}
                label="Mới làm được một nửa"
                onClick={() => {
                  s.markHalf(date, block.key);
                  close();
                }}
              />
            )}
            {task && (
              <Action
                icon={Check}
                label={task.done ? "Đánh dấu chưa xong" : "Hoàn thành cả task"}
                onClick={() => {
                  s.setTaskDone(task.id, !task.done, date <= today ? date : today);
                  close();
                }}
              />
            )}
            {routine && (
              <Action icon={Clock} label="Đổi giờ hôm nay" onClick={openPicker} />
            )}
            {routine && moved && (
              <Action
                icon={RotateCcw}
                label="Về giờ mặc định"
                onClick={() => {
                  s.moveBlock(date, block.key, null);
                  close();
                }}
              />
            )}
            {(routine || commit) && (
              <Action
                icon={CalendarX2}
                label={block.key.startsWith("commit:") ? "Nghỉ buổi này" : "Bỏ qua hôm nay"}
                onClick={() => {
                  s.skipBlock(date, block.key, true);
                  close();
                }}
              />
            )}
            {task && (
              <a
                className="btn btn-ghost justify-start text-sm py-2.5"
                href={googleCalendarLink(task.title, date, block.start, block.end, task.description)}
                target="_blank"
                rel="noreferrer"
              >
                <CalendarPlus size={17} /> Thêm vào Google Calendar
              </a>
            )}
            {task && (
              <Action icon={Pencil} label="Sửa task" onClick={() => setEditing(task)} />
            )}
          </div>
        )}
        {block.cat === "sleep" && <p className="text-sm text-ink-2">Giờ ngủ tính từ hồ sơ của bạn. Đổi giờ thức dậy và số giờ ngủ trong Cài đặt → Cơ bản.</p>}
        {block.key.startsWith("commit:") && !past && (
          <p className="text-xs text-ink-3">Giờ học / làm cố định chỉnh trong Cài đặt → Học & làm. “Nghỉ buổi này” chỉ áp dụng cho {fmtDateShort(date)}.</p>
        )}
        {pinned && <p className="text-xs text-ink-3 flex items-center gap-1"><Pin size={12} /> Task đã được ghim giờ cho ngày này.</p>}
      </div>
    </Modal>
  );
}
