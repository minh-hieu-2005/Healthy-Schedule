import { useNavigate } from "react-router-dom";
import {
  AlarmClockOff,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CalendarClock,
  BellRing,
  CheckCircle2,
  CloudCheck,
  Droplets,
  ListChecks,
  Smartphone,
  MoonStar,
  Scale,
  Sparkles,
  UserRoundCog,
} from "lucide-react";
import Logo from "../components/Logo";
import { useStore } from "../store/useStore";
import { CAT } from "../lib/categories";
import type { Category } from "../engine/types";
import { useSession } from "../cloud/session";

const FEATURES = [
  { icon: UserRoundCog, title: "Lịch riêng cho bạn", text: "Giờ ngủ, bữa ăn, lịch học, lịch làm, buổi tập… bạn sống thế nào thì lịch xếp như thế." },
  { icon: CalendarClock, title: "Nhập task & deadline", text: "Chỉ cần tên việc, thời gian dự tính và hạn nộp. Smart Life tự tìm giờ trống để làm." },
  { icon: Scale, title: "Tự cân bằng khi nhiều việc", text: "Deadline dồn dập? Lịch tự bớt giải trí, rút gọn bữa ăn, giờ ngủ… nhưng luôn có giới hạn." },
  { icon: MoonStar, title: "Cảnh báo thiếu ngủ", text: "Giờ ngủ xuống dưới 6 tiếng là Smart Life báo ngay. Sức khoẻ vẫn được đặt lên trước." },
  { icon: AlarmClockOff, title: "Dời deadline thông minh", text: "Quá tải thật sự thì việc chưa đến hạn sẽ tự dời sang ngày sau. Mỗi 2 ngày chỉ quá tải 1 lần." },
  { icon: ListChecks, title: "Checklist mỗi ngày", text: "Tick từng hoạt động đã làm. Xong hết các phiên của một task thì task tự hoàn thành." },
  { icon: BarChart3, title: "Biểu đồ ngày / tuần / tháng", text: "Xem bạn ngủ bao nhiêu, học bao nhiêu, vận động bao nhiêu – rõ ràng, trực quan." },
  { icon: BrainCircuit, title: "Dự đoán giờ năng suất", text: "Học từ lịch sử checklist để biết khung giờ bạn làm việc hiệu quả nhất ngày mai." },
  { icon: Droplets, title: "Nhắc uống nước", text: "Thông báo bật lên màn hình lúc 8h, 14h và 17h (có thể đổi giờ) để bạn không quên uống nước." },
  { icon: BellRing, title: "Nhắc deadline quan trọng", text: "Task ưu tiên cao được nhắc trước 24 tiếng, 3 tiếng và 1 tiếng; task khác nhắc trước 1 tiếng." },
  { icon: CloudCheck, title: "Tài khoản Google riêng", text: "Đăng nhập bằng Gmail, dữ liệu của mỗi người được lưu riêng trên đám mây, đổi máy vẫn còn." },
  { icon: Smartphone, title: "Dùng tốt trên điện thoại", text: "Giao diện gọn gàng trên cả máy tính và điện thoại, mở bằng trình duyệt là dùng được ngay." },
];

const PREVIEW: { t: string; cat: Category; title: string; done?: boolean }[] = [
  { t: "06:50", cat: "meal", title: "Bữa sáng", done: true },
  { t: "07:30", cat: "school", title: "Học trên trường", done: true },
  { t: "12:40", cat: "task", title: "Slide thuyết trình Vĩ mô", done: true },
  { t: "17:30", cat: "exercise", title: "Gym" },
  { t: "19:30", cat: "task", title: "Bài tập nhóm Tài chính QT" },
  { t: "22:30", cat: "sleep", title: "Ngủ 8 tiếng" },
];

export default function Landing() {
  const nav = useNavigate();
  const profile = useStore((s) => s.profile);
  const loadDemo = useStore((s) => s.loadDemo);
  const signedIn = useSession((s) => s.status === "signedIn" && s.ready);

  const start = () => nav(!signedIn ? "/dang-nhap" : profile ? "/hom-nay" : "/bat-dau");
  const tryDemo = () => {
    if (!signedIn) return nav("/dang-nhap?demo=1");
    if (profile && !confirmReplace()) return;
    loadDemo();
    nav("/hom-nay");
  };

  return (
    <div className="min-h-dvh">
      <div className="blob-bg">
        <header className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <Logo />
          {signedIn ? (
            <button className="btn btn-primary text-sm" onClick={start}>
              Mở lịch của tôi <ArrowRight size={16} />
            </button>
          ) : (
            <button className="btn btn-ghost text-sm" onClick={() => nav("/dang-nhap")}>
              Đăng nhập
            </button>
          )}
        </header>

        <section className="mx-auto max-w-6xl px-4 pt-8 pb-16 md:pt-14 md:pb-24 grid md:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
          <div>
            <span className="chip bg-white border border-line text-ink-2 mb-5">
              <Sparkles size={14} className="text-brand" /> Trợ lý lịch trình cho người trẻ bận rộn
            </span>
            <h1 className="text-[2.4rem] leading-[1.08] md:text-6xl font-extrabold tracking-tight">
              Sống khoẻ mà vẫn{" "}
              <span className="relative whitespace-nowrap">
                <span className="relative z-10">kịp deadline</span>
                <span className="absolute left-0 right-0 bottom-1 h-4 md:h-5 bg-lime -z-0 rounded" aria-hidden="true" />
              </span>
            </h1>
            <p className="mt-5 text-lg text-ink-2 max-w-xl">
              Smart Life tự động xếp thời gian biểu mỗi ngày: giữ chỗ cho giấc ngủ, bữa ăn và buổi tập trước, rồi mới
              lấp bài tập, deadline vào thời gian rảnh. Nhiều việc quá? Lịch tự cân bằng lại cho bạn.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button className="btn btn-primary text-base px-6 py-3.5" onClick={start}>
                {signedIn && profile ? "Xem lịch hôm nay" : "Tạo lịch của tôi"} <ArrowRight size={18} />
              </button>
              <button className="btn btn-ghost text-base px-6 py-3.5" onClick={tryDemo}>
                Xem thử với dữ liệu mẫu
              </button>
            </div>
            <p className="mt-4 text-sm text-ink-3">Miễn phí · Đăng nhập nhanh bằng Gmail · Dữ liệu của mỗi người được lưu riêng</p>
          </div>

          <div className="relative mx-auto w-full max-w-sm" aria-hidden="true">
            <div className="absolute -top-5 -left-4 rotate-[-6deg] chip bg-coral text-white shadow-lg z-10 text-sm py-1.5 px-3">
              🔥 3 deadline hôm nay
            </div>
            <div className="absolute -bottom-4 -right-3 rotate-[5deg] chip bg-lime text-ink shadow-lg z-10 text-sm py-1.5 px-3">
              😴 Vẫn ngủ đủ 8 tiếng
            </div>
            <div className="card p-5 rotate-[1.5deg]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-ink-3 font-semibold">Thứ Ba</p>
                  <p className="font-bold text-lg">Lịch hôm nay</p>
                </div>
                <span className="chip bg-[#fff4d6] text-[#8a5d00]">⚖️ Cân bằng</span>
              </div>
              <ul className="space-y-2">
                {PREVIEW.map((p) => {
                  const m = CAT[p.cat];
                  return (
                    <li key={p.t} className="flex items-center gap-3 rounded-2xl p-2.5" style={{ background: m.tint }}>
                      <span className="text-xs font-bold w-10 text-ink-2">{p.t}</span>
                      <m.icon size={18} style={{ color: m.color }} />
                      <span className={`text-sm font-semibold flex-1 ${p.done ? "line-through text-ink-3" : ""}`}>{p.title}</span>
                      {p.done ? (
                        <CheckCircle2 size={18} className="text-brand" />
                      ) : (
                        <span className="h-[18px] w-[18px] rounded-full border-2 border-[#c9c3dc]" />
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>
      </div>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight max-w-2xl">
          Một “trợ lý” lo hết chuyện sắp xếp, bạn chỉ việc sống và làm.
        </h2>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="card p-5">
              <span
                className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${
                  i % 3 === 0 ? "bg-brand-soft text-brand" : i % 3 === 1 ? "bg-[#f4ffd0] text-[#4d6100]" : "bg-coral-soft text-[#c2361a]"
                }`}
              >
                <f.icon size={22} />
              </span>
              <h3 className="mt-4 font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-ink-2 leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="card p-6 md:p-10 bg-ink text-white border-0">
          <h2 className="text-2xl md:text-3xl font-extrabold">3 bước là có lịch</h2>
          <ol className="mt-8 grid md:grid-cols-3 gap-6">
            {[
              ["Đăng nhập và kể cho Smart Life nghe", "Đăng nhập bằng Gmail, rồi cho biết bạn dậy lúc mấy giờ, ngủ bao lâu, học/làm lúc nào, có tập gym hay tự nấu ăn không."],
              ["Thêm task và deadline", "Tên việc, mất khoảng bao lâu, hạn nộp khi nào. Có thể thêm mô tả cho dễ nhớ."],
              ["Mở lịch và tick checklist", "Lịch tự xếp, tự cân bằng. Bạn chỉ cần làm theo và tick những gì đã xong."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="h-10 w-10 shrink-0 rounded-full bg-lime text-ink font-extrabold flex items-center justify-center">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-bold">{t}</h3>
                  <p className="mt-1 text-sm text-white/75 leading-relaxed">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="card p-6 md:p-10 grid md:grid-cols-[1fr_auto] gap-6 items-center blob-bg">
          <div>
            <span className="chip bg-lime text-ink">
              <BellRing size={14} /> Nhắc nhở thông minh
            </span>
            <h2 className="mt-3 text-2xl md:text-3xl font-extrabold">Không quên uống nước, không trễ deadline</h2>
            <ul className="mt-4 space-y-2 text-ink-2">
              <li>💧 Thông báo bật lên nhắc <b>uống nước lúc 8h, 14h và 17h</b></li>
              <li>⏰ Nhắc <b>deadline quan trọng</b> trước 24 tiếng, 3 tiếng và 1 tiếng</li>
              <li>🔔 Bật thông báo trình duyệt để được nhắc cả khi đang mở tab khác</li>
            </ul>
          </div>
          <button className="btn btn-primary text-base px-6 py-3.5" onClick={start}>
            Bắt đầu miễn phí <ArrowRight size={18} />
          </button>
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
  return window.confirm("Dữ liệu mẫu sẽ thay thế toàn bộ dữ liệu hiện tại trong tài khoản của bạn. Tiếp tục?");
}
