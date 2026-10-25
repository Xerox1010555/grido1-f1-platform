/**
 * Asset resilience: early error handlers, a visible error banner, and real
 * preload progress feeding the loader (pending image/model/HDR fetch count).
 */
const FALLBACK_ORIGIN = import.meta.env.ASSET_FALLBACK_ORIGIN || "https://storage.getlayers.ai";

let tracked = 0;
let settled = 0;
let banner: HTMLElement | null = null;
const failedUrls = new Set<string>();

function ensureBanner(): HTMLElement | null {
  if (banner) return banner;
  banner = document.querySelector("#asset-error");
  return banner;
}

export function reportAssetError(url: string, error?: unknown): void {
  const el = ensureBanner();
  if (!el) return;
  failedUrls.add(url);
  const message = error instanceof Error ? error.message : "";
  el.hidden = false;
  el.textContent = `Some design assets failed to load (${failedUrls.size}): latest — ${url}${message ? ` — ${message}` : ""}`;
}

function settle(): void {
  settled += 1;
  const progress = tracked === 0 ? 1 : Math.min(1, settled / tracked);
  document.documentElement.style.setProperty("--load-progress", String(progress));
}

/** Track one pending asset load (image, model, HDR). Feeds the loader meter. */
export function trackAsset(promise: Promise<unknown>): Promise<unknown> {
  tracked += 1;
  return promise.finally(settle);
}

/** Wrap an <img> in the progress tracker and attach an early error handler. */
export function trackImage(img: HTMLImageElement): void {
  if (img.dataset.tracked) return;
  img.dataset.tracked = "true";
  if (img.complete && img.naturalWidth > 0) return;
  trackAsset(
    new Promise<void>((resolve) => {
      img.addEventListener("load", () => resolve(), { once: true });
      img.addEventListener(
        "error",
        () => {
          reportAssetError(img.currentSrc || img.src, new Error("Image request failed"));
          resolve();
        },
        { once: true },
      );
    }),
  );
}

/**
 * Register every image present at init. Call before any lazy content mounts.
 * Returns the count of assets now being tracked.
 */
export function trackAllImages(): number {
  const images = [...document.querySelectorAll<HTMLImageElement>("img")];
  images.forEach(trackImage);
  return images.length;
}

/**
 * Try the local /assets path first; on error, retry once against the fallback
 * origin (keeps the site deployable even if an asset was not mirrored).
 */
export function installAssetFallback(): void {
  document.addEventListener(
    "error",
    (event) => {
      const target = event.target as HTMLElement | null;
      if (!(target instanceof HTMLImageElement) && !(target instanceof HTMLSourceElement)) return;
      const el = target as HTMLImageElement | HTMLSourceElement;
      const url = "currentSrc" in el ? el.currentSrc || (el as HTMLImageElement).src : "";
      if (!url || !url.startsWith("/assets/")) return;
      if (el.dataset.fallbackTried) {
        reportAssetError(url, new Error("Local and fallback assets both failed"));
        return;
      }
      el.dataset.fallbackTried = "true";
      const fallbackUrl = url.replace("/assets/", `${FALLBACK_ORIGIN}/assets/`);
      if (el instanceof HTMLImageElement) el.src = fallbackUrl;
    },
    true,
  );
}

export function currentProgress(): number {
  return tracked === 0 ? 1 : Math.min(1, settled / tracked);
}
