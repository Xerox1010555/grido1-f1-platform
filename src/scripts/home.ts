/** Homepage orchestrator: wires the landing-page motion systems.
 *  Site-wide runtime (i18n, menu, consent, reveals, canvas FX) lives in BaseLayout.
 */
import "../styles/home.css";
import { initScrollStack } from "../lib/scrollStack";
import { initLoader, finishLoader } from "../lib/loader";
import { initCircuit, initReticle } from "../lib/circuit";
import { initCalendarMotion } from "../lib/canvasFx";
import { subscribe } from "../lib/ticker";
import { prefersReducedMotion } from "../lib/reveal";

function boot(): void {
  initScrollStack();

  const circuit = document.querySelector<HTMLElement>("#circuit");
  const seasonSection = document.querySelector<HTMLElement>("[data-season]");
  if (circuit) {
    initCircuit(circuit);
    if (seasonSection) initReticle(seasonSection, circuit);
  }

  const lines = [...document.querySelectorAll<HTMLElement>(".calendar-line")];
  const liveBracket = document.querySelector<HTMLElement>(".live-bracket");
  initCalendarMotion(lines, liveBracket);

  // Timeline hover: mute sibling rows + seen-state observer.
  const rows = [...document.querySelectorAll<HTMLElement>("[data-timeline-row]")];
  rows.forEach((row) => {
    row.addEventListener("pointerenter", () => {
      rows.forEach((other) => {
        if (other !== row) other.classList.add("is-muted");
      });
    });
    row.addEventListener("pointerleave", () => {
      rows.forEach((other) => other.classList.remove("is-muted"));
    });
  });
  const rowObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) entry.target.classList.add("is-seen");
      }
    },
    { rootMargin: "0% 0% -25% 0%" },
  );
  rows.forEach((row) => rowObserver.observe(row));

  // Loader + helmet (dynamic import keeps Three.js out of the critical path).
  initLoader();
  if (prefersReducedMotion()) {
    finishLoader();
  } else {
    import("./helmet")
      .then((m) => m.initHelmetScene())
      .catch((error: unknown) => console.error("Helmet scene failed to load.", error));
  }

  // Lenis smooth scroll — lazy, skipped for reduced motion.
  if (!prefersReducedMotion()) {
    import("lenis")
      .then(({ default: Lenis }) => {
        const lenis = new Lenis({ smoothWheel: true });
        subscribe((time) => lenis.raf(time), () => 0);
      })
      .catch((error: unknown) => console.error("Lenis failed to load.", error));
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
