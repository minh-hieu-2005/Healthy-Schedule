import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  BrainCircuit,
  CalendarPlus,
  CheckCircle2,
  CloudCheck,
  Flame,
  HeartPulse,
  Moon,
  Repeat,
  Scale,
  Smartphone,
  Sparkles,
  Wand2,
} from "lucide-react";
import Logo from "../components/Logo";
import { useStore } from "../store/useStore";
import { startGuest, useSession } from "../cloud/session";
import { useInstall } from "../store/ui";

const BASE = import.meta.env.BASE_URL;

const BENEFITS = [
  {
    icon: HeartPulse,
    tone: "bg-brand-soft text-brand",
    title: "Sức khoẻ được xếp trước",
    points: ["Giữ chỗ cho giấc ngủ, bữa ăn, buổi tập", "Task được lấp vào giờ rảnh", "Không bao giờ ngủ dưới 6 tiếng"],
  },
  {
    icon: Scale,
    tone: "bg-lime-soft text-olive",
    title: "Tự cân bằng khi deadline dồn",
    points: ["Bớt giải trí, rút gọn bữa ăn khi cần", "Dời việc chưa đến hạn sang hôm sau", "Bạn vẫn đổi giờ, bỏ qua, làm ngay được"],
  },
  {
    icon: BellRing,
    tone: "bg-coral-soft text-hot",
    title: "Nhắc đúng lúc, có động lực",
    points: ["Nhắc uống nước, deadline, giờ bắt đầu việc", "Chế độ tập trung đếm ngược", "Chuỗi ngày 🔥, huy hiệu, tổng kết tuần"],
  },
];

const EXTRAS = [
  { icon: Wand2, label: "Thêm task 1 dòng" },
  { icon: Repeat, label: "Task lặp lại & việc con" },
  { icon: BarChart3, label: "Thống kê thực tế vs kế hoạch" },
  { icon: BrainCircuit, label: "Dự đoán giờ năng suất" },
  { icon: Moon, label: "Chế độ tối" },
  { icon: Smartphone, label: "Cài như ứng dụng" },
  { icon: CalendarPlus, label: "Xuất Google Calendar" },
  { icon: CloudCheck, label: "Tài khoản Gmail riêng" },
];

export default function Landing() {
  const nav = useNavigate();
  const profile = useStore((s) => s.profile);
  const loadDemo = useStore((s) => s.loadDemo);
  const status = useSession((s) => s.status);
  const ready = useSession((s) => s.ready);
  const inside = (status === "signedIn" || status === "guest") && ready;
  const { installed, installOrGuide } = useInstall();

  const open = () => nav(profile ? "/hom-nay" : "/bat-dau");
  /** Dùng thử ngay với dữ liệu mẫu, không cần tài khoản. */
  const tryNow = () => {
    if (inside) {
      if (profile && !confirmReplace()) return;
      loadDemo();
      nav("/hom-nay");
      return;
    }
    startGuest();
    useStore.getState().loadDemo();
    nav("/hom-nay");
  };

  return (
    <div className="min-h-dvh">
      <div className="blob-bg">
        <header className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
          {!installed && (
            <button className="btn btn-ghost text-sm px-3" onClick={() => void installOrGuide()}>
              <Smartphone size={16} /> Tải app
            </button>
          )}
          {inside ? (
            <button className="btn btn-primary text-sm" onClick={open}>
              Mở lịch của tôi <ArrowRight size={16} />
            </button>
          ) : (
            <button className="btn btn-ghost text-sm" onClick={() => nav("/dang-nhap")}>
              Đăng nhập
            </button>
          )}
          </div>
        </header>

        <section className="mx-auto max-w-6xl px-4 pt-6 pb-14 md:pt-12 md:pb-20 grid md:grid-cols-[1.05fr_0.95fr] gap-10 items-center">
          <div>
            <span className="chip bg-card border border-line text-ink-2 mb-5">
              <Sparkles size={14} className="text-brand" /> Trợ lý lịch trình cho người trẻ bận rộn
            </span>
            <h1 className="text-[2.4rem] leading-[1.08] md:text-6xl font-extrabold tracking-tight">
              Sống khoẻ mà vẫn{" "}
              <span className="relative whitespace-nowrap">
                <span className="relative z-10">kịp deadline</span>
                <span className="absolute left-0 right-0 bottom-1 h-4 md:h-5 bg-lime rounded dark:opacity-60" aria-hidden="true" />
              </span>
            </h1>
            <p className="mt-5 text-lg text-ink-2 max-w-xl">
              Nhập bài tập và deadline – Smart Life tự xếp vào giờ rảnh mà vẫn giữ đủ giấc ngủ, bữa ăn và buổi tập của bạn.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              {inside ? (
                <button className="btn btn-primary text-base px-6 py-3.5" onClick={open}>
                  Mở lịch của tôi <ArrowRight size={18} />
                </button>
              ) : (
                <button className="btn btn-primary text-base px-6 py-3.5" onClick={tryNow}>
                  Dùng thử ngay <ArrowRight size={18} />
                </button>
              )}
              <button className="btn btn-ghost text-base px-6 py-3.5" onClick={() => (inside ? tryNow() : nav("/dang-nhap"))}>
                {inside ? "Xem với dữ liệu mẫu" : "Đăng nhập bằng Gmail"}
              </button>
            </div>
            {!installed && (
              <button className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline" onClick={() => void installOrGuide()}>
                <Smartphone size={16} /> Tải về điện thoại, iPad như một ứng dụng
              </button>
            )}
            <p className="mt-3 text-sm text-ink-3">
              {inside ? "Dữ liệu của bạn được lưu riêng." : "Miễn phí · Dùng thử không cần tài khoản · Đăng nhập Gmail để lưu"}
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-[20rem]">
            <div className="absolute -top-4 -left-6 rotate-[-6deg] chip bg-coral text-white shadow-lg z-10 text-sm py-1.5 px-3">
              <Flame size={14} /> Chuỗi 7 ngày
            </div>
            <div className="absolute -bottom-3 -right-5 rotate-[5deg] chip bg-lime text-on-lime shadow-lg z-10 text-sm py-1.5 px-3">
              <CheckCircle2 size={14} /> Vẫn ngủ đủ 8 tiếng
            </div>
            <div className="rounded-[2.2rem] border-[10px] border-night bg-night shadow-2xl overflow-hidden aspect-[9/19]">
              <img
                src={`${BASE}screenshots/today-light.jpg`}
                alt="Giao diện Smart Life: lịch hôm nay với thẻ Đang diễn ra, thời gian biểu và checklist"
                className="w-full h-full object-cover object-top dark:hidden"
              />
              <img
                src={`${BASE}screenshots/today-dark.jpg`}
                alt="Giao diện Smart Life ở chế độ tối"
                className="w-full h-full object-cover object-top hidden dark:block"
              />
            </div>
          </div>
        </section>
      </div>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight max-w-2xl">Một trợ lý lo chuyện sắp xếp, bạn chỉ việc sống và làm.</h2>
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          {BENEFITS.map((b) => (
            <div key={b.title} className="card p-6">
              <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${b.tone}`}>
                <b.icon size={24} />
              </span>
              <h3 className="mt-4 text-lg font-bold">{b.title}</h3>
              <ul className="mt-3 space-y-2 text-sm text-ink-2">
                {b.points.map((p) => (
                  <li key={p} className="flex gap-2">
                    <CheckCircle2 size={16} className="text-brand shrink-0 mt-0.5" /> {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <span className="text-sm font-semibold text-ink-3 mr-1 self-center">Và còn:</span>
          {EXTRAS.map((e) => (
            <span key={e.label} className="chip bg-card border border-line text-ink-2 text-sm py-1.5 px-3">
              <e.icon size={14} className="text-brand" /> {e.label}
            </span>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="card p-6 md:p-10 bg-night text-white border-0">
          <h2 className="text-2xl md:text-3xl font-extrabold">3 bước là có lịch</h2>
          <ol className="mt-8 grid md:grid-cols-3 gap-6">
            {[
              ["Chọn mẫu lịch", "Sinh viên học sáng, học chiều + làm thêm, hay người đi làm – 1 chạm là có lịch, chỉnh lại sau cũng được."],
              ["Gõ task 1 dòng", "“Ôn thi 2h thứ 6 !” – Smart Life hiểu thời lượng, hạn nộp, mức ưu tiên và tự tìm giờ trống."],
              ["Làm theo và tick", "Nhận nhắc nhở đúng lúc, bấm “Bắt đầu tập trung”, tick khi xong – chuỗi ngày 🔥 sẽ tăng dần."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="h-10 w-10 shrink-0 rounded-full bg-lime text-on-lime font-extrabold flex items-center justify-center">{i + 1}</span>
                <div>
                  <h3 className="font-bold">{t}</h3>
                  <p className="mt-1 text-sm text-white/75 leading-relaxed">{d}</p>
                </div>
              </li>
            ))}
          </ol>
          {!inside && (
            <button className="btn btn-lime mt-8 text-base px-6 py-3" onClick={tryNow}>
              Dùng thử ngay – không cần tài khoản <ArrowRight size={18} />
            </button>
          )}
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col md:flex-row gap-3 justify-between text-sm text-ink-3">
          <Logo />
          <p>Dữ liệu của mỗi tài khoản được lưu riêng và chỉ chủ tài khoản xem được.</p>
        </div>
      </footer>
    </div>
  );
}

export function confirmReplace() {
  return window.confirm("Dữ liệu mẫu sẽ thay thế toàn bộ dữ liệu hiện tại của bạn. Tiếp tục?");
}
