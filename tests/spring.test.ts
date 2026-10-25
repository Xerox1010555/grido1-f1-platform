import { describe, expect, it } from "vitest";
import { springStep, isSettled, type SpringState } from "../src/lib/spring";

describe("springStep", () => {
  it("converges toward the target", () => {
    const state: SpringState = { value: 0, velocity: 0 };
    let value = 0;
    for (let i = 0; i < 600; i++) value = springStep(state, 1, 90, 26, 16);
    expect(value).toBeCloseTo(1, 3);
    expect(isSettled(state, 1)).toBe(true);
  });

  it("is frame-rate independent (60fps vs 30fps arrive together)", () => {
    const a: SpringState = { value: 0, velocity: 0 };
    const b: SpringState = { value: 0, velocity: 0 };
    for (let i = 0; i < 120; i++) springStep(a, 1, 200, 24, 16);
    for (let i = 0; i < 60; i++) springStep(b, 1, 200, 24, 32);
    expect(a.value).toBeCloseTo(b.value, 2);
  });

  it("overshoots slightly then settles (underdamped)", () => {
    const state: SpringState = { value: 0, velocity: 0 };
    let max = 0;
    for (let i = 0; i < 300; i++) {
      max = Math.max(max, springStep(state, 1, 200, 24, 16));
    }
    expect(max).toBeGreaterThan(1); // spring has life
    expect(state.value).toBeCloseTo(1, 3);
  });

  it("clamps runaway delta to 64ms", () => {
    const state: SpringState = { value: 0, velocity: 0 };
    const value = springStep(state, 1, 90, 26, 10_000);
    expect(Number.isFinite(value)).toBe(true);
    expect(Math.abs(value)).toBeLessThan(5);
  });
});
