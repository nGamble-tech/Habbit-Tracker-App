// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      // ✅ both routes match your backend exactly
      "/auth": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
      },
      "/habits": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
