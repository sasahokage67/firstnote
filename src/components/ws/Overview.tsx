import { useEffect, useMemo, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { OTHER_EVENTS, readiness, STATUSES } from "@/lib/ftc";
import {
  COMPETITION_KINDS,
  COUNTRIES,
  type CountryCode,
  dateRange,
  DEFAULT_START_HOUR,
  eventEnd,
  eventStart,
  formatIn,
  type FtcEvent,
  gmtLabel,
  KIND_LABEL,
  place,
  useFtcEvents,
} from "@/lib/events";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SectionTitle, type WsProps } from "./shared";

const LS_COUNTRY = "firstnote-country";
const LS_EVENT = "firstnote-event";
const PAGE = 120;

function load(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function save(key: string, v: string) {
  try {
    localStorage.setItem(key, v);
  } catch {
    /* ignore */
  }
}

/** Team "other events" (Google Meets, streams…) as a selectable item. */
type Selected = { kind: "ftc"; ev: FtcEvent } | { kind: "other"; id: string; name: string; ts: number };

export function Overview({ data }: WsProps) {
  const { events, loading, error } = useFtcEvents();
  const [country, setCountry] = useState<CountryCode>(() => (load(LS_COUNTRY) as CountryCode) || "KZ");
  const [region, setRegion] = useState("");
  const [q, setQ] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [selId, setSelId] = useState<string | null>(() => load(LS_EVENT));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const meta = COUNTRIES.find((c) => c.code === country)!;
  const worlds = events.find((e) => e.t === "worlds");

  const inCountry = useMemo(() => events.filter((e) => e.co === country && e.t !== "worlds"), [events, country]);
  // Region filter: FIRST regions for the USA, cities elsewhere
  const regions = useMemo(() => {
    const set = new Set(inCountry.map((e) => (country === "US" ? e.rg : e.city)).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [inCountry, country]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return inCountry
      .filter((e) => showAll || COMPETITION_KINDS.includes(e.t))
      .filter((e) => !region || (country === "US" ? e.rg : e.city) === region)
      .filter((e) => showPast || eventEnd(e) >= now)
      .filter((e) => !needle || `${e.n} ${e.city} ${e.st} ${e.c} ${e.v}`.toLowerCase().includes(needle))
      .sort((a, b) => eventStart(a) - eventStart(b));
    // `now` only matters at minute granularity here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inCountry, showAll, region, showPast, q, country, Math.floor(now / 60000)]);

  // Resolve the selected event (persisted), else first upcoming in this country, else Worlds
  const selected: Selected | null = useMemo(() => {
    const other = OTHER_EVENTS.find((o) => o.id === selId);
    if (other) return { kind: "other", id: other.id, name: other.name, ts: new Date(other.date).getTime() };
    const ev = events.find((e) => e.c === selId) ?? list.find((e) => eventEnd(e) >= now) ?? worlds;
    return ev ? { kind: "ftc", ev } : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId, events, list, worlds]);

  function pickCountry(c: CountryCode) {
    setCountry(c);
    save(LS_COUNTRY, c);
    setRegion("");
    setQ("");
    setLimit(PAGE);
  }
  function pick(id: string) {
    setSelId(id);
    save(LS_EVENT, id);
  }

  const target = selected ? (selected.kind === "ftc" ? eventStart(selected.ev) : selected.ts) : now;
  const diff = Math.max(0, target - now);
  const parts = [
    ["Days", Math.floor(diff / 86400000)],
    ["Hrs", Math.floor(diff / 3600000) % 24],
    ["Min", Math.floor(diff / 60000) % 60],
    ["Sec", Math.floor(diff / 1000) % 60],
  ] as const;
  const pct = readiness(data.tasks, data.pages);

  return (
    <div>
      <SectionTitle title="Overview" sub="Countdown and team readiness" />

      {/* Countdown */}
      <div className="grid gap-px overflow-hidden rounded-md border border-border bg-border lg:grid-cols-3">
        <div className="bg-background p-6 lg:col-span-2">
          {selected?.kind === "ftc" ? (
            <>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
                {KIND_LABEL[selected.ev.t]} · {COUNTRIES.find((c) => c.code === selected.ev.co)?.flag}{" "}
                {place(selected.ev) || COUNTRIES.find((c) => c.code === selected.ev.co)?.name}
              </p>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">{selected.ev.n}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {dateRange(selected.ev)} · starts {formatIn(target, selected.ev.tz)} local ({gmtLabel(target, selected.ev.tz)})
                <span className="text-foreground"> · your time: {formatIn(target, undefined)}</span>
              </p>
              {selected.ev.v && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3" /> {selected.ev.v}
                </p>
              )}
            </>
          ) : selected?.kind === "other" ? (
            <>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Other event · {formatIn(selected.ts, undefined)} (your time)</p>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">{selected.name}</h2>
            </>
          ) : (
            <h2 className="text-2xl font-bold">{loading ? "Loading events…" : "Pick an event"}</h2>
          )}
          {diff === 0 && selected ? (
            <p className="mt-10 text-4xl font-bold text-primary">Event day / completed</p>
          ) : (
            <div className="mt-8 flex flex-wrap items-end gap-x-8 gap-y-4">
              {parts.map(([l, v], i) => (
                <div key={l}>
                  <p className={cn("font-mono text-5xl font-bold tabular-nums leading-none md:text-7xl", i === 0 && "text-primary")}>
                    {String(v).padStart(2, "0")}
                  </p>
                  <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{l}</p>
                </div>
              ))}
            </div>
          )}
          {selected?.kind === "ftc" && (
            <p className="mt-6 text-[11px] text-muted-foreground">
              FIRST doesn't publish start times — countdown is to {String(DEFAULT_START_HOUR).padStart(2, "0")}:00 local event time.
            </p>
          )}
        </div>
        <div className="flex flex-col justify-between bg-background p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Readiness</p>
          <p className="my-6 font-display text-7xl font-bold leading-none">{pct}<span className="text-primary">%</span></p>
          <div className="h-2 w-full bg-muted">
            <div className="h-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Tasks 60% · Portfolio 40%</p>
        </div>
      </div>

      {/* Event browser */}
      <div className="mt-6 rounded-md border border-border bg-background p-4 sm:p-6">
        <div className="flex flex-wrap gap-2">
          {COUNTRIES.map((c) => {
            const n = events.filter((e) => e.co === c.code && e.t !== "worlds" && COMPETITION_KINDS.includes(e.t) && eventEnd(e) >= now).length;
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => pickCountry(c.code)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition",
                  c.code === country ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <span>{c.flag}</span> {c.name}
                <span className="font-mono text-[11px] text-muted-foreground">{loading ? "…" : n}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} placeholder="Search event, city, code…" className="pl-8" />
          </div>
          {regions.length > 1 && (
            <select
              value={region}
              onChange={(e) => { setRegion(e.target.value); setLimit(PAGE); }}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm sm:w-56"
              aria-label={country === "US" ? "Region" : "City"}
            >
              <option value="">{country === "US" ? "All regions" : "All cities"}</option>
              {regions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <label className="flex cursor-pointer items-center gap-1.5">
            <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} /> Show past events
          </label>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Include kickoffs, workshops, interviews
          </label>
        </div>

        {worlds && (
          <EventRow ev={worlds} active={selected?.kind === "ftc" && selected.ev.c === worlds.c} past={eventEnd(worlds) < now} onPick={pick} className="mt-4 border-b border-border pb-2" />
        )}

        <div className="mt-2">
          {loading ? (
            <p className="py-6 text-sm text-muted-foreground">Loading events…</p>
          ) : list.length === 0 ? (
            <div className="py-6 text-sm text-muted-foreground">
              <p>{meta.note ?? (error ? "Couldn't load the event list." : "No events match these filters.")}</p>
            </div>
          ) : (
            <ul>
              {list.slice(0, limit).map((e) => (
                <li key={e.c}>
                  <EventRow ev={e} active={selected?.kind === "ftc" && selected.ev.c === e.c} past={eventEnd(e) < now} onPick={pick} />
                </li>
              ))}
            </ul>
          )}
          {list.length > limit && (
            <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="mt-2 w-full rounded-md border border-border py-2 text-sm text-muted-foreground hover:text-foreground">
              Show more ({list.length - limit} left)
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-[11px] text-muted-foreground">
          <span>Source: FIRST Tech Challenge event list, 2026-27 BIOBUZZ season.</span>
          {meta.links?.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="underline hover:text-foreground">{l.label}</a>
          ))}
        </div>
      </div>

      {/* Team "other events" */}
      <div className="mt-6 rounded-md border border-border bg-background p-6">
        <p className="mb-2 border-b border-border pb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Other events</p>
        <ul>
          {OTHER_EVENTS.map((o) => {
            const ts = new Date(o.date).getTime();
            return (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => pick(o.id)}
                  className={cn(
                    "flex w-full items-baseline justify-between gap-3 border-l-2 py-2 pl-3 pr-1 text-left text-sm transition",
                    selected?.kind === "other" && selected.id === o.id ? "border-primary bg-primary/10 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                    ts < now && "opacity-40",
                  )}
                >
                  <span className="truncate">{o.name}</span>
                  <span className="shrink-0 font-mono text-xs">{formatIn(ts, undefined)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border lg:grid-cols-4">
        {STATUSES.map((s) => (
          <div key={s.id} className="bg-background p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{s.name}</p>
            <p className={cn("mt-2 font-display text-4xl font-bold", s.id === "done" && "text-primary")}>
              {data.tasks.filter((t) => t.status === s.id).length}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventRow({ ev, active, past, onPick, className }: { ev: FtcEvent; active: boolean; past: boolean; onPick: (id: string) => void; className?: string }) {
  const start = eventStart(ev);
  return (
    <button
      type="button"
      onClick={() => onPick(ev.c)}
      className={cn(
        "flex w-full items-center justify-between gap-3 border-l-2 py-2 pl-3 pr-1 text-left text-sm transition",
        active ? "border-primary bg-primary/10 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
        past && "opacity-40",
        className,
      )}
    >
      <span className="min-w-0">
        <span className="block truncate text-foreground">{ev.n}</span>
        <span className="block truncate text-xs">
          {KIND_LABEL[ev.t]}
          {place(ev) && <> · {place(ev)}</>}
          {ev.co === "US" && ev.rg && <> · {ev.rg}</>}
          {ev.src === "team" && <> · not in FIRST system yet</>}
        </span>
      </span>
      <span className="shrink-0 text-right font-mono text-xs">
        <span className="block">{dateRange(ev)}</span>
        <span className="block text-[10px] text-muted-foreground">{gmtLabel(start, ev.tz)}</span>
      </span>
    </button>
  );
}
