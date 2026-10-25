/**
 * 3D tilt: pointer-driven perspective rotation on `[data-tilt]` elements.
 * Value of data-tilt = max degrees (default 7). Disabled for reduced motion
 * and coarse pointers (touch).
 */
import { prefersReducedMotion } from "./reveal";

export function initTilt(root: ParentNode = document): void {
  if (prefersReducedMotion()) return;
  const elements = [...root.querySelectorAll<HTMLElement>("[data-tilt]")];
  for (const el of elements) {
    if (el.dataset.tiltInit) continue;
    el.dataset.tiltInit = "true";
    const maxDeg = Number.parseFloat(el.dataset.tilt || "7") || 7;

    const set = (rx: number, ry: number): void => {
      el.style.transform = `perspective(1000px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    };

    el.addEventListener(
      "pointermove",
      (event) => {
        if (matchMedia("(hover: none)").matches) return;
        const rect = el.getBoundingClientRect();
        const px = (event.clientX - rect.left) / Math.max(1, rect.width) - 0.5;
        const py = (event.clientY - rect.top) / Math.max(1, rect.height) - 0.5;
        set(-py * maxDeg * 2, px * maxDeg * 2);
      },
      { passive: true },
    );
    el.addEventListener("pointerleave", () => set(0, 0));
  }
}
