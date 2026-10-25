/**
 * Canvas effects: marching-squares contour fields, checkerboard dissolve seams,
 * and the halftone dot field behind the season circuit.
 * All per-frame DOM queries are resolved once at init (fixes the original
 * per-frame querySelectorAll hot path).
 */
import { subscribe } from "./ticker";
import { prefersReducedMotion } from "./reveal";

const CONTOUR_INTERVAL_MS = 24;

function field(x: number, y: number, t: number): number {
  return (
    0.5 +
    0.5 *
      (Math.sin(x + t * 0.6) * 0.5 +
        Math.sin(y * 0.85 - t * 0.45) * 0.45 +
        Math.sin((x + y) * 0.65 + t * 0.35) * 0.35 +
        Math.sin((x - y) * 0.95 - t * 0.55) * 0.25)
  );
}

function drawContours(canvas: HTMLCanvasElement, time: number): void {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const width = Math.round(rect.width * dpr);
  const height = Math.round(rect.height * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  const cols = rect.width >= rect.height ? 96 : Math.max(8, Math.round((96 * rect.width) / rect.height));
  const rows = Math.max(8, Math.round((cols * rect.height) / rect.width));
  const dx = width / cols;
  const dy = height / rows;
  const aspect = rect.width / rect.height;
  const t = (time / 1000) * 1.66;
  const values = new Float32Array((cols + 1) * (rows + 1));
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const nx = ((i / cols) * 2 - 1) * aspect * 3.8;
      const ny = ((j / rows) * 2 - 1) * 3.8;
      const qx = nx + Math.sin(ny * 0.8 + t * 0.7) * 0.37;
      const qy = ny + Math.cos(nx * 0.7 - t * 0.6) * 0.37;
      values[j * (cols + 1) + i] = field(qx, qy, t) * 2.5;
    }
  }
  ctx.strokeStyle = canvas.dataset.contourColor || "#ebeef1";
  ctx.lineWidth = dpr;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  const segment = (p: number[], q: number[]) => {
    ctx.moveTo(p[0], p[1]);
    ctx.lineTo(q[0], q[1]);
  };
  for (let level = 0.5; level < 2.5; level++) {
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const k = j * (cols + 1) + i;
        const a = values[k];
        const b = values[k + 1];
        const c = values[k + cols + 2];
        const d = values[k + cols + 1];
        const index = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
        if (!index || index === 15) continue;
        const x = i * dx;
        const y = j * dy;
        const interp = (v1: number, v2: number) => (level - v1) / (v2 - v1 || 1);
        const top = [x + dx * interp(a, b), y];
        const right = [x + dx, y + dy * interp(b, c)];
        const bottom = [x + dx * interp(d, c), y + dy];
        const left = [x, y + dy * interp(a, d)];
        switch (index) {
          case 1:
          case 14:
            segment(left, bottom);
            break;
          case 2:
          case 13:
            segment(bottom, right);
            break;
          case 3:
          case 12:
            segment(left, right);
            break;
          case 4:
          case 11:
            segment(top, right);
            break;
          case 6:
          case 9:
            segment(top, bottom);
            break;
          case 7:
          case 8:
            segment(left, top);
            break;
          case 5:
            segment(left, top);
            segment(bottom, right);
            break;
          case 10:
            segment(left, bottom);
            segment(top, right);
            break;
        }
      }
    }
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function cellNoise(x: number, y: number): number {
  let hash = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967295;
}

function drawChecker(canvas: HTMLCanvasElement): void {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  const width = Math.round(rect.width * ratio);
  const height = Math.round(rect.height * ratio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, width, height);
  const section = canvas.closest("[data-season], .timeline, .paddock");
  const sectionTop = section?.getBoundingClientRect().top ?? innerHeight;
  const progress = Math.min(1, Math.max(0, 1 - sectionTop / Math.max(1, innerHeight)));
  const cell = 24 * ratio;
  const columns = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const surface = canvas.dataset.carry === "dark" ? "#090a0b" : "#f7fafb";
  for (let y = 0; y < rows; y++) {
    const depth = y / Math.max(1, rows - 1) + progress * 2;
    if (depth > 1) break;
    const solid = depth <= 0.16;
    const fade = Math.max(0, Math.min(1, 1 - (depth - 0.16) / 0.84));
    for (let x = 0; x < columns; x++) {
      const noise = cellNoise(x, y);
      if (!solid && ((x + y) % 2 !== 0 || noise > fade)) continue;
      context.fillStyle = !solid && noise < 0.06 ? "#02d2e3" : surface;
      context.fillRect(x * cell, y * cell, cell, cell);
    }
  }
}

/** Draw the halftone dot disc behind the circuit (Fibonacci spiral). */
export function drawMapHalftone(mapCanvas: HTMLCanvasElement, dots: Array<{ x: number; y: number }>): void {
  const rect = mapCanvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const ratio = Math.min(
    devicePixelRatio || 1,
    matchMedia("(hover: none) and (pointer: coarse)").matches ? 1 : 2,
  );
  const width = Math.round(rect.width * ratio);
  const height = Math.round(rect.height * ratio);
  if (mapCanvas.width !== width || mapCanvas.height !== height) {
    mapCanvas.width = width;
    mapCanvas.height = height;
  }
  const context = mapCanvas.getContext("2d");
  if (!context) return;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, rect.width, rect.height);
  context.fillStyle = "rgb(122 122 122 / 58%)";
  context.beginPath();
  for (const dot of dots) {
    context.moveTo(dot.x * rect.width + 0.8, dot.y * rect.height);
    context.arc(dot.x * rect.width, dot.y * rect.height, 0.8, 0, Math.PI * 2);
  }
  context.fill();
}

export function createMapDots(count = 8004): Array<{ x: number; y: number }> {
  return Array.from({ length: count }, (_, index) => {
    const angle = index * 2.399963229728653;
    const radius = Math.sqrt((index + 0.5) / count);
    const outline = 0.78 + Math.sin(angle * 3 + 0.7) * 0.08 + Math.sin(angle * 7 - 1.2) * 0.035;
    return {
      x: 0.53 + Math.cos(angle) * radius * outline * 0.48,
      y: 0.52 + Math.sin(angle) * radius * outline * 0.39,
    };
  });
}

/**
 * Start the shared contour + checker render loop. Returns a stop function.
 * Canvases outside the viewport (by 150px rootMargin) skip contour drawing.
 */
export function initCanvasEffects(): () => void {
  const contourCanvases = [...document.querySelectorAll<HTMLCanvasElement>("[data-contour]")];
  const checkerCanvases = [...document.querySelectorAll<HTMLCanvasElement>("[data-checker]")];
  if (!contourCanvases.length && !checkerCanvases.length) return () => {};

  const visibleCanvas = new WeakMap<HTMLCanvasElement, boolean>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) visibleCanvas.set(entry.target as HTMLCanvasElement, entry.isIntersecting);
    },
    { rootMargin: "150px" },
  );
  for (const canvas of contourCanvases) {
    visibleCanvas.set(canvas, true);
    observer.observe(canvas);
  }

  let lastContourFrame = 0;
  const stop = subscribe(
    (time) => {
      if (time - lastContourFrame < CONTOUR_INTERVAL_MS) return;
      lastContourFrame = time;
      for (const canvas of contourCanvases) {
        if (visibleCanvas.get(canvas)) drawContours(canvas, time);
      }
      for (const canvas of checkerCanvases) drawChecker(canvas);
    },
    () => 0,
  );

  return () => {
    observer.disconnect();
    stop();
  };
}

/** Calendar strip ambient motion (dashed line drift + LIVE bracket pulse). */
export function initCalendarMotion(
  lines: HTMLElement[],
  liveBracket: HTMLElement | null,
): () => void {
  if (prefersReducedMotion() || (!lines.length && !liveBracket)) return () => {};
  return subscribe((time) => {
    for (const line of lines) {
      line.style.backgroundPositionX = `${-(((time % 5200) / 5200) * 11.45)}px`;
    }
    if (liveBracket) liveBracket.style.opacity = String(0.78 + 0.22 * Math.sin((time / 3200) * Math.PI * 2) ** 2);
  }, 0);
}
