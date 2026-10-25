/**
 * Coverflow carousel: centered active slide, 3D side rotation, arrows/dots,
 * keyboard, drag/swipe, and optional autoplay (paused on hover/focus/hidden tab).
 * Fully deterministic — no dependencies, seek-safe transform state.
 */
import { prefersReducedMotion } from "./reveal";

const AUTOPLAY_MS = 5000;
const DRAG_THRESHOLD_PX = 48;

export interface CarouselInstance {
  goTo(index: number): void;
  next(): void;
  prev(): void;
  destroy(): void;
}

export function initCarousel(root: HTMLElement): CarouselInstance | null {
  if (root.dataset.carouselInit) return null;
  root.dataset.carouselInit = "true";

  const trackEl = root.querySelector<HTMLElement>("[data-carousel-track]");
  if (!trackEl) return null;
  const track = trackEl;
  const slides = [...track.querySelectorAll<HTMLElement>("[data-slide]")];
  if (!slides.length) return null;

  const prevBtn = root.querySelector<HTMLButtonElement>("[data-carousel-prev]");
  const nextBtn = root.querySelector<HTMLButtonElement>("[data-carousel-next]");
  const dotsWrap = root.querySelector<HTMLElement>("[data-carousel-dots]");
  const statusEl = root.querySelector<HTMLElement>("[data-carousel-status]");
  const reducedMotion = prefersReducedMotion();

  let active = Math.max(
    0,
    slides.findIndex((s) => s.classList.contains("is-active")),
  );
  let timer = 0;
  let paused = false;
  let pointerStartX: number | null = null;

  const dots: HTMLButtonElement[] = [];
  if (dotsWrap) {
    slides.forEach((_, index) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "carousel-dot";
      dot.setAttribute("aria-label", `Go to slide ${index + 1}`);
      dot.addEventListener("click", () => {
        goTo(index);
        restartAutoplay();
      });
      dotsWrap.append(dot);
      dots.push(dot);
    });
  }

  function render(): void {
    const stage = root.querySelector<HTMLElement>(".carousel-stage");
    const stageWidth = stage?.clientWidth ?? root.clientWidth;
    const slideWidth = slides[0].offsetWidth;
    const gap = Number.parseFloat(getComputedStyle(track).gap || "0") || 0;

    // Center the active slide in the stage (flex layout → translate track).
    let offsetPx = 0;
    for (let i = 0; i < active; i++) offsetPx += slides[i].offsetWidth + gap;
    const slideCenter = offsetPx + slideWidth / 2;
    const shift = stageWidth / 2 - slideCenter;
    track.style.transform = `translate3d(${shift}px, 0, 0)`;

    slides.forEach((slide, index) => {
      const distance = index - active;
      const abs = Math.abs(distance);
      const isActive = distance === 0;
      slide.classList.toggle("is-active", isActive);
      slide.style.transform = `rotateY(${distance * -26}deg) translateZ(${abs === 0 ? 60 : -abs * 140}px) scale(${Math.max(0.78, 1 - abs * 0.08)})`;
      slide.style.opacity = abs > 2 ? "0" : String(1 - Math.min(0.55, abs * 0.27));
      slide.style.filter = isActive ? "none" : "saturate(0.6) brightness(0.75)";
      slide.style.zIndex = String(100 - abs);
      slide.setAttribute("aria-hidden", String(!isActive));
      slide.querySelectorAll<HTMLElement>("a, button").forEach((el) => {
        if (isActive) el.removeAttribute("tabindex");
        else el.setAttribute("tabindex", "-1");
      });
    });

    dots.forEach((dot, index) => {
      const isActive = index === active;
      dot.classList.toggle("is-active", isActive);
      if (isActive) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });

    if (statusEl) statusEl.textContent = `${String(active + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
    root.setAttribute("data-active-index", String(active));
  }

  function goTo(index: number): void {
    active = ((index % slides.length) + slides.length) % slides.length;
    render();
  }

  function stopAutoplay(): void {
    if (timer) {
      clearInterval(timer);
      timer = 0;
    }
  }

  function startAutoplay(): void {
    if (reducedMotion || paused) return;
    stopAutoplay();
    timer = window.setInterval(() => {
      if (document.hidden) return;
      goTo(active + 1);
    }, AUTOPLAY_MS);
  }

  function restartAutoplay(): void {
    stopAutoplay();
    startAutoplay();
  }

  // --- Controls -------------------------------------------------------------
  prevBtn?.addEventListener("click", () => {
    goTo(active - 1);
    restartAutoplay();
  });
  nextBtn?.addEventListener("click", () => {
    goTo(active + 1);
    restartAutoplay();
  });

  root.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(active - 1);
      restartAutoplay();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(active + 1);
      restartAutoplay();
    }
  });

  // --- Drag / swipe ---------------------------------------------------------
  const onPointerDown = (event: PointerEvent): void => {
    pointerStartX = event.clientX;
  };
  const onPointerUp = (event: PointerEvent): void => {
    if (pointerStartX === null) return;
    const delta = event.clientX - pointerStartX;
    pointerStartX = null;
    if (Math.abs(delta) < DRAG_THRESHOLD_PX) return;
    goTo(delta < 0 ? active + 1 : active - 1);
    restartAutoplay();
  };
  root.addEventListener("pointerdown", onPointerDown, { passive: true });
  root.addEventListener("pointerup", onPointerUp, { passive: true });
  root.addEventListener("pointercancel", () => {
    pointerStartX = null;
  });

  // --- Pause autoplay on interaction ---------------------------------------
  const pause = (): void => {
    paused = true;
    stopAutoplay();
  };
  const resume = (): void => {
    paused = false;
    startAutoplay();
  };
  root.addEventListener("pointerenter", pause);
  root.addEventListener("pointerleave", resume);
  root.addEventListener("focusin", pause);
  root.addEventListener("focusout", resume);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAutoplay();
    else startAutoplay();
  });

  const onResize = (): void => render();
  window.addEventListener("resize", onResize);

  render();
  startAutoplay();

  return {
    goTo,
    next: () => goTo(active + 1),
    prev: () => goTo(active - 1),
    destroy: () => {
      stopAutoplay();
      window.removeEventListener("resize", onResize);
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointerup", onPointerUp);
      delete root.dataset.carouselInit;
    },
  };
}
