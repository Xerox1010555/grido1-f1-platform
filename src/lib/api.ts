/**
 * Single typed access layer over the JSON data files.
 * Every template reads content through this module — numbers are NEVER hard-coded
 * in markup, and a future CMS swap only touches this file.
 */
import type {
  CircuitInfo,
  Driver,
  GarageSpec,
  JournalPost,
  Product,
  RaceResult,
  Season,
  SeasonStats,
  TimelineEntry,
  UpcomingRace,
} from "../types";

import driverJson from "../data/driver.json";
import seasonJson from "../data/season.json";
import calendarJson from "../data/calendar.json";
import circuitsJson from "../data/circuits.json";
import timelineJson from "../data/timeline.json";
import journalJson from "../data/journal.json";
import productsJson from "../data/products.json";
import garageJson from "../data/garage.json";

export function getDriver(): Driver {
  return driverJson as Driver;
}

export function getSeason(): Season {
  return seasonJson as unknown as Season;
}

export function getSeasonStats(): SeasonStats {
  return getSeason().stats;
}

export function getResults(): RaceResult[] {
  return [...getSeason().results].sort((a, b) => b.round - a.round);
}

export function getUpcoming(): UpcomingRace[] {
  return (calendarJson as { upcoming: UpcomingRace[] }).upcoming;
}

/** The next race = first upcoming race whose start is in the future, else the first listed. */
export function getNextRace(now: Date = new Date()): UpcomingRace {
  const upcoming = getUpcoming();
  const future = upcoming.find((race) => new Date(race.startsAt).getTime() > now.getTime());
  return future ?? upcoming[0];
}

export function getCircuit(slug: string): CircuitInfo | undefined {
  return (circuitsJson as { circuits: CircuitInfo[] }).circuits.find((c) => c.slug === slug);
}

export function getTimeline(): TimelineEntry[] {
  return timelineJson as TimelineEntry[];
}

export function getPosts(): JournalPost[] {
  return [...(journalJson as JournalPost[])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export function getPost(slug: string): JournalPost | undefined {
  return (journalJson as JournalPost[]).find((p) => p.slug === slug);
}

export function getProducts(): Product[] {
  return productsJson as Product[];
}

export function getProduct(slug: string): Product | undefined {
  return (productsJson as Product[]).find((p) => p.slug === slug);
}

export function getGarage(): GarageSpec {
  return garageJson as GarageSpec;
}

/** Calendar strip for the paddock: previous two rounds (with results) + next three upcoming. */
export interface CalendarStripEntry {
  round: number;
  label: string; // "Round 13"
  gpName: string;
  dateLabel: string; // "27 Jul"
  state: "done" | "live" | "upcoming";
  resultLabel: string | null; // "P3" | "●" | "○"
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]}`;
}

export function getCalendarStrip(now: Date = new Date()): CalendarStripEntry[] {
  const results = getResults();
  const next = getNextRace(now);
  const done = results.slice(0, 2).reverse(); // rounds just completed
  const upcomingAll = getUpcoming();
  const nextIndex = upcomingAll.findIndex((r) => r.round === next.round);
  const upcoming = upcomingAll.slice(nextIndex, nextIndex + 3);

  const entries: CalendarStripEntry[] = done.map((r) => ({
    round: r.round,
    label: `Round ${r.round}`,
    gpName: r.gpName,
    dateLabel: formatDateLabel(r.date),
    state: "done",
    resultLabel: r.status === "finished" && r.finishPosition ? `P${r.finishPosition}` : "DNF",
  }));

  upcoming.forEach((r, i) => {
    entries.push({
      round: r.round,
      label: `Round ${r.round}`,
      gpName: r.gpName,
      dateLabel: formatDateLabel(r.startsAt),
      state: i === 0 ? "live" : "upcoming",
      resultLabel: i === 0 ? "●" : "○",
    });
  });

  return entries.slice(0, 5);
}
