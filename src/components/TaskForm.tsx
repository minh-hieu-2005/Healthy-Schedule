import { useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import type { Priority, Repeat, Subtask, Task } from "../engine/types";
import { Field, Modal, NumInput, TimeSelect } from "./ui";
import { addDays, fmtDateLong, fmtDuration, toMin, todayStr, WEEKDAY_LONG, weekday } from "../engine/time";
import { useStore } from "../store/useStore";
import { PRIORITY_META } from "../lib/categories";
import { uid } from "../engine/demo";

const QUICK = [30, 60, 90, 120, 180];
const pad = (n: number) => String(n).padStart(2, "0");
const toHHMM = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

export default function TaskForm({
  open,
  onClose,
  task,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  defaultDate?: string;
}) {
  if (!open) return null;
  return <TaskFormInner onClose={onClose} task={task} defaultDate={defaultDate} />;
}

/** Các lựa chọn nhanh cho hạn nộp. */
function dateChoices(today: string) {
  const out = [
    { date: today, label: "Hôm nay" },
    { date: addDays(today, 1), label: "Ngày mai" },
  ];
  for (let i = 2; i <= 6; i++) {
    const d = addDays(today, i);
    out.push({ date: d, label: WEEKDAY_LONG[weekday(d)].replace("Thứ ", "T").replace("Chủ nhật", "CN") });
  }
  out.push({ date: addDays(today, 7), label: "Tuần sau" });
  return out;
}

function TaskFormInner({ onClose, task, defaultDate }: { onClose: () => void; task?: Task | null; defaultDate?: string }) {
  const addTask = useStore((s) => s.addTask);
  const updateTask = useStore((s) => s.updateTask);
  const today = todayStr();
  const start = defaultDate && defaultDate > today ? defaultDate : today;
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [estimate, setEstimate] = useState(task?.estimate ?? 60);
  const [deadlineDate, setDeadlineDate] = useState(task?.deadlineDate ?? addDays(start, 1));
  const [deadlineTime, setDeadlineTime] = useState(toMin(task?.deadlineTime ?? "23:59"));
  const [planDate, setPlanDate] = useState(task?.planDate ?? start);
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "normal");
  const [repeat, setRepeat] = useState<Repeat>(task?.repeat ?? "none");
  const [subtasks, setSubtasks] = useState<Subtask[]>(task?.subtasks ?? []);
  const [newSub, setNewSub] = useState("");
  const [more, setMore] = useState(!!(task && (task.description || task.subtasks?.length || (task.repeat && task.repeat !== "none") || task.planDate > today)));
  const [otherDate, setOtherDate] = useState(false);
  const [touched, setTouched] = useState(false);

  const choices = dateChoices(today);
  const isChoice = choices.some((c) => c.date === deadlineDate);
  const effPlan = planDate > deadlineDate ? deadlineDate : planDate;

  const errors: string[] = [];
  if (!title.trim()) errors.push("Hãy đặt tên cho task.");
  if (!task && deadlineDate < today) errors.push("Hạn nộp không được ở trong quá khứ.");

  const addSub = () => {
    const t = newSub.trim();
    if (!t) return;
    setSubtasks([...subtasks, { id: uid(), title: t, done: false }]);
    setNewSub("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (errors.length) return;
    const data = {
      title: title.trim(),
      description: description.trim(),
      estimate,
      deadlineDate,
      deadlineTime: toHHMM(deadlineTime),
      planDate: effPlan < today && !task ? today : effPlan,
      priority,
      repeat,
      subtasks: newSub.trim() ? [...subtasks, { id: uid(), title: newSub.trim(), done: false }] : subtasks,
    };
    if (task) updateTask(task.id, data);
    else addTask(data);
    onClose();
  };

  const chip = (on: boolean) =>
    `focus-ring rounded-full px-3 py-1.5 text-sm font-semibold border transition-colors ${
      on ? "bg-brand text-white border-brand" : "bg-card border-line text-ink-2 hover:bg-brand-soft"
    }`;

  return (
    <Modal open onClose={onClose} title={task ? "Sửa task" : "Thêm task / deadline"}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Tên task *">
          <input
            className="field"
            value={title}
            maxLength={80}
            placeholder="Ví dụ: Làm slide thuyết trình nhóm"
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>

        <div>
          <span className="label">Cần khoảng bao lâu?</span>
          <div className="flex flex-wrap items-center gap-2">
            {QUICK.map((q) => (
              <button type="button" key={q} aria-pressed={estimate === q} onClick={() => setEstimate(q)} className={chip(estimate === q)}>
                {fmtDuration(q)}
              </button>
            ))}
            <span className="flex items-center gap-2 text-sm text-ink-2">
              hoặc
              <NumInput className="field w-20 py-1.5" min={5} max={720} value={estimate} onChange={setEstimate} aria-label="Số phút" />
              phút
            </span>
          </div>
        </div>

        <div>
          <span className="label">Hạn nộp</span>
          <div className="flex flex-wrap gap-2">
            {choices.map((c) => (
              <button
                type="button"
                key={c.date}
                aria-pressed={deadlineDate === c.date && !otherDate}
                onClick={() => {
                  setDeadlineDate(c.date);
                  setOtherDate(false);
                }}
                className={chip(deadlineDate === c.date && !otherDate)}
              >
                {c.label}
              </button>
            ))}
            <button type="button" aria-pressed={otherDate || !isChoice} onClick={() => setOtherDate(true)} className={chip(otherDate || !isChoice)}>
              Ngày khác…
            </button>
          </div>
          {(otherDate || !isChoice) && (
            <input
              type="date"
              className="field mt-2"
              aria-label="Chọn ngày hạn nộp"
              value={deadlineDate}
              min={task ? undefined : today}
              onChange={(e) => e.target.value && setDeadlineDate(e.target.value)}
            />
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm text-ink-2">
              📅 <b className="text-ink">{fmtDateLong(deadlineDate)}</b> lúc
            </span>
            <TimeSelect
              label="Giờ nộp"
              className="field w-28 py-1.5"
              value={deadlineTime}
              onChange={setDeadlineTime}
              from={6 * 60}
              to={23 * 60 + 45}
              step={15}
              extra={[23 * 60 + 59]}
            />
          </div>
        </div>

        <div>
          <span className="label">Mức ưu tiên</span>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Mức ưu tiên">
            {(["high", "normal", "low"] as Priority[]).map((p) => (
              <button
                type="button"
                key={p}
                role="radio"
                aria-checked={priority === p}
                onClick={() => setPriority(p)}
                className={`focus-ring rounded-xl py-2 text-sm font-semibold border-2 transition-colors ${
                  priority === p ? "border-brand bg-brand-soft text-brand-dark" : "border-line bg-card text-ink-2"
                }`}
              >
                {PRIORITY_META[p].label}
              </button>
            ))}
          </div>
          {priority === "high" && (
            <p className="text-xs text-ink-3 mt-1.5">Được xếp vào giờ bạn làm việc hiệu quả nhất và nhắc trước 24h, 3h, 1h.</p>
          )}
        </div>

        <button
          type="button"
          className="focus-ring flex w-full items-center gap-2 rounded-xl px-1 py-1 text-sm font-semibold text-brand"
          onClick={() => setMore(!more)}
          aria-expanded={more}
        >
          <ChevronDown size={16} className={`transition-transform ${more ? "rotate-180" : ""}`} />
          Thêm tuỳ chọn (mô tả, việc con, lặp lại)
        </button>

        {more && (
          <div className="space-y-4 rounded-2xl border border-line p-4">
            <Field label="Mô tả">
              <textarea
                className="field min-h-16"
                value={description}
                maxLength={400}
                placeholder="Yêu cầu của thầy cô, link tài liệu…"
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            <div>
              <span className="label">Việc con</span>
              {subtasks.length > 0 && (
                <ul className="space-y-1 mb-2">
                  {subtasks.map((st) => (
                    <li key={st.id} className="flex items-center gap-2 rounded-lg bg-bg px-2 py-1.5">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-brand"
                        checked={st.done}
                        aria-label={`Xong: ${st.title}`}
                        onChange={() => setSubtasks(subtasks.map((x) => (x.id === st.id ? { ...x, done: !x.done } : x)))}
                      />
                      <span className={`flex-1 text-sm ${st.done ? "line-through text-ink-3" : ""}`}>{st.title}</span>
                      <button
                        type="button"
                        className="focus-ring rounded p-1 text-ink-3 hover:text-danger"
                        onClick={() => setSubtasks(subtasks.filter((x) => x.id !== st.id))}
                        aria-label={`Xoá ${st.title}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <input
                  className="field py-1.5"
                  value={newSub}
                  maxLength={60}
                  placeholder="Ví dụ: Tìm tài liệu"
                  onChange={(e) => setNewSub(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSub();
                    }
                  }}
                  aria-label="Thêm việc con"
                />
                <button type="button" className="btn btn-ghost py-1.5 px-3" onClick={addSub} aria-label="Thêm việc con">
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <div>
              <span className="label">Lặp lại</span>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Lặp lại">
                {(
                  [
                    ["none", "Không"],
                    ["daily", "Hằng ngày"],
                    ["weekly", "Hằng tuần"],
                  ] as [Repeat, string][]
                ).map(([k, l]) => (
                  <button
                    type="button"
                    key={k}
                    role="radio"
                    aria-checked={repeat === k}
                    onClick={() => setRepeat(k)}
                    className={`focus-ring rounded-xl py-2 text-sm font-semibold border-2 ${
                      repeat === k ? "border-brand bg-brand-soft text-brand-dark" : "border-line bg-card text-ink-2"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {repeat !== "none" && <p className="text-xs text-ink-3 mt-1.5">Khi bạn hoàn thành, lần tiếp theo sẽ tự được tạo.</p>}
            </div>
            <div>
              <span className="label">Bắt đầu làm từ ngày</span>
              <div className="flex flex-wrap gap-2">
                {[today, addDays(today, 1), addDays(today, 2)]
                  .filter((d) => d <= deadlineDate)
                  .map((d, i) => (
                    <button type="button" key={d} onClick={() => setPlanDate(d)} className={chip(effPlan === d)} aria-pressed={effPlan === d}>
                      {["Hôm nay", "Ngày mai", "Ngày kia"][i]}
                    </button>
                  ))}
              </div>
              <p className="text-xs text-ink-3 mt-1.5">
                Smart Life xếp task vào lịch từ <b>{fmtDateLong(effPlan)}</b> trở đi (mặc định là hôm nay).
              </p>
            </div>
          </div>
        )}

        {touched && errors.length > 0 && (
          <ul className="text-sm text-danger bg-danger-soft rounded-xl p-3 space-y-1" role="alert">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Huỷ
          </button>
          <button type="submit" className="btn btn-primary">
            {task ? "Lưu thay đổi" : "Thêm vào lịch"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
