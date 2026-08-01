import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Base path is environment-driven so the same build works on GitHub Pages
// (/fdm-material-advisor/) and later on materialberater.reents3d.de (/).
export default defineConfig({
  base: process.env.VITE_BASE ?? "/fdm-material-advisor/",
  plugins: [react(), tailwindcss()],
  build: { outDir: "dist", sourcemap: false, target: "es2022" },
});
