import type { Backend } from "./types";
import { createFirebaseBackend } from "./firebase";
import { createMockBackend } from "./mock";

export * from "./types";

// Vite thay giá trị này lúc build, nên bản chạy thật không chứa backend giả lập.
export const backend: Backend =
  import.meta.env.VITE_AUTH_MODE === "mock" ? createMockBackend() : createFirebaseBackend();
