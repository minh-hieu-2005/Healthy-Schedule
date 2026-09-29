import { useState } from "react";
import type { Priority, Task } from "../engine/types";
import { Field, Modal, NumInput } from "./ui";
import { addDays, fmtDuration, todayStr } from "../engine/time";
import { useStore } from "../store/useStore";
import { PRIORITY_META } from "../lib/categories";

const QUICK = [30, 60, 90, 120, 180];

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

function TaskFormInner({ onClose, task, defaultDate }: { onClose: () => void; task?: Task | null; defaultDate?: string }) {
  const addTask = useStore((s) => s.addTask);
  const updateTask = useStore((s) => s.updateTask);
  const today = todayStr();
  const start = defaultDate && defaultDate > today ? defaultDate : today;
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [estimate, setEstimate] = useState(task?.estimate ?? 60);
  const [deadlineDate, setDeadlineDate] = useState(task?.deadlineDate ?? addDays(start, 1));
  const [deadlineTime, setDeadlineTime] = useState(task?.deadlineTime ?? "23:59");
  const [planDate, setPlanDate] = useState(task?.planDate ?? start);
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "normal");
  const [touched, setTouched] = useState(false);

  const errors: string[] = [];
  if (!title.trim()) errors.push("Hãy đặt tên cho task.");
  if (!task && deadlineDate < today) errors.push("Hạn nộp không được ở trong quá khứ.");
  if (planDate > deadlineDate) errors.push("Ngày bắt đầu làm phải trước hoặc bằng hạn nộp.");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (errors.length) return;
    const data = {
      title: title.trim(),
      description: description.trim(),
      estimate,
      deadlineDate,
      deadlineTime: deadlineTime || "23:59",
      planDate: planDate < today && !task ? today : planDate,
      priority,
    };
    if (task) updateTask(task.id, data);
    else addTask(data);
    onClose();
  };

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
        <Field label="Mô tả (không bắt buộc)">
          <textarea
            className="field min-h-20"
            value={description}
            maxLength={400}
            placeholder="Ghi chú thêm: yêu cầu của thầy cô, link tài liệu…"
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <div>
          <span className="label">Thời gian thực hiện dự tính</span>
          <div className="flex flex-wrap items-center gap-2">
            {QUICK.map((q) => (
              <button
                type="button"
                key={q}
                aria-pressed={estimate === q}
                onClick={() => setEstimate(q)}
                className={`focus-ring rounded-full px-3 py-1.5 text-sm font-semibold border ${
                  estimate === q ? "bg-brand text-white border-brand" : "bg-white border-line text-ink-2 hover:bg-brand-soft"
                }`}
              >
                {fmtDuration(q)}
              </button>
            ))}
            <span className="flex items-center gap-2 text-sm text-ink-2">
              hoặc
              <NumInput className="field w-24" min={5} max={720} value={estimate} onChange={setEstimate} aria-label="Số phút" />
              phút
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hạn nộp (ngày)">
            <input type="date" className="field" value={deadlineDate} min={task ? undefined : today} onChange={(e) => e.target.value && setDeadlineDate(e.target.value)} />
          </Field>
          <Field label="Giờ nộp">
            <input type="time" className="field" value={deadlineTime} onChange={(e) => setDeadlineTime(e.target.value)} />
          </Field>
        </div>
        <Field label="Bắt đầu làm từ ngày" hint="Mặc định là hôm nay. Smart Life sẽ xếp task vào lịch từ ngày này.">
          <input type="date" className="field" value={planDate} min={task ? undefined : today} max={deadlineDate} onChange={(e) => e.target.value && setPlanDate(e.target.value)} />
        </Field>
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
                  priority === p ? "border-brand bg-brand-soft text-brand-dark" : "border-line bg-white text-ink-2"
                }`}
              >
                {PRIORITY_META[p].label}
              </button>
            ))}
          </div>
          {priority === "high" && (
            <p className="text-xs text-ink-3 mt-1.5">Task ưu tiên cao được xếp vào khung giờ bạn làm việc năng suất nhất.</p>
          )}
        </div>
        {touched && errors.length > 0 && (
          <ul className="text-sm text-[#b3261e] bg-[#ffe9e7] rounded-xl p-3 space-y-1" role="alert">
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
