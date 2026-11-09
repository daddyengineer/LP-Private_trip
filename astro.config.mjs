import { defineConfig } from "astro/config";
import node from "@astrojs/node";

export default defineConfig({
  site: "https://privatetrip.travelkif.id",
  output: "server",
  adapter: node({ mode: "standalone" }),
  vite: {
    ssr: {
      external: ["googleapis"],
    },
  },
});
