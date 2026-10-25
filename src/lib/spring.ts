/** Damped-spring physics used for text reveals, loader exits, and 3D rises. */
export interface SpringState {
  value: number;
  velocity: number;
}

/**
 * Advance a spring toward `target` with semi-implicit Euler integration.
 * Fixed 1ms sub-steps keep behaviour frame-rate independent.
 */
export function springStep(
  state: SpringState,
  target: number,
  tension: number,
  friction: number,
  delta: number,
): number {
  let remaining = Math.min(delta, 64);
  while (remaining > 0) {
    const step = Math.min(1, remaining) / 1000;
    const acceleration = tension * (target - state.value) - friction * state.velocity;
    state.velocity += acceleration * step;
    state.value += state.velocity * step;
    remaining -= step * 1000;
  }
  if (Math.abs(state.velocity) < 0.01 && Math.abs(target - state.value) < 0.001) {
    state.value = target;
    state.velocity = 0;
  }
  return state.value;
}

/** True once the spring has effectively settled on `target`. */
export function isSettled(state: SpringState, target: number): boolean {
  return Math.abs(state.velocity) < 0.01 && Math.abs(target - state.value) < 0.001;
}
