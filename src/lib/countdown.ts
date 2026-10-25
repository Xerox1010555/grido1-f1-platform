/** Countdown to the next race start, timezone-aware via the ISO timestamp. */
export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  finished: boolean;
}

export function computeCountdown(targetIso: string, now: Date = new Date()): CountdownParts {
  const target = new Date(targetIso).getTime();
  const diff = Math.max(0, target - now.getTime());
  const seconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
    finished: diff === 0,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Bind a countdown to DOM nodes with [data-cd="days|hours|minutes|seconds"]. */
export function bindCountdown(root: HTMLElement, targetIso: string): () => void {
  const fields = {
    days: root.querySelector<HTMLElement>('[data-cd="days"]'),
    hours: root.querySelector<HTMLElement>('[data-cd="hours"]'),
    minutes: root.querySelector<HTMLElement>('[data-cd="minutes"]'),
    seconds: root.querySelector<HTMLElement>('[data-cd="seconds"]'),
  };

  const render = () => {
    const parts = computeCountdown(targetIso);
    if (fields.days) fields.days.textContent = String(parts.days);
    if (fields.hours) fields.hours.textContent = pad(parts.hours);
    if (fields.minutes) fields.minutes.textContent = pad(parts.minutes);
    if (fields.seconds) fields.seconds.textContent = pad(parts.seconds);
    root.classList.toggle("is-live", parts.finished);
  };

  render();
  const id = setInterval(render, 1000);
  return () => clearInterval(id);
}
