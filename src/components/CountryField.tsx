import { useEffect, useState } from "react";
import { Flag } from "@/components/Flag";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRIES, type CountryCode } from "@/lib/events";
import { AREAS, areaNameIn, isArea } from "@/lib/regions";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_COUNTRY: CountryCode = "KZ";
const WHOLE = "__all";

export function isCountry(v: unknown): v is CountryCode {
  return typeof v === "string" && COUNTRIES.some((c) => c.code === v);
}

export type HomeLocation = { country: CountryCode; area: string | null };

/** Country + state/city picker shared by sign-up, the profile dialog and the events block. */
export function CountryField({ value, onChange }: { value: HomeLocation; onChange: (value: HomeLocation) => void }) {
  const { t, lang } = useI18n();
  const areas = Object.keys(AREAS[value.country])
    .map((code) => [code, areaNameIn(lang, value.country, code)] as const)
    .sort((a, b) => a[1].localeCompare(b[1], lang));
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>{t("country.label")}</Label>
        <Select value={value.country} onValueChange={(v) => isCountry(v) && onChange({ country: v, area: null })}>
          <SelectTrigger aria-label="Choose country"><SelectValue /></SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}><span className="flex items-center gap-2"><Flag code={c.code} />{t(`country.${c.code}`)}</span></SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {areas.length > 0 && (
        <div className="space-y-1.5">
          <Label>{t(`area.${value.country}`)}</Label>
          <Select value={value.area ?? WHOLE} onValueChange={(v) => onChange({ ...value, area: v === WHOLE ? null : v })}>
            <SelectTrigger aria-label={t(`area.${value.country}`)}><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={WHOLE}>{t("country.whole")}</SelectItem>
              {areas.map(([code, name]) => <SelectItem key={code} value={code}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{t("country.hint")}</p>
    </div>
  );
}

/** The signed-in user's home country and area (stored in Supabase auth user metadata). */
export function useHomeCountry(): { country: CountryCode | null; area: string | null; loaded: boolean } {
  const [state, setState] = useState<{ country: CountryCode | null; area: string | null; loaded: boolean }>({ country: null, area: null, loaded: false });
  useEffect(() => {
    const read = (meta: Record<string, unknown> | undefined) => {
      const country = isCountry(meta?.["country"]) ? (meta!["country"] as CountryCode) : null;
      const area = country && isArea(country, meta?.["area"]) ? (meta!["area"] as string) : null;
      setState({ country, area, loaded: true });
    };
    supabase.auth.getSession().then(({ data }) => read(data.session?.user.user_metadata));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => read(s?.user.user_metadata));
    return () => data.subscription.unsubscribe();
  }, []);
  return state;
}

export async function saveHomeCountry(loc: HomeLocation) {
  return supabase.auth.updateUser({ data: { country: loc.country, area: loc.area } });
}
