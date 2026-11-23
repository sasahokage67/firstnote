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
  clockIn,
  gmtLabel,
  place,
  useFtcEvents,
} from "@/lib/events";
import { Input } from "@/components/ui/input";
import { CountryField, DEFAULT_COUNTRY, saveHomeCountry, useHomeCountry, type HomeLocation } from "@/components/CountryField";
import { areaNameIn, areaTimeZone, inArea } from "@/lib/regions";
import { useI18n, type TFn } from "@/lib/i18n";
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
  const { t, lang, locale } = useI18n();
  const { events, loading, error } = useFtcEvents();
  // Each user only sees FTC events of the country they registered with (+ Worlds)
  const { country: home, area: homeArea, loaded: homeLoaded } = useHomeCountry();
  const country: CountryCode = home ?? DEFAULT_COUNTRY;
  // "Your time" follows the city/state from the profile (falls back to the browser's zone)
  const homeTz = areaTimeZone(home, homeArea);
  const homePlace = homeArea ? areaNameIn(lang, country, homeArea) : home && homeTz ? t(`country.${home}`) : "";
  const countryName = t(`country.${country}`);
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
    return [...set].map((code) => [code, areaNameIn(lang, country, code)] as const).sort((a, b) => a[1].localeCompare(b[1], lang));
  }, [inCountry, country, homeArea, lang]);

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
      { title: t("ov.yourArea", { area: areaNameIn(lang, country, homeArea) }), items: near },
      { title: t("ov.rest", { country: countryName }), items: rest },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, region, homeArea, country, lang]);

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
    [t("ov.days"), Math.floor(diff / 86400000)],
    [t("ov.hrs"), Math.floor(diff / 3600000) % 24],
    [t("ov.min"), Math.floor(diff / 60000) % 60],
    [t("ov.sec"), Math.floor(diff / 1000) % 60],
  ] as const;
  const pct = readiness(data.tasks, data.pages);

  return (
    <div>
      <SectionTitle title={t("ov.title")} sub={t("ov.sub")} />

      {/* Countdown */}
      <div className="grid gap-px overflow-hidden rounded-md border border-border bg-border lg:grid-cols-3">
        <div className="bg-background p-6 lg:col-span-2">
          {selected?.kind === "ftc" ? (
            <>
              <p className="flex flex-wrap gap-x-4 font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
                <span>{t(`kind.${selected.ev.t}`)}</span>
                <span>{COUNTRIES.find((c) => c.code === selected.ev.co)?.flag} {place(selected.ev) || t(`country.${selected.ev.co}`)}</span>
              </p>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">{selected.ev.n}</h2>
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>{dateRange(selected.ev, locale)}</span>
                <span>{t("ov.starts", { time: formatIn(target, selected.ev.tz, true, locale), gmt: gmtLabel(target, selected.ev.tz) })}</span>
                <span className="text-foreground">
                  {t("ov.yourTime", { place: homePlace ? ` (${homePlace})` : "", time: formatIn(target, homeTz, true, locale) })}
                </span>
              </p>
              {selected.ev.v && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3" /> {selected.ev.v}
                </p>
              )}
            </>
          ) : selected?.kind === "other" ? (
            <>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">{t("ov.otherEvent", { time: formatIn(selected.ts, homeTz, true, locale) })}</p>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">{selected.name}</h2>
            </>
          ) : (
            <h2 className="text-2xl font-bold">{loading ? t("ov.loadingEvents") : t("ov.pick")}</h2>
          )}
          {diff === 0 && selected ? (
            <div className="mt-10">
              <p className="text-4xl font-bold text-primary">{t("ov.live")}</p>
              <p className="mt-2 text-xs text-muted-foreground">{t("ov.switchesIn", { h: hoursLeft })}</p>
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
              {t("ov.noTimes", { hour: String(DEFAULT_START_HOUR).padStart(2, "0") })}
            </p>
          )}
        </div>
        <div className="flex flex-col justify-between bg-background p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{t("ov.readiness")}</p>
          <p className="my-6 font-display text-7xl font-bold leading-none">{pct}<span className="text-primary">%</span></p>
          <div className="h-2 w-full bg-muted">
            <div className="h-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("ov.readinessSplit")}</p>
        </div>
      </div>

      {/* Event browser */}
      <div className="mt-6 rounded-md border border-border bg-background p-4 sm:p-6">
        {needsCountry ? (
          <div className="max-w-sm space-y-3">
            <p className="text-sm">{t("ov.chooseCountry")}</p>
            <CountryField value={draftLoc} onChange={setDraftLoc} />
            <Button variant="hero" onClick={confirmCountry} disabled={savingCountry}>{t("ov.showEvents")}</Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              <span>{t("ov.ftcEvents")}</span>
              <span className="text-foreground">{meta.flag} {countryName}{homeArea && <>, {areaNameIn(lang, country, homeArea)}</>}</span>
              {!loading && <span>{t("ov.shown", { n: list.length })}</span>}
            </p>
            <p className="text-[11px] text-muted-foreground">{t("ov.changeInProfile")}</p>
          </div>
        )}

        {homeLoaded && !needsCountry && (
          <>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} placeholder={t("ov.search")} className="pl-8" />
            </div>
            {regions.length > 1 && (
              <select
                value={region}
                onChange={(e) => { setRegion(e.target.value); setLimit(PAGE); }}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm sm:w-56"
                aria-label="Area"
              >
                <option value="">{t("ov.allOf", { country: countryName })}</option>
                {regions.map(([code, name]) => <option key={code} value={code}>{name}{code === homeArea ? t("ov.you") : ""}</option>)}
              </select>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <label className="flex cursor-pointer items-center gap-1.5">
              <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} /> {t("ov.showPast")}
            </label>
            <label className="flex cursor-pointer items-center gap-1.5">
              <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> {t("ov.showAll")}
            </label>
          </div>

          {worlds && (
            <EventRow ev={worlds} active={selected?.kind === "ftc" && selected.ev.c === worlds.c} past={now > holdUntil(worlds)} live={eventStart(worlds) <= now && now <= holdUntil(worlds)} onPick={pick} t={t} locale={locale} homeTz={homeTz} className="mt-4 border-b border-border pb-2" />
          )}

          <div className="mt-2">
            {loading ? (
              <p className="py-6 text-sm text-muted-foreground">Loading events…</p>
            ) : list.length === 0 ? (
              <div className="py-6 text-sm text-muted-foreground">
                <p>{country === "TH" ? t("ov.thNote") : error ? t("ov.loadFail") : t("ov.noMatch")}</p>
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
                          {sec.title} <span className="ml-1.5 text-muted-foreground">{sec.items.length}</span>
                        </p>
                      )}
                      {sec.title && sec.items.length === 0 && (
                        <p className="py-2 pl-3 text-xs text-muted-foreground">{t("ov.noneHere")}</p>
                      )}
                      <ul>
                        {shown.map((e) => (
                          <li key={e.c}>
                            <EventRow ev={e} active={selected?.kind === "ftc" && selected.ev.c === e.c} past={now > holdUntil(e)} live={eventStart(e) <= now && now <= holdUntil(e)} onPick={pick} t={t} locale={locale} homeTz={homeTz} />
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
                {t("ov.more", { n: list.length - limit })}
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-[11px] text-muted-foreground">
            <span>{t("ov.source")}</span>
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
        <p className="mb-2 border-b border-border pb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{t("ov.otherEvents")}</p>
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
                  <span className="shrink-0 font-mono text-xs">{formatIn(ts, homeTz, true, locale)}</span>
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

function EventRow({ ev, active, past, live, onPick, className, t, locale, homeTz }: {
  ev: FtcEvent; active: boolean; past: boolean; live?: boolean; onPick: (id: string) => void; className?: string;
  t: TFn; locale: string; homeTz: string | undefined;
}) {
  const start = eventStart(ev);
  const evGmt = gmtLabel(start, ev.tz);
  const homeGmt = gmtLabel(start, homeTz ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
  const sameZone = evGmt === homeGmt;
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
          {live && <span className="mr-1.5 rounded bg-primary px-1 py-0.5 font-mono text-[9px] font-bold uppercase text-primary-foreground">{t("ov.liveBadge")}</span>}
          {ev.n}
        </span>
        <span className="flex gap-x-3 truncate text-xs">
          <span className="shrink-0">{t(`kind.${ev.t}`)}</span>
          {place(ev) && <span className="truncate">{place(ev)}</span>}
          {ev.co === "US" && ev.rg && ev.rg !== areaNameIn("en", "US", ev.st) && <span className="truncate">{ev.rg}</span>}
          {ev.src === "team" && <span className="truncate">{t("ov.notInFirst")}</span>}
        </span>
      </span>
      <span className="shrink-0 text-right font-mono text-xs">
        <span className="block">{dateRange(ev, locale)}</span>
        <span className="block text-[10px] text-muted-foreground">
          {clockIn(start, ev.tz, locale)} {evGmt}
          {!sameZone && <span className="ml-2 text-foreground">{clockIn(start, homeTz, locale)} {t("ov.yours")}</span>}
        </span>
      </span>
    </button>
  );
}
