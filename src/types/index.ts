/** Shared data contracts for GRIDO1 Racing Systems. */

export interface Driver {
  id: string;
  slug: string;
  name: string;
  firstName: string;
  lastName: string;
  number: number;
  driverIdCode: string;
  team: string;
  rookie: boolean;
  born: string;
  hometown: string;
  heightCm: number;
  bio: string;
  socials: Array<{ label: string; href: string }>;
}

export type RaceStatus = "finished" | "dnf" | "dns" | "upcoming";

export interface RaceResult {
  round: number;
  gpName: string;
  circuit: string;
  country: string;
  date: string; // ISO-8601
  gridPosition: number;
  finishPosition: number | null;
  points: number;
  status: RaceStatus;
  fastestLap: boolean;
  pole: boolean;
  note?: string;
}

export interface SeasonStats {
  year: number;
  team: string;
  car: string;
  races: number;
  wins: number;
  podiums: number;
  points: number;
  position: number;
  dnfs: number;
  poles: number;
  fastestLaps: number;
  leadGapToP2: number;
}

export interface ChampionshipRival {
  position: number;
  name: string;
  team: string;
  points: number;
}

export interface Season {
  stats: SeasonStats;
  results: RaceResult[];
  rivals: ChampionshipRival[];
}

export interface UpcomingRace {
  round: number;
  gpName: string;
  circuit: string;
  country: string;
  startsAt: string; // ISO-8601 with timezone offset
  circuitSlug: string;
}

export interface CircuitInfo {
  slug: string;
  name: string;
  country: string;
  countryCode: string;
  lengthKm: number;
  laps: number;
  lapRecord: { time: string; driver: string; year: number };
  drsZones: number;
  turnCount: number;
  /** SVG path in a 900x600 viewBox. */
  svgPath: string;
  turnMarkers: Array<{ x: number; y: number; label: string }>;
}

export interface TimelineEntry {
  year: number;
  title: string;
  body: string;
  image: string;
  alt: string;
  featured: boolean;
}

export interface JournalPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string; // ISO-8601
  category: string;
  heroImage: string;
  heroAlt: string;
  readMinutes: number;
  body: string; // markdown-ish plain text blocks separated by \n\n
}

export interface Product {
  slug: string;
  name: string;
  tagline: string;
  price: number; // USD
  currency: "USD";
  image: string;
  imageAlt: string;
  badge?: string;
  description: string[];
  sizes?: string[];
  stripePaymentLink?: string;
}

export interface GarageSpec {
  name: string;
  code: string;
  powerUnit: string;
  chassis: string;
  weightKg: number;
  engine: string;
  energyRecovery: string;
  gearbox: string;
  fuel: string;
  tyres: string;
  topSpeedKmh: number;
  zeroToHundred: string;
  highlights: Array<{ label: string; value: string; detail: string }>;
}
