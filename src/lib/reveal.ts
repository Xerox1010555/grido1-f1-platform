/**
 * Text reveal system: splits elements into word/letter units and animates
 * them in with spring physics when they scroll into view.
 */
import { subscribe } from "./ticker";
import { springStep, type SpringState } from "./spring";

interface RevealJob {
  element: HTMLElement;
  state: SpringState;
  startsAt: number;
  target: number;
  settleAt: number;
  tension: number;
  friction: number;
  distance: number;
}

const WORD_DELAY = 110;
const LETTER_DELAY = 26;
const YEAR_SETTLE_MS = 2200;
const YEAR_DIM_TARGET = 0.4;

let jobsStarted = false;
const jobs: RevealJob[] = [];

export function prefersReducedMotion(): boolean {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Split an element's text into revealable word/letter spans (idempotent). */
export function splitReveal(element: HTMLElement): void {
  if (element.dataset.split) return;
  const mode = element.dataset.reveal;
  const hasPeriod = Boolean(element.querySelector(".period")) || element.dataset.period === "true";
  // `dataset.lines` (set by i18n) wins over parsing rendered innerText — the
  // rendered text of a split element contains hidden screen-reader copies.
  const source = element.dataset.lines
    ? element.dataset.lines
    : (element.innerText ?? element.textContent ?? "");
  const lines = source
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const text = lines.join(" ").replace(/\s+/g, " ");
  const unitNodes: HTMLElement[] = [];
  let unitIndex = 0;
  element.replaceChildren();
  for (const line of lines) {
    const lineWrap = document.createElement("span");
    lineWrap.className = "reveal-line";
    lineWrap.setAttribute("aria-hidden", "true");
    const parts = mode === "words" ? (line.match(/[^\s.]+|\./g) || []) : [...line];
    for (const part of parts) {
      const isPeriod = part === "." && hasPeriod;
      const span = document.createElement("span");
      span.className = `unit${isPeriod ? " period" : ""}`;
      if (mode === "letters") span.dataset.letter = "";
      span.textContent = part;
      span.style.transitionDelay = `${unitIndex * (mode === "words" ? WORD_DELAY : LETTER_DELAY)}ms`;
      lineWrap.append(span);
      unitNodes.push(span);
      unitIndex += 1;
    }
    element.append(lineWrap);
  }
  const sr = document.createElement("span");
  sr.className = "plain-copy";
  sr.textContent = text;
  element.append(sr);
  element.dataset.split = "true";
  element.dataset.units = String(unitNodes.length);
}

/** Force every split unit visible instantly (reduced motion / fallback). */
export function revealAllInstantly(): void {
  document.querySelectorAll<HTMLElement>(".unit").forEach((unit) => {
    unit.style.opacity = "1";
    unit.style.transform = "none";
    unit.style.transition = "none";
  });
}

function enqueueJobs(root: HTMLElement, now: number): void {
  root.querySelectorAll<HTMLElement>(".unit").forEach((unit) => {
    const isYear = Boolean(unit.closest(".year"));
    const delay = parseFloat(unit.style.transitionDelay || "0");
    jobs.push({
      element: unit,
      state: { value: 0, velocity: 0 },
      startsAt: now + delay,
      target: 1,
      settleAt: isYear ? now + YEAR_SETTLE_MS : Number.POSITIVE_INFINITY,
      tension: unit.hasAttribute("data-letter") ? 200 : 90,
      friction: unit.hasAttribute("data-letter") ? 24 : 26,
      distance: unit.hasAttribute("data-letter") ? 0.3 : 0.35,
    });
  });
}

function driveJobs(time: number, delta: number): void {
  for (let i = jobs.length - 1; i >= 0; i--) {
    const job = jobs[i];
    if (time < job.startsAt) continue;
    if (time >= job.settleAt && job.target === 1) job.target = YEAR_DIM_TARGET;
    const value = springStep(job.state, job.target, job.tension, job.friction, delta);
    job.element.style.opacity = String(value);
    const revealProgress = job.target === 1 ? Math.min(1, Math.max(0, value)) : 1;
    job.element.style.transform = `translateY(${job.distance * (1 - revealProgress)}em)`;
    if (job.target === YEAR_DIM_TARGET) {
      if (Math.abs(value - YEAR_DIM_TARGET) < 0.001 && Math.abs(job.state.velocity) < 0.01) jobs.splice(i, 1);
    } else if (job.target === 1 && value === 1) {
      jobs.splice(i, 1);
    }
  }
}

/**
 * Initialise split + observe every `[data-reveal]` element on the page.
 * Safe to call once per page; with reduced motion everything shows instantly.
 */
export function initReveals(): void {
  const elements = [...document.querySelectorAll<HTMLElement>("[data-reveal]")];
  elements.forEach(splitReveal);

  if (prefersReducedMotion()) {
    revealAllInstantly();
    return;
  }

  if (!jobsStarted) {
    jobsStarted = true;
    subscribe(driveJobs, 0);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      const now = performance.now();
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        if (entry.target instanceof HTMLElement) enqueueJobs(entry.target, now);
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -15% 0px", threshold: 0.01 },
  );
  elements.forEach((element) => observer.observe(element));
}
