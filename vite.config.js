import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" → 빌드 결과물의 경로를 상대경로로. WebView(APK)에서 assets 로드에 필수.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
