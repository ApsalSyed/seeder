import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// If you hit CORS issues, uncomment the `server.proxy` block below and
// set baseUrlV1 to "/v1" and baseUrlRevamp to "/revamp" in the UI.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // proxy: {
    //   "/v1": {
    //     target: "https://dev.swivlconnect.com",
    //     changeOrigin: true,
    //     rewrite: (path) => path.replace(/^\/v1/, ""),
    //   },
    //   "/revamp": {
    //     target: "https://dev.revamp.swivlconnect.com",
    //     changeOrigin: true,
    //     rewrite: (path) => path.replace(/^\/revamp/, ""),
    //   },
    // },
  },
});
