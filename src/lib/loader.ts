/** Loader overlay: progress-driven, min visible 600ms, force-reveal at 4s, spring exit. */
import { subscribe } from "./ticker";
import { springStep } from "./spring";
import { currentProgress } from "./assets";

const MIN_VISIBLE_MS = 600;
const FORCE_REVEAL_MS = 4000;
const CLEAR_DELAY_MS = 670;

let finished = false;
let riseCallback: () => void = () => {};

/** Called once the 3D scene (or fallback) is ready to rise behind the loader. */
export function onSceneRise(callback: () => void): void {
  riseCallback = callback;
}

function markLoadedLabel(): void {
  const loader = document.querySelector<HTMLElement>("#loader");
  loader?.setAttribute("aria-label", loader.dataset.loadedLabel || "Loaded");
}

function lift(loader: HTMLElement): void {
  loader.hidden = true;
  loader.classList.add("is-lifting");
  riseCallback();
}

/** Fade the loader out with a spring, then hide it and trigger the scene rise. */
export function finishLoader(): void {
  const loader = document.querySelector<HTMLElement>("#loader");
  if (!loader || finished) return;
  finished = true;
  markLoadedLabel();
  document.documentElement.style.setProperty("--load-progress", "1");
  loader.classList.add("is-clearing");

  setTimeout(() => {
    const fade = { value: 1, velocity: 0 };
    let stop = () => {};
    const fallback = setTimeout(() => {
      if (loader.hidden) return;
      stop();
      loader.style.opacity = "0";
      lift(loader);
    }, 3000);
    stop = subscribe((time, delta) => {
      void time;
      const opacity = springStep(fade, 0, 140, 26, delta);
      loader.style.opacity = String(opacity);
      if (opacity <= 0.001 && Math.abs(fade.velocity) < 0.01) {
        clearTimeout(fallback);
        lift(loader);
        stop();
      }
    }, 0);
  }, CLEAR_DELAY_MS);
}

/**
 * Watch real asset progress and finish the loader when either:
 * all tracked assets settled (after min visible time), or the hard cap elapses.
 * Returns immediately-finished state for reduced-motion users.
 */
export function initLoader(): void {
  const loader = document.querySelector<HTMLElement>("#loader");
  if (!loader) return;

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    finishLoader();
    return;
  }

  const startedAt = performance.now();
  const watchdog = setTimeout(() => finishLoader(), FORCE_REVEAL_MS);
  const stop = subscribe(() => {
    const elapsed = performance.now() - startedAt;
    if (elapsed >= MIN_VISIBLE_MS && currentProgress() >= 1) {
      clearTimeout(watchdog);
      stop();
      finishLoader();
    }
  }, 100);
}
