import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// base phải trùng tên repo để chạy đúng trên GitHub Pages:
// https://<user>.github.io/Healthy-Schedule/
export default defineConfig({
  base: "/Healthy-Schedule/",
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // tách thư viện Firebase ra file riêng để trình duyệt lưu cache lâu hơn
        manualChunks: (id) => (id.includes("node_modules/@firebase") || id.includes("node_modules/firebase") ? "firebase" : undefined),
      },
    },
  },
  test: {
    environment: "node",
  },
});
