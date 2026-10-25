/**
 * Unified rAF ticker with per-subscriber frame-rate throttling.
 * A single requestAnimationFrame loop drives every animation on the page.
 */
export type TickerCallback = (time: number, delta: number) => void;
export type FramerateSource = number | (() => number);

interface Subscriber {
  callback: TickerCallback;
  getFramerate: () => number;
  last: number;
}

const subscribers = new Set<Subscriber>();
let frameId = 0;
let frameTime = 0;

function tick(time: number): void {
  frameId = 0;
  const delta = Math.min(time - (frameTime || time), 64);
  frameTime = time;
  for (const entry of [...subscribers]) {
    try {
      const framerate = entry.getFramerate();
      if (!Number.isFinite(framerate)) throw new TypeError("Ticker framerate must be a finite number.");
      if (time - entry.last > framerate) {
        entry.last = time;
        entry.callback(time, delta);
      }
    } catch (error) {
      console.error("Animation ticker subscriber failed.", error);
    }
  }
  if (subscribers.size) frameId = requestAnimationFrame(tick);
}

/** Subscribe to the shared ticker. Returns an unsubscribe function. */
export function subscribe(callback: TickerCallback, getFramerate: FramerateSource = () => 0): () => void {
  const entry: Subscriber = {
    callback,
    getFramerate: typeof getFramerate === "function" ? getFramerate : () => getFramerate,
    last: 0,
  };
  subscribers.add(entry);
  if (!frameId) frameId = requestAnimationFrame(tick);
  return () => {
    subscribers.delete(entry);
    if (!subscribers.size && frameId) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    }
  };
}

/** Number of active subscribers — used by tests. */
export function subscriberCount(): number {
  return subscribers.size;
}
