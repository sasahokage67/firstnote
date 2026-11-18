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
import { CountryField, DEFAULT_COUNTRY, saveHomeCountry, useHomeCountry, type HomeLocation } from "@/components/CountryField";
import { areaName, inArea } from "@/lib/regions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SectionTitle, type WsProps } from "./shared";

const LS_EVENT = "firstnote-event";
const PAGE = 120;
/** After the countdown hits zero the event stays up for one more day (or until it ends), then drops off. */
const HOLD_MS = 24 * 3600 * 1000;
const holdUntil = (ev: FtcEvent) => Math.max(eventStart(ev) + HOLD_MS, eventEnd(ev));

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
  // Each user only sees FTC events of the country they registered with (+ Worlds)
  const { country: home, area: homeArea, loaded: homeLoaded } = useHomeCountry();
  const country: CountryCode = home ?? DEFAULT_COUNTRY;
  const needsCountry = homeLoaded && !home;
  const [draftLoc, setDraftLoc] = useState<HomeLocation>({ country: DEFAULT_COUNTRY, area: null });
  const [savingCountry, setSavingCountry] = useState(false);
  async function confirmCountry() {
    setSavingCountry(true);
    const r = await saveHomeCountry(draftLoc);
    setSavingCountry(false);
    if (r.error) toast.error(r.error.message);
  }
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
  // Area filter (state / province / county / KZ city-region), only areas that have events + the user's own
  const regions = useMemo(() => {
    const set = new Set(inCountry.map((e) => e.st).filter(Boolean));
    if (homeArea) set.add(homeArea);
    return [...set].map((code) => [code, areaName(country, code)] as const).sort((a, b) => a[1].localeCompare(b[1]));
  }, [inCountry, country, homeArea]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return inCountry
      .filter((e) => showAll || COMPETITION_KINDS.includes(e.t))
      .filter((e) => !region || inArea(e, region))
      .filter((e) => showPast || now <= holdUntil(e))
      .filter((e) => !needle || `${e.n} ${e.city} ${e.st} ${e.c} ${e.v}`.toLowerCase().includes(needle))
      .sort((a, b) => eventStart(a) - eventStart(b));
    // `now` only matters at minute granularity here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inCountry, showAll, region, showPast, q, country, Math.floor(now / 60000)]);

  // Resolve the selected event (persisted), else first upcoming in this country, else Worlds
  const selected: Selected | null = useMemo(() => {
    const other = OTHER_EVENTS.find((o) => o.id === selId);
    if (other && now <= new Date(other.date).getTime() + HOLD_MS)
      return { kind: "other", id: other.id, name: other.name, ts: new Date(other.date).getTime() };
    if (!homeLoaded) return null;
    // only the user's own country (or Worlds), and only until a day after it started
    const saved = events.find((e) => e.c === selId && (e.co === country || e.t === "worlds") && now <= holdUntil(e));
    const live = (e: FtcEvent) => now <= holdUntil(e);
    const ev =
      saved ??
      (homeArea ? list.find((e) => live(e) && inArea(e, homeArea)) : undefined) ??
      list.find(live) ??
      (worlds && live(worlds) ? worlds : undefined);
    return ev ? { kind: "ftc", ev } : null;
    // re-evaluated every minute so expired events drop off automatically
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId, events, list, worlds, country, homeArea, homeLoaded, Math.floor(now / 60000)]);

  // user's area first, then the rest of the country
  const sections = useMemo(() => {
    if (region || !homeArea) return [{ title: "", items: list }];
    const near = list.filter((e) => inArea(e, homeArea));
    const rest = list.filter((e) => !inArea(e, homeArea));
    return [
      { title: `Your area · ${areaName(country, homeArea)}`, items: near },
      { title: `Rest of ${COUNTRIES.find((c) => c.code === country)!.name}`, items: rest },
    ];
  }, [list, region, homeArea, country]);

  // reset filters when the user's country changes
  useEffect(() => {
    setRegion("");
    setQ("");
    setLimit(PAGE);
  }, [country]);

  function pick(id: string) {
    setSelId(id);
    save(LS_EVENT, id);
  }

  const target = selected ? (selected.kind === "ftc" ? eventStart(selected.ev) : selected.ts) : now;
  const diff = Math.max(0, target - now);
  const holdEnd = selected ? (selected.kind === "ftc" ? holdUntil(selected.ev) : selected.ts + HOLD_MS) : now;
  const hoursLeft = Math.max(1, Math.ceil((holdEnd - now) / 3600000));
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
            <div className="mt-10">
              <p className="text-4xl font-bold text-primary">It's on! Happening now</p>
              <p className="mt-2 text-xs text-muted-foreground">Switches to the next event automatically in ~{hoursLeft} h.</p>
            </div>
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
        {needsCountry ? (
          <div className="max-w-sm space-y-3">
            <p className="text-sm">Choose your country to see its FTC events. You can change it later in your profile.</p>
            <CountryField value={draftLoc} onChange={setDraftLoc} />
            <Button variant="hero" onClick={confirmCountry} disabled={savingCountry}>Show events</Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              FTC events · <span className="text-foreground">{meta.flag} {meta.name}{homeArea && <> · {areaName(country, homeArea)}</>}</span>
              {!loading && <> · {list.length} shown</>}
            </p>
            <p className="text-[11px] text-muted-foreground">Change country / area in your profile</p>
          </div>
        )}

        {homeLoaded && !needsCountry && (
          <>
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
                aria-label="Area"
              >
                <option value="">All of {meta.name}</option>
                {regions.map(([code, name]) => <option key={code} value={code}>{name}{code === homeArea ? " (you)" : ""}</option>)}
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
            <EventRow ev={worlds} active={selected?.kind === "ftc" && selected.ev.c === worlds.c} past={now > holdUntil(worlds)} live={eventStart(worlds) <= now && now <= holdUntil(worlds)} onPick={pick} className="mt-4 border-b border-border pb-2" />
          )}

          <div className="mt-2">
            {loading ? (
              <p className="py-6 text-sm text-muted-foreground">Loading events…</p>
            ) : list.length === 0 ? (
              <div className="py-6 text-sm text-muted-foreground">
                <p>{meta.note ?? (error ? "Couldn't load the event list." : "No events match these filters.")}</p>
              </div>
            ) : (
              (() => {
                let budget = limit;
                return sections.map((sec) => {
                  const shown = sec.items.slice(0, Math.max(0, budget));
                  budget -= shown.length;
                  if (!sec.title && shown.length === 0) return null;
                  return (
                    <div key={sec.title || "all"} className={sec.title ? "mt-3" : ""}>
                      {sec.title && (
                        <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                          {sec.title} · {sec.items.length}
                        </p>
                      )}
                      {sec.title && sec.items.length === 0 && (
                        <p className="py-2 pl-3 text-xs text-muted-foreground">No upcoming FTC events here yet.</p>
                      )}
                      <ul>
                        {shown.map((e) => (
                          <li key={e.c}>
                            <EventRow ev={e} active={selected?.kind === "ftc" && selected.ev.c === e.c} past={now > holdUntil(e)} live={eventStart(e) <= now && now <= holdUntil(e)} onPick={pick} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                });
              })()
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
          </>
        )}
      </div>

      {/* Team "other events" (each disappears a day after it starts) */}
      {OTHER_EVENTS.some((o) => now <= new Date(o.date).getTime() + HOLD_MS) && (
      <div className="mt-6 rounded-md border border-border bg-background p-6">
        <p className="mb-2 border-b border-border pb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Other events</p>
        <ul>
          {OTHER_EVENTS.filter((o) => now <= new Date(o.date).getTime() + HOLD_MS).map((o) => {
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
      )}

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

function EventRow({ ev, active, past, live, onPick, className }: { ev: FtcEvent; active: boolean; past: boolean; live?: boolean; onPick: (id: string) => void; className?: string }) {
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
        <span className="block truncate text-foreground">
          {live && <span className="mr-1.5 rounded bg-primary px-1 py-0.5 font-mono text-[9px] font-bold uppercase text-primary-foreground">Live</span>}
          {ev.n}
        </span>
        <span className="block truncate text-xs">
          {KIND_LABEL[ev.t]}
          {place(ev) && <> · {place(ev)}</>}
          {ev.co === "US" && ev.rg && ev.rg !== areaName("US", ev.st) && <> · {ev.rg}</>}
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
