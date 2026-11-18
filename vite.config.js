import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { getSecurityHeaders } from "./src/utils/securityHeaders.ts";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
    hmr: false,
    headers: getSecurityHeaders({ isDev: true, supabaseUrl }),
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
    headers: getSecurityHeaders({ isDev: false, supabaseUrl }),
  },
});
