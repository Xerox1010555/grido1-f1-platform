import { describe, expect, it } from "vitest";
import { computeCountdown } from "../src/lib/countdown";

describe("computeCountdown", () => {
  const target = "2026-07-27T13:00:00+02:00";

  it("counts down to a future date", () => {
    const parts = computeCountdown(target, new Date("2026-07-25T13:00:00+02:00"));
    expect(parts.days).toBe(2);
    expect(parts.hours).toBe(0);
    expect(parts.finished).toBe(false);
  });

  it("handles partial days", () => {
    const parts = computeCountdown(target, new Date("2026-07-26T10:30:00+02:00"));
    expect(parts.days).toBe(1);
    expect(parts.hours).toBe(2);
    expect(parts.minutes).toBe(30);
  });

  it("never goes negative after the target", () => {
    const parts = computeCountdown(target, new Date("2026-08-15T00:00:00Z"));
    expect(parts.days).toBe(0);
    expect(parts.seconds).toBe(0);
    expect(parts.finished).toBe(true);
  });

  it("is timezone-aware (same instant, different offsets)", () => {
    const utc = computeCountdown(target, new Date("2026-07-27T10:00:00Z")); // 12:00 local
    expect(utc.hours).toBe(1);
    expect(utc.minutes).toBe(0);
  });
});
