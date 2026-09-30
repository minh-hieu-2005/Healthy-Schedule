// Đăng nhập Google bằng cách chuyển trang thẳng tới Google rồi quay về đúng trang Smart Life
// (OpenID Connect, response_type=id_token). Không cần cửa sổ bật lên và không đi qua trang
// trung gian firebaseapp.com, nên chạy được trên Safari/Chrome điện thoại và trong app đã cài
// ra màn hình chính – nơi trình duyệt chặn "bộ nhớ bên thứ ba" làm cách cũ bị treo / văng ra.
// Sau khi quay về, id_token được đổi thành phiên đăng nhập Firebase (signInWithCredential).

const KEY = "smart-life:oauth";
const MAX_AGE = 15 * 60_000;

export const redirectUri = () => window.location.origin + import.meta.env.BASE_URL;

function rand() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Tạo + ghi nhớ mã chống giả mạo cho 1 lần đăng nhập. */
export function newOAuthState() {
  const state = rand();
  const nonce = rand();
  try {
    localStorage.setItem(KEY, JSON.stringify({ state, nonce, at: Date.now() }));
  } catch {
    /* bỏ qua */
  }
  return { state, nonce };
}

/** Chuyển sang trang chọn tài khoản Google. */
export function startGoogleRedirect(clientId: string) {
  const { state, nonce } = newOAuthState();
  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: "id_token",
    scope: "openid email profile",
    nonce,
    state,
    prompt: "select_account",
  });
  window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${p}`);
}

export type RedirectResult = { idToken: string } | { error: string };

/**
 * Gọi 1 lần lúc khởi động, TRƯỚC khi bộ định tuyến đọc địa chỉ:
 * Google trả kết quả trong phần sau dấu # (vd. #id_token=...&state=...).
 */
export function takeGoogleRedirect(): RedirectResult | null {
  const h = window.location.hash.replace(/^#\/?/, "");
  if (!/(^|&)(id_token|error)=/.test(h)) return null;
  const q = new URLSearchParams(h);
  let saved: { state: string; at: number } | null = null;
  try {
    saved = JSON.parse(localStorage.getItem(KEY) || "null");
    localStorage.removeItem(KEY);
  } catch {
    saved = null;
  }
  // xoá token khỏi thanh địa chỉ, về trang đăng nhập (trang này tự chuyển tiếp khi xong)
  window.history.replaceState(null, "", window.location.pathname + window.location.search + "#/dang-nhap");
  const err = q.get("error");
  if (err) return { error: err === "access_denied" ? "cancelled" : err };
  if (!saved || saved.state !== q.get("state") || Date.now() - saved.at > MAX_AGE) return { error: "state" };
  const idToken = q.get("id_token");
  return idToken ? { idToken } : { error: "no_token" };
}
