import { describe, expect, it } from "vitest";
import {
  getDriver,
  getSeason,
  getSeasonStats,
  getResults,
  getNextRace,
  getCircuit,
  getPosts,
  getProducts,
  getCalendarStrip,
  getGarage,
  getTimeline,
} from "../src/lib/api";

describe("data integrity", () => {
  it("hero stats and season stats derive from one source (no contradiction)", () => {
    const stats = getSeasonStats();
    const season = getSeason();
    expect(stats).toBe(season.stats);
    expect(stats.year).toBe(2026);
  });

  it("season stats match the race-by-race results", () => {
    const stats = getSeasonStats();
    const results = getResults();
    const totalPoints = results.reduce((sum, r) => sum + r.points, 0);
    const wins = results.filter((r) => r.finishPosition === 1).length;
    const podiums = results.filter((r) => (r.finishPosition ?? 99) <= 3).length;
    const dnfs = results.filter((r) => r.status === "dnf").length;

    expect(stats.points).toBe(totalPoints);
    expect(stats.wins).toBe(wins);
    expect(stats.podiums).toBe(podiums);
    expect(stats.dnfs).toBe(dnfs);
    expect(stats.races).toBe(results.length);
  });

  it("the driver's points lead is consistent with rivals", () => {
    const season = getSeason();
    const leader = season.rivals[0];
    const p2 = season.rivals[1];
    expect(leader.name).toBe(getDriver().name);
    expect(leader.points - p2.points).toBe(season.stats.leadGapToP2);
  });

  it("next race resolves to a future race with a known circuit", () => {
    const next = getNextRace(new Date("2026-07-20T00:00:00Z"));
    expect(new Date(next.startsAt).getTime()).toBeGreaterThan(new Date("2026-07-20").getTime());
    const circuit = getCircuit(next.circuitSlug);
    expect(circuit).toBeDefined();
    expect(circuit?.svgPath.length).toBeGreaterThan(10);
  });

  it("calendar strip returns 5 entries with exactly one live race", () => {
    const strip = getCalendarStrip(new Date("2026-07-20T00:00:00Z"));
    expect(strip).toHaveLength(5);
    expect(strip.filter((e) => e.state === "live")).toHaveLength(1);
  });

  it("journal posts are sorted newest first and have unique slugs", () => {
    const posts = getPosts();
    expect(posts.length).toBeGreaterThan(0);
    expect(new Set(posts.map((p) => p.slug)).size).toBe(posts.length);
    const dates = posts.map((p) => new Date(p.date).getTime());
    expect([...dates].sort((a, b) => b - a)).toEqual(dates);
  });

  it("products have valid prices and unique slugs", () => {
    const products = getProducts();
    expect(new Set(products.map((p) => p.slug)).size).toBe(products.length);
    for (const product of products) {
      expect(product.price).toBeGreaterThan(0);
      expect(product.description.length).toBeGreaterThan(0);
    }
  });

  it("timeline and garage data are present", () => {
    expect(getTimeline().length).toBeGreaterThanOrEqual(5);
    expect(getGarage().code).toBeTruthy();
  });
});
