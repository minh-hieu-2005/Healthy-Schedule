// Lớp trung gian giữa ứng dụng và dịch vụ tài khoản / lưu trữ đám mây.
// - Bản chạy thật dùng Firebase (đăng nhập Google + Firestore).
// - Bản kiểm thử tự động (VITE_AUTH_MODE=mock) dùng một backend giả lập
//   để có thể test nhiều tài khoản mà không cần Google.

export interface AuthUser {
  uid: string;
  email: string;
  name: string;
  photo?: string;
}

export interface CloudDoc {
  data: string; // toàn bộ dữ liệu của người dùng (JSON)
  updatedAt: number; // thời điểm sửa gần nhất (ms)
}

export interface Backend {
  /** Đã có cấu hình để chạy chưa */
  configured: boolean;
  onAuth(cb: (u: AuthUser | null) => void): () => void;
  /** redirect: true -> chuyển trang tới Google (dùng trên điện thoại / app đã cài) thay vì cửa sổ bật lên */
  signInWithGoogle(opts?: { redirect?: boolean }): Promise<void>;
  /** Hoàn tất đăng nhập sau khi Google chuyển về (id_token). */
  finishRedirect?(idToken: string): Promise<void>;
  /** Có hỗ trợ đăng nhập chuyển trang không */
  canRedirect?: boolean;
  signOut(): Promise<void>;
  load(uid: string): Promise<CloudDoc | null>;
  save(uid: string, doc: CloudDoc, meta: { email: string; name: string }): Promise<void>;
  /** Nghe thay đổi từ thiết bị khác */
  subscribe(uid: string, cb: (doc: CloudDoc) => void): () => void;
}

/** Thông báo lỗi dễ hiểu cho người dùng. */
export function friendlyError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  const msg = (e as { message?: string })?.message ?? String(e);
  if (msg === "cancelled") return "Bạn đã huỷ đăng nhập Google. Hãy thử lại.";
  if (msg === "state" || msg === "no_token")
    return "Phiên đăng nhập đã hết hạn hoặc bị gián đoạn. Hãy bấm đăng nhập lại.";
  if (code.includes("invalid-credential") || code.includes("invalid-idp-response"))
    return "Google chưa xác nhận được tài khoản. Hãy thử đăng nhập lại.";
  if (code.includes("popup-closed-by-user") || code.includes("cancelled-popup-request"))
    return "Bạn đã đóng cửa sổ đăng nhập. Hãy thử lại.";
  if (code.includes("popup-blocked"))
    return "Trình duyệt đã chặn cửa sổ đăng nhập. Hãy cho phép cửa sổ bật lên (pop-up) cho trang này rồi thử lại.";
  if (code.includes("unauthorized-domain"))
    return "Tên miền này chưa được cho phép trong Firebase (Authentication → Settings → Authorized domains).";
  if (code.includes("operation-not-allowed"))
    return "Đăng nhập Google chưa được bật trong Firebase (Authentication → Sign-in method → Google).";
  if (code.includes("network-request-failed") || code.includes("unavailable"))
    return "Không có kết nối mạng. Hãy kiểm tra Internet rồi thử lại.";
  if (code.includes("permission-denied"))
    return "Máy chủ từ chối quyền truy cập dữ liệu (kiểm tra Firestore Rules).";
  return `Có lỗi xảy ra: ${msg}`;
}
