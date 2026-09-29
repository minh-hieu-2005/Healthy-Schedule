import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// base phải trùng tên repo để chạy đúng trên GitHub Pages:
// https://<user>.github.io/Healthy-Schedule/
export default defineConfig({
  base: "/Healthy-Schedule/",
  plugins: [react(), tailwindcss()],
  test: {
    environment: "node",
  },
});
