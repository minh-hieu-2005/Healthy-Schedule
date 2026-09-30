import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlarmClock, Droplets, X } from "lucide-react";
import { useStore } from "../store/useStore";
import { dueReminders, type Reminder } from "../engine/reminders";
import { todayStr } from "../engine/time";
import { systemNotify } from "../lib/notify";

const CHECK_EVERY = 20_000; // kiểm tra mỗi 20 giây
const SNOOZE_MIN = 10;

/**
 * Hiện thông báo pop-up trên màn hình:
 *  - nhắc uống nước theo giờ đã đặt (mặc định 8h, 14h, 17h)
 *  - nhắc deadline quan trọng sắp tới
 * Nếu bạn đang ở tab khác và đã cho phép, trình duyệt cũng hiện thông báo hệ thống.
 */
export default function ReminderCenter() {
  const nav = useNavigate();
  const [queue, setQueue] = useState<Reminder[]>([]);
  const snoozed = useRef<Record<string, number>>({});

  useEffect(() => {
    const tick = () => {
      const st = useStore.getState();
      if (!st.profile) return;
      const due = dueReminders({
        now: new Date(),
        tasks: st.tasks,
        water: st.reminders.water,
        waterTimes: st.reminders.waterTimes,
        deadline: st.reminders.deadline,
        notified: st.notified,
        snoozed: snoozed.current,
      });
      if (!due.length) return;
      st.markNotified(due.flatMap((d) => d.marks));
      setQueue((q) => [...q, ...due.filter((d) => !q.some((x) => x.id === d.id))]);
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

  const close = (id: string) => setQueue((q) => q.filter((x) => x.id !== id));
  const snooze = (r: Reminder) => {
    close(r.id);
    snoozed.current[r.id] = Date.now() + SNOOZE_MIN * 60000;
    setTimeout(() => setQueue((q) => (q.some((x) => x.id === r.id) ? q : [...q, r])), SNOOZE_MIN * 60000);
  };

  if (!queue.length) return null;
  return (
    <div
      className="fixed z-[60] top-[4.5rem] right-3 left-3 sm:left-auto sm:w-[23rem] space-y-2.5 pointer-events-none"
      aria-live="assertive"
    >
      {queue.slice(-3).map((r) => {
        const water = r.kind === "water";
        return (
          <div
            key={r.id}
            role="alertdialog"
            aria-label={r.title}
            className={`pointer-events-auto pop-in rounded-2xl bg-white shadow-2xl border-2 p-4 ${
              water ? "border-[#9fd8f5]" : r.urgent ? "border-[#f3a58f]" : "border-[#cfc4ff]"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`h-10 w-10 shrink-0 rounded-2xl flex items-center justify-center ${
                  water ? "bg-[#e3f5fd] text-[#1683b8]" : "bg-coral-soft text-[#c2361a]"
                }`}
              >
                {water ? <Droplets size={22} /> : <AlarmClock size={22} />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold leading-snug">{r.title}</p>
                <p className="text-sm text-ink-2 mt-0.5">{r.body}</p>
              </div>
              <button
                className="focus-ring -mr-1 -mt-1 rounded-full p-1.5 text-ink-3 hover:bg-brand-soft"
                onClick={() => close(r.id)}
                aria-label="Đóng thông báo"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 justify-end">
              {water ? (
                <>
                  <button className="btn btn-ghost text-sm py-1.5 px-3" onClick={() => snooze(r)}>
                    Nhắc lại sau {SNOOZE_MIN} phút
                  </button>
                  <button
                    className="btn btn-primary text-sm py-1.5 px-3"
                    onClick={() => {
                      useStore.getState().addWater(todayStr());
                      close(r.id);
                    }}
                  >
                    Đã uống 💧
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-ghost text-sm py-1.5 px-3" onClick={() => close(r.id)}>
                    Đã hiểu
                  </button>
                  <button
                    className="btn btn-primary text-sm py-1.5 px-3"
                    onClick={() => {
                      close(r.id);
                      nav("/task");
                    }}
                  >
                    Xem task
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
