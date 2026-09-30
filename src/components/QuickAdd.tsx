import { useState } from "react";
import { CornerDownLeft, Lightbulb, Plus } from "lucide-react";
import { parseQuickAdd } from "../engine/quickadd";
import { addDays, todayStr } from "../engine/time";
import { useStore } from "../store/useStore";

/** Thêm nhanh task bằng 1 dòng: "Ôn thi 2h thứ 6 !" */
export default function QuickAdd({ onAdded }: { onAdded?: (id: string, title: string) => void }) {
  const addTask = useStore((s) => s.addTask);
  const [text, setText] = useState("");
  const [tip, setTip] = useState(false);
  const [last, setLast] = useState<string | null>(null);
  const today = todayStr();
  const p = parseQuickAdd(text, today);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!p.title) return;
    const deadlineDate = p.deadlineDate ?? addDays(today, 1);
    const id = addTask({
      title: p.title,
      description: "",
      estimate: p.estimate ?? 60,
      deadlineDate,
      deadlineTime: p.deadlineTime ?? "23:59",
      planDate: today,
      priority: p.priority ?? "normal",
      repeat: "none",
      subtasks: [],
    });
    setLast(p.title);
    setText("");
    onAdded?.(id, p.title);
    setTimeout(() => setLast(null), 4000);
  };

  return (
    <form onSubmit={submit} className="card p-2.5 md:p-3">
      <div className="flex items-center gap-2">
        <Plus size={20} className="text-brand ml-1.5 shrink-0" aria-hidden="true" />
        <input
          className="flex-1 min-w-0 bg-transparent py-2 text-[15px] placeholder:text-ink-3 focus:outline-none"
          placeholder="Thêm nhanh: Ôn thi Vĩ mô 2h thứ 6 !"
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Thêm nhanh task"
          maxLength={120}
        />
        <button
          type="button"
          className="focus-ring rounded-full p-2 text-ink-3 hover:bg-brand-soft hidden sm:inline-flex"
          onClick={() => setTip(!tip)}
          aria-label="Mẹo gõ nhanh"
          aria-expanded={tip}
        >
          <Lightbulb size={18} />
        </button>
        <button type="submit" className="btn btn-primary py-2 px-3.5 text-sm" disabled={!p.title}>
          <CornerDownLeft size={16} /> Thêm
        </button>
      </div>
      {(text.trim() || tip || last) && (
        <div className="px-2 pt-2 flex flex-wrap items-center gap-1.5 text-xs">
          {last && !text && <span className="text-ok font-semibold">✓ Đã thêm “{last}” vào lịch</span>}
          {text.trim() && (
            <>
              {p.chips.map((c) => (
                <span key={c} className="chip bg-brand-soft text-brand-dark">
                  {c}
                </span>
              ))}
              {!p.estimate && <span className="chip bg-sunken text-ink-3">⏱ 1 tiếng (mặc định)</span>}
              {!p.deadlineDate && <span className="chip bg-sunken text-ink-3">📅 Hạn ngày mai (mặc định)</span>}
            </>
          )}
          {(tip || (!text && !last)) && (
            <span className="text-ink-3">
              Mẹo: gõ <b>2h</b>, <b>30p</b>, <b>mai</b>, <b>thứ 6</b>, <b>5/10</b>, <b>lúc 17h</b>, thêm <b>!</b> nếu gấp.
            </span>
          )}
        </div>
      )}
    </form>
  );
}
