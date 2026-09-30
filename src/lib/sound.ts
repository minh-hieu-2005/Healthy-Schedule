// Tiếng "tink" khi thông báo hiện lên.
// Tạo bằng Web Audio (không cần file âm thanh): 2 sóng sin cao, tắt dần nhanh như gõ vào ly thuỷ tinh.
// Trình duyệt chỉ cho phát âm thanh sau khi người dùng đã chạm / bấm vào trang ít nhất 1 lần,
// nên ta "mở khoá" AudioContext ở lần chạm đầu tiên.

type Ctx = AudioContext;
let ctx: Ctx | null = null;

function getCtx(): Ctx | null {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
  } catch {
    ctx = null;
  }
  return ctx;
}

/** Gọi 1 lần khi khởi động: mở khoá âm thanh ở lần chạm / phím đầu tiên (bắt buộc trên iPhone, iPad). */
export function unlockAudioOnFirstGesture() {
  const unlock = () => {
    const c = getCtx();
    if (!c) return;
    if (c.state === "suspended") void c.resume();
    // phát 1 mẫu im lặng để iOS coi như đã "được phép"
    try {
      const b = c.createBuffer(1, 1, 22050);
      const s = c.createBufferSource();
      s.buffer = b;
      s.connect(c.destination);
      s.start(0);
    } catch {
      /* bỏ qua */
    }
    if (c.state === "running") {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
      window.removeEventListener("touchend", unlock, true);
    }
  };
  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("keydown", unlock, true);
  window.addEventListener("touchend", unlock, true);
}

let lastPlay = 0;

/** Phát tiếng "tink". Nhiều thông báo cùng lúc chỉ kêu 1 lần. */
export async function playTink(volume = 0.35) {
  const now = Date.now();
  if (now - lastPlay < 800) return;
  lastPlay = now;
  const c = getCtx();
  if (!c) return;
  try {
    if (c.state === "suspended") await c.resume();
    if (c.state !== "running") return;
    const t = c.currentTime + 0.01;
    const out = c.createGain();
    out.gain.value = volume;
    out.connect(c.destination);
    // âm chính + hoạ âm (tỉ lệ ~2,76 như chuông kim loại nhỏ)
    const partials: [number, number, number][] = [
      [1975, 1, 0.45],
      [5450, 0.35, 0.18],
      [2960, 0.18, 0.3],
    ];
    for (const [freq, amp, dur] of partials) {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(amp, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  } catch {
    /* thiết bị không hỗ trợ âm thanh – bỏ qua */
  }
}
