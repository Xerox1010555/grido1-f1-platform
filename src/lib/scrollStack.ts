/**
 * Stacked pinned-section scroll effect: pinned panels recede (scale + shade)
 * as the next panel scrolls over them. Disabled under 640px per design.
 */
export function initScrollStack(): () => void {
  const panelPairs = [...document.querySelectorAll<HTMLElement>(".pinned")]
    .map((panel) => ({
      inner: panel.querySelector<HTMLElement>(".recede-inner"),
      shade: panel.querySelector<HTMLElement>(".shade"),
      next: panel.nextElementSibling as HTMLElement | null,
    }))
    .filter((item): item is { inner: HTMLElement; shade: HTMLElement; next: HTMLElement } =>
      Boolean(item.inner && item.shade && item.next),
    );

  const rail = document.querySelector<HTMLElement>(".timeline-rail");
  const timeline = document.querySelector<HTMLElement>(".timeline");

  let scrollQueued = false;
  function update(): void {
    scrollQueued = false;
    const view = innerHeight || 1;
    const shrink = matchMedia("(max-width: 639px)").matches ? 0 : 0.1;
    for (const { inner, shade, next } of panelPairs) {
      const progress = Math.min(1, Math.max(0, 1 - next.getBoundingClientRect().top / view));
      inner.style.transform = progress > 0 && shrink > 0 ? `scale(${1 - shrink * progress})` : "";
      inner.style.willChange = progress > 0 && shrink > 0 ? "transform" : "";
      shade.style.opacity = `${0.55 * progress}`;
      inner.style.visibility = progress >= 1 ? "hidden" : "visible";
    }
    if (rail && timeline) {
      const rect = timeline.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (innerHeight - rect.top) / (rect.height + innerHeight)));
      rail.style.setProperty("--rail-progress", `${Math.min(progress * 1.7, 0.94) * 100}%`);
      rail.style.setProperty("--rail-turn", `${progress * 1800}deg`);
    }
  }

  const onScroll = () => {
    if (!scrollQueued) {
      scrollQueued = true;
      requestAnimationFrame(update);
    }
  };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", update);
  update();

  return () => {
    removeEventListener("scroll", onScroll);
    removeEventListener("resize", update);
  };
}
