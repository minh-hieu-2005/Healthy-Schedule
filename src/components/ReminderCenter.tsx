import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlarmClock, Bell, Droplets, Moon, Play, Sun, X } from "lucide-react";
import { useStore } from "../store/useStore";
import { useFocus, useInbox, type InboxItem } from "../store/ui";
import { dueReminders, type Reminder, type TodayInfo } from "../engine/reminders";
import { todayStr } from "../engine/time";
import { systemNotify } from "../lib/notify";

const CHECK_EVERY = 20_000; // kiểm tra mỗi 20 giây
const SNOOZE_MIN = 10;
const TOAST_MS = 12_000; // toast tự ẩn sau 12 giây (vẫn còn trong hộp 🔔)

const snoozed: Record<string, number> = {};

function todayInfo(): TodayInfo | undefined {
  const st = useStore.getState();
  const date = todayStr();
  const plan = st.plans[date];
  if (!plan) return undefined;
  const checked = new Set(st.checks[date] ?? []);
  const doneTask = new Set(st.tasks.filter((t) => t.done).map((t) => t.id));
  // task vừa tạo trong 10 phút hoặc đang mở chế độ tập trung -> không nhắc "đến giờ bắt đầu"
  const fresh = new Set(st.tasks.filter((t) => Date.now() - t.createdAt < 10 * 60_000).map((t) => t.id));
  const focusing = useFocus.getState().session?.taskId;
  return {
    date,
    wake: plan.wake,
    bed: plan.bed,
    blocks: plan.blocks
      .filter((b) => !b.missed)
      .map((b) => ({
        key: b.key,
        title: b.title,
        start: b.start,
        end: b.end,
        cat: b.cat,
        done: checked.has(b.key) || (!!b.taskId && doneTask.has(b.taskId)),
        quiet: !!b.taskId && (fresh.has(b.taskId) || b.taskId === focusing),
      })),
  };
}

/** Chạy nền: kiểm tra định kỳ và đẩy nhắc nhở vào hộp thông báo. */
export function useReminderTicker() {
  useEffect(() => {
    const tick = () => {
      const st = useStore.getState();
      if (!st.profile) return;
      const r = st.reminders;
      const due = dueReminders({
        now: new Date(),
        tasks: st.tasks,
        water: r.water,
        waterTimes: r.waterTimes,
        deadline: r.deadline,
        start: r.start,
        startLead: r.startLead,
        daily: r.daily,
        today: todayInfo(),
        notified: st.notified,
        snoozed,
      });
      if (!due.length) return;
      st.markNotified(due.flatMap((d) => d.marks));
      useInbox.getState().push(due);
      if (document.visibilityState !== "visible") for (const d of due) void systemNotify(d.title, d.body, d.id);
    };
    tick();
    const id = setInterval(tick, CHECK_EVERY);
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
}

const ICON = { water: Droplets, deadline: AlarmClock, start: Play, morning: Sun, evening: Moon };
const TONE = {
  water: "bg-sky-soft text-sky",
  deadline: "bg-hot-soft text-hot",
  start: "bg-brand-soft text-brand",
  morning: "bg-amber-soft text-amber",
  evening: "bg-brand-soft text-brand",
};

interface Action {
  label: string;
  primary: boolean;
  run: () => void;
}

/** Các nút hành động cho từng loại nhắc nhở. */
function useActions() {
  const nav = useNavigate();
  return (r: Reminder, done: () => void): Action[] => {
    const snooze = () => {
      snoozed[r.id] = Date.now() + SNOOZE_MIN * 60000;
      // cho phép nhắc lại sau khi hết thời gian hoãn
      const st = useStore.getState();
      const rest = { ...st.notified };
      delete rest[r.id];
      useStore.setState({ notified: rest });
      done();
    };
    switch (r.kind) {
      case "water":
        return [
          { label: `Nhắc lại sau ${SNOOZE_MIN} phút`, primary: false, run: snooze },
          {
            label: "Đã uống 💧",
            primary: true,
            run: () => {
              useStore.getState().addWater(todayStr());
              done();
            },
          },
        ];
      case "deadline":
        return [
          { label: "Đã hiểu", primary: false, run: done },
          {
            label: "Xem task",
            primary: true,
            run: () => {
              done();
              nav("/task");
            },
          },
        ];
      case "start":
        return [
          { label: "Để sau", primary: false, run: done },
          {
            label: "Bắt đầu tập trung",
            primary: true,
            run: () => {
              const key = r.id.split(":").slice(2).join(":");
              const date = todayStr();
              const b = useStore.getState().plans[date]?.blocks.find((x) => x.key === key);
              if (b) {
                const end = new Date();
                end.setHours(0, b.end, 0, 0);
                useFocus.getState().start({
                  date,
                  blockKey: b.key,
                  taskId: b.taskId,
                  title: b.title,
                  endAt: Math.max(end.getTime(), Date.now() + 5 * 60000),
                });
              }
              done();
              nav("/hom-nay");
            },
          },
        ];
      case "morning":
        return [
          {
            label: "Xem lịch hôm nay",
            primary: true,
            run: () => {
              done();
              nav("/hom-nay");
            },
          },
        ];
      case "evening":
        return [
          {
            label: "Xem thống kê",
            primary: true,
            run: () => {
              done();
              nav("/thong-ke");
            },
          },
        ];
    }
  };
}

/** Toast nhỏ ở cuối màn hình, tự ẩn; không che nút điều hướng. */
export function ReminderToast() {
  const toast = useInbox((s) => s.toast);
  const dismiss = useInbox((s) => s.dismissToast);
  const [hover, setHover] = useState(false);
  const [panel, setPanel] = useState(false);
  const actions = useActions();
  const current = toast[toast.length - 1];

  useEffect(() => {
    if (!current || hover) return;
    const t = setTimeout(() => dismiss(), TOAST_MS);
    return () => {
      clearTimeout(t);
    };
  }, [current, hover, dismiss]);

  if (panel) return <InboxPanel onClose={() => setPanel(false)} floating />;
  if (!current) return null;
  const Icon = ICON[current.kind];
  const more = toast.length - 1;
  return (
    <div
      className="fixed z-[45] left-3 right-3 bottom-[5.25rem] md:bottom-6 md:left-auto md:right-6 md:w-[25rem]"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      <div role="alertdialog" aria-label={current.title} className="pop-in card shadow-2xl p-3.5">
        <div className="flex items-start gap-3">
          <span className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center ${TONE[current.kind]}`}>
            <Icon size={19} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-snug">{current.title}</p>
            <p className="text-xs text-ink-2 mt-0.5 line-clamp-2">{current.body}</p>
          </div>
          <button
            className="focus-ring -mr-1 -mt-1 rounded-full p-1.5 text-ink-3 hover:bg-brand-soft"
            onClick={() => dismiss()}
            aria-label="Đóng thông báo"
          >
            <X size={16} />
          </button>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2 justify-end">
          {more > 0 && (
            <button
              className="mr-auto text-xs font-semibold text-brand hover:underline"
              onClick={() => {
                setPanel(true);
                dismiss();
              }}
            >
              +{more} nhắc nhở khác
            </button>
          )}
          {actions(current, () => dismiss(current.id)).map((a) => (
            <button key={a.label} className={`btn text-xs py-1.5 px-3 ${a.primary ? "btn-primary" : "btn-ghost"}`} onClick={a.run}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  return m < 1 ? "vừa xong" : m < 60 ? `${m} phút trước` : `${Math.round(m / 60)} giờ trước`;
};

function InboxPanel({ onClose, floating }: { onClose: () => void; floating?: boolean }) {
  const items = useInbox((s) => s.items);
  const remove = useInbox((s) => s.remove);
  const markAllRead = useInbox((s) => s.markAllRead);
  const actions = useActions();
  useEffect(() => {
    markAllRead();
  }, [markAllRead]);
  return (
    <div
      role="dialog"
      aria-label="Thông báo"
      className={`pop-in card shadow-2xl p-2 z-[60] ${
        floating
          ? "fixed left-3 right-3 bottom-[5.25rem] md:bottom-6 md:left-auto md:right-6 md:w-[25rem]"
          : "absolute right-0 mt-2 w-[min(24rem,calc(100vw-1.5rem))]"
      }`}
    >
      <div className="flex items-center justify-between px-2 py-1.5">
        <p className="font-bold">Thông báo</p>
        <button className="focus-ring rounded-full p-1.5 text-ink-3 hover:bg-brand-soft" onClick={onClose} aria-label="Đóng">
          <X size={16} />
        </button>
      </div>
      {items.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-ink-3">Chưa có thông báo nào.</p>
      ) : (
        <ul className="max-h-[60vh] overflow-y-auto space-y-1">
          {items.map((it: InboxItem) => {
            const Icon = ICON[it.kind];
            const primary = actions(it, () => {
              remove(it.id);
              onClose();
            }).filter((a) => a.primary);
            return (
              <li key={it.id + it.at} className="rounded-xl p-2.5 hover:bg-bg">
                <div className="flex gap-2.5">
                  <span className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${TONE[it.kind]}`}>
                    <Icon size={16} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-snug">{it.title}</p>
                    <p className="text-xs text-ink-2 mt-0.5">{it.body}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] text-ink-3 mr-auto">{ago(it.at)}</span>
                      {primary.map((a) => (
                        <button key={a.label} className="text-xs font-semibold text-brand hover:underline" onClick={a.run}>
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Nút chuông trên thanh tiêu đề. */
export function BellButton() {
  const unread = useInbox((s) => s.items.filter((i) => !i.read).length);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button
        className="focus-ring relative rounded-full p-2 text-ink-2 hover:bg-brand-soft"
        onClick={() => setOpen(!open)}
        aria-label={unread ? `Thông báo, ${unread} chưa đọc` : "Thông báo"}
        aria-expanded={open}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-coral text-white text-[10px] font-bold flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>
      {open && <InboxPanel onClose={() => setOpen(false)} />}
    </div>
  );
}
