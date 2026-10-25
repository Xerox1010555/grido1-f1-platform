// Generates optimized AVIF/WebP variants of the hero portrait with sharp.
// Usage: node scripts/optimize-images.mjs
import { mkdir, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const SRC = fileURLToPath(new URL("../me.png", import.meta.url));
const OUT_DIR = fileURLToPath(new URL("../public/assets/", import.meta.url));

if (!existsSync(SRC)) {
  console.error(`Source image not found: ${SRC}`);
  process.exit(1);
}

await mkdir(OUT_DIR, { recursive: true });

const input = sharp(SRC);
const meta = await input.metadata();
console.log(`source: ${meta.width}x${meta.height}`);

// Keep the PNG as a universal fallback, add modern formats.
await copyFile(SRC, join(OUT_DIR, "me.png"));
await sharp(SRC)
  .resize({ width: 1600, withoutEnlargement: true })
  .avif({ quality: 60, effort: 4 })
  .toFile(join(OUT_DIR, "me.avif"));
await sharp(SRC)
  .resize({ width: 1600, withoutEnlargement: true })
  .webp({ quality: 78 })
  .toFile(join(OUT_DIR, "me.webp"));
console.log("ok    public/assets/me.{png,avif,webp}");
