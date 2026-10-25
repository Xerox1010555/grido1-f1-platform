// Downloads the design-asset set from the remote asset host into public/assets
// so the site is fully self-hosted (no runtime third-party dependency for content).
// Usage: node scripts/download-assets.mjs
import { mkdir, writeFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.ASSET_ORIGIN || "https://storage.getlayers.ai/assets/kimi-04a9449ab2";
const ROOT = fileURLToPath(new URL("../public/assets/", import.meta.url));

const FILES = [
  "hero/ui/backdrop-lines.svg",
  "hero/ui/grido1-logo.webp",
  "hero/ui/flag-italy.webp",
  "hero/ui/icon-rookie.svg",
  "hero/ui/mercedes-logo.webp",
  "hero/ui/circuit-spa.webp",
  "hero/ui/play-button.svg",
  "hero/ui/helmet-mask.png",
  "hero/scene/helmet3.glb",
  "hero/scene/studio-light.hdr",
  "timeline/2012.webp",
  "timeline/2015.webp",
  "timeline/2019.webp",
  "timeline/2021.webp",
  "timeline/2024.webp",
  "timeline/2025.webp",
  "timeline/2026.webp",
  "paddock/portrait.webp",
  "footer/body.webp",
  "footer/helmet.webp",
];

async function exists(path) {
  try {
    const s = await stat(path);
    return s.size > 0;
  } catch {
    return false;
  }
}

let ok = 0;
let failed = 0;
for (const rel of FILES) {
  const dest = join(ROOT, rel);
  if (await exists(dest)) {
    console.log(`skip  ${rel} (exists)`);
    ok += 1;
    continue;
  }
  try {
    await mkdir(dirname(dest), { recursive: true });
    const res = await fetch(`${BASE}/${rel}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(dest, buf);
    console.log(`ok    ${rel} (${(buf.length / 1024).toFixed(0)} KB)`);
    ok += 1;
  } catch (error) {
    console.error(`FAIL  ${rel} — ${error.message}`);
    failed += 1;
  }
}
console.log(`\nDone: ${ok} ok, ${failed} failed.`);
process.exit(failed > 0 ? 1 : 0);
