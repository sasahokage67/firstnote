import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRIES, type CountryCode } from "@/lib/events";
import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_COUNTRY: CountryCode = "KZ";

export function isCountry(v: unknown): v is CountryCode {
  return typeof v === "string" && COUNTRIES.some((c) => c.code === v);
}

/** Country picker shared by sign-up and the profile dialog. */
export function CountryField({ value, onChange }: { value: CountryCode; onChange: (value: CountryCode) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>Country</Label>
      <Select value={value} onValueChange={(v) => isCountry(v) && onChange(v)}>
        <SelectTrigger aria-label="Choose country"><SelectValue /></SelectTrigger>
        <SelectContent>
          {COUNTRIES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {c.flag} {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">Used to show your country's FTC events first.</p>
    </div>
  );
}

/** The signed-in user's home country (stored in Supabase auth user metadata). */
export function useHomeCountry(): { country: CountryCode | null; loaded: boolean } {
  const [state, setState] = useState<{ country: CountryCode | null; loaded: boolean }>({ country: null, loaded: false });
  useEffect(() => {
    const read = (meta: Record<string, unknown> | undefined) =>
      setState({ country: isCountry(meta?.["country"]) ? (meta!["country"] as CountryCode) : null, loaded: true });
    supabase.auth.getSession().then(({ data }) => read(data.session?.user.user_metadata));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => read(s?.user.user_metadata));
    return () => data.subscription.unsubscribe();
  }, []);
  return state;
}

export async function saveHomeCountry(country: CountryCode) {
  return supabase.auth.updateUser({ data: { country } });
}
