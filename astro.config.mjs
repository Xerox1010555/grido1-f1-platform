// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// GRIDO1 Racing Systems — static-first Astro build.
// Set SITE_URL at build time to control canonical URLs + sitemap.
export default defineConfig({
  site: process.env.SITE_URL || "https://grido1.example.com",
  compressHTML: true,
  build: {
    inlineStylesheets: "auto",
  },
  integrations: [sitemap()],
  image: {
    // Local assets only; remote asset host is allow-listed in `src/lib/assets.ts`.
    domains: ["storage.getlayers.ai"],
  },
});
