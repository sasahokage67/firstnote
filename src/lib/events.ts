import { useEffect, useState } from "react";

/** Event type codes produced by the events build script. */
export type EventKind =
  | "qualifier"
  | "league_meet"
  | "league_tournament"
  | "championship"
  | "scrimmage"
  | "worlds"
  | "kickoff"
  | "leadership"
  | "other";

export type FtcEvent = {
  c: string; // FIRST event code
  n: string; // name
  t: EventKind;
  s: string; // start date YYYY-MM-DD (local to event)
  e: string; // end date
  city: string;
  st: string; // state / province / region code
  co: CountryCode;
  rg: string; // FIRST region (USA only)
  v: string; // venue
  tz: string; // IANA time zone of the event
  src?: "first" | "ustem" | "team";
};

export type CountryCode = "KZ" | "US" | "CA" | "RO" | "TH" | "BR" | "GR" | "JM";

export const COUNTRIES: { code: CountryCode; name: string; flag: string; note?: string; links?: { label: string; href: string }[] }[] = [
  { code: "KZ", name: "Kazakhstan", flag: "🇰🇿", links: [{ label: "USTEM Connect", href: "https://connect.ustem.kz/events?program=FTC" }] },
  { code: "US", name: "USA", flag: "🇺🇸" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "RO", name: "Romania", flag: "🇷🇴" },
  {
    code: "TH",
    name: "Thailand",
    flag: "🇹🇭",
    note: "No 2026-27 FTC Thailand events are published yet. Check back later or follow the official pages.",
    links: [
      { label: "FTC Thailand (Facebook)", href: "https://www.facebook.com/FIRSTTechChallengeTHAILAND" },
      { label: "ftcthailand.org", href: "http://www.ftcthailand.org/" },
    ],
  },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "GR", name: "Greece", flag: "🇬🇷" },
  { code: "JM", name: "Jamaica", flag: "🇯🇲" },
];

export const KIND_LABEL: Record<EventKind, string> = {
  qualifier: "Qualifier",
  league_meet: "League Meet",
  league_tournament: "League Tournament",
  championship: "Championship",
  scrimmage: "Scrimmage",
  worlds: "World Championship",
  kickoff: "Kickoff",
  leadership: "Leadership Award",
  other: "Workshop / Other",
};

/** Competitions shown by default; kickoffs, workshops etc. only with "show all". */
export const COMPETITION_KINDS: EventKind[] = [
  "qualifier",
  "league_meet",
  "league_tournament",
  "championship",
  "scrimmage",
  "worlds",
];

/**
 * Kazakhstan events that are not (yet) in the FIRST event system.
 * Edit this list by hand when new local events are announced.
 */
export const KZ_EXTRA: FtcEvent[] = [
  { c: "KZ-JETISU", n: "Jetisu FIRST Regional", t: "qualifier", s: "2026-12-03", e: "2026-12-03", city: "", st: "ZHT", co: "KZ", rg: "", v: "", tz: "Asia/Qyzylorda", src: "team" },
  { c: "KZ-ONTUSTIK", n: "Ontustik FIRST Qualifier", t: "qualifier", s: "2027-01-07", e: "2027-01-07", city: "", st: "", co: "KZ", rg: "", v: "", tz: "Asia/Qyzylorda", src: "team" },
  { c: "KZ-CACMP", n: "Central Asian FIRST Championship", t: "championship", s: "2027-02-10", e: "2027-02-10", city: "", st: "", co: "KZ", rg: "", v: "", tz: "Asia/Qyzylorda", src: "team" },
];

/** FTC events don't publish start times; we count down to 09:00 local. */
export const DEFAULT_START_HOUR = 9;

const offsetCache = new Map<string, Intl.DateTimeFormat>();
function tzOffsetMinutes(utcMs: number, tz: string): number {
  let f = offsetCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    offsetCache.set(tz, f);
  }
  const p = Object.fromEntries(f.formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour!, +p.minute!, +p.second!);
  return Math.round((asUtc - utcMs) / 60000);
}

/** Clock time only, e.g. "09:00", in the given zone. */
export function clockIn(ts: number, tz: string | undefined, locale?: string): string {
  return new Date(ts).toLocaleTimeString(locale, { timeZone: tz, hour: "2-digit", minute: "2-digit" });
}

/** UTC timestamp of `date` at `hour`:00 wall-clock time in `tz`. */
export function zonedTime(date: string, tz: string, hour = DEFAULT_START_HOUR): number {
  const [y, m, d] = date.split("-").map(Number);
  const guess = Date.UTC(y!, m! - 1, d!, hour);
  let ts = guess - tzOffsetMinutes(guess, tz) * 60000;
  ts = guess - tzOffsetMinutes(ts, tz) * 60000; // second pass handles DST edges
  return ts;
}

export function eventStart(ev: FtcEvent): number {
  return zonedTime(ev.s, ev.tz);
}

/** End of the event's last day (local), used to decide if it is over. */
export function eventEnd(ev: FtcEvent): number {
  return zonedTime(ev.e, ev.tz, 23);
}

export function gmtLabel(ts: number, tz: string): string {
  const min = tzOffsetMinutes(ts, tz);
  const sign = min >= 0 ? "+" : "-";
  const a = Math.abs(min);
  return `GMT${sign}${Math.floor(a / 60)}${a % 60 ? ":" + String(a % 60).padStart(2, "0") : ""}`;
}

export function formatIn(ts: number, tz: string | undefined, withTime = true, locale?: string): string {
  return new Date(ts).toLocaleString(locale, {
    timeZone: tz,
    weekday: "short",
    day: "2-digit",
    month: "short",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function dateRange(ev: FtcEvent, locale?: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", timeZone: "UTC" };
  const a = new Date(ev.s + "T00:00:00Z").toLocaleDateString(locale, opts);
  if (ev.e === ev.s) return a;
  const b = new Date(ev.e + "T00:00:00Z").toLocaleDateString(locale, opts);
  return `${a} – ${b}`;
}

export function place(ev: FtcEvent): string {
  return [ev.city, ev.co === "US" || ev.co === "CA" || ev.co === "BR" ? ev.st : ""].filter(Boolean).join(", ");
}

type EventsState = { events: FtcEvent[]; loading: boolean; error: boolean; updated?: string };
let cache: EventsState | null = null;

/** Loads the season event list (static JSON in /public/events). */
export function useFtcEvents(): EventsState {
  const [state, setState] = useState<EventsState>(cache ?? { events: [], loading: true, error: false });
  useEffect(() => {
    if (cache) return;
    let alive = true;
    fetch("/events/2026.json")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<{ events: FtcEvent[]; updated: string }>;
      })
      .then((j) => {
        cache = { events: [...j.events.map((e) => ({ ...e, src: "first" as const })), ...KZ_EXTRA], loading: false, error: false, updated: j.updated };
        if (alive) setState(cache);
      })
      .catch(() => alive && setState({ events: KZ_EXTRA, loading: false, error: true }));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
