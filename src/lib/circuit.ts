/**
 * Season circuit module: SVG track draw-on, turn markers, grid drift, radar
 * ping, pointer reticle, and the halftone field.
 */
import { subscribe } from "./ticker";
import { prefersReducedMotion } from "./reveal";
import { createMapDots, drawMapHalftone } from "./canvasFx";

const DRAW_DURATION_MS = 6000;
const MARKER_LIT_AT = [0.18, 0.43, 0.68, 0.88];

export function initCircuit(circuit: HTMLElement): () => void {
  const track = circuit.querySelector<SVGPathElement>(".track");
  const mapCanvas = circuit.querySelector<HTMLCanvasElement>(".map-halftone");
  const grid = circuit.querySelector<SVGGraphicsElement>(".map-grid");
  const ping = circuit.querySelector<SVGCircleElement>(".map-ping");
  const markers = [...circuit.querySelectorAll<SVGCircleElement>(".turn-marker")];
  if (!track) return () => {};

  const dots = createMapDots();

  if (mapCanvas) {
    const redraw = () => drawMapHalftone(mapCanvas, dots);
    new ResizeObserver(redraw).observe(mapCanvas);
    redraw();
  }

  let circuitStart: number | null = null;
  let circuitLength = 1800;
  let visible = false;
  let graceFrames = 0;

  const visibility = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        visible = entry.isIntersecting;
        if (!entry.isIntersecting) graceFrames = 10;
      }
    },
    { rootMargin: "100px" },
  );
  visibility.observe(circuit);

  if (prefersReducedMotion()) {
    circuitLength = track.getTotalLength();
    track.style.strokeDasharray = String(circuitLength);
    track.style.strokeDashoffset = "0";
    track.classList.add("is-resting");
    markers.forEach((marker) => marker.classList.add("is-lit"));
    return () => visibility.disconnect();
  }

  const drawObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        circuitLength = track.getTotalLength();
        track.style.strokeDasharray = String(circuitLength);
        circuitStart = performance.now();
        track.style.strokeDashoffset = String(circuitLength);
        drawObserver.unobserve(circuit);
      }
    },
    { threshold: 0.15 },
  );
  drawObserver.observe(circuit);

  const stop = subscribe((time) => {
    if (circuitStart === null || !(visible || graceFrames > 0)) return;
    if (!visible) graceFrames -= 1;
    const progress = Math.min(1, Math.max(0, (time - circuitStart) / DRAW_DURATION_MS));
    track.style.strokeDashoffset = String(circuitLength * (1 - progress));
    track.classList.toggle("is-resting", progress >= 1);
    markers.forEach((marker, index) => {
      const threshold = MARKER_LIT_AT[index] ?? 1;
      marker.classList.toggle("is-lit", progress >= threshold);
    });
    if (grid) grid.style.strokeDashoffset = String(-(((time % 7000) / 7000) * 12));
    if (ping) {
      const pingProgress = (time % 4200) / 4200;
      const eased = 1 - (1 - pingProgress) * (1 - pingProgress);
      ping.setAttribute("r", String(14 + eased * 86));
      ping.style.opacity = String(0.4 * (1 - pingProgress) ** 2);
    }
  }, 0);

  return () => {
    stop();
    visibility.disconnect();
    drawObserver.disconnect();
  };
}

/** Pointer reticle that tracks the cursor inside the circuit bounding box. */
export function initReticle(section: HTMLElement, circuit: HTMLElement): void {
  const reticle = circuit.querySelector<HTMLElement>(".map-reticle");
  if (!reticle) return;
  if (prefersReducedMotion()) return;

  section.addEventListener(
    "pointermove",
    (event) => {
      if (matchMedia("(hover: none)").matches) return;
      const rect = circuit.getBoundingClientRect();
      const outside =
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom;
      reticle.style.display = outside ? "none" : "block";
      if (outside) return;
      reticle.style.left = `${event.clientX - rect.left}px`;
      reticle.style.top = `${event.clientY - rect.top}px`;
    },
    { passive: true },
  );
  section.addEventListener("pointerleave", () => {
    reticle.style.display = "none";
  });
}
