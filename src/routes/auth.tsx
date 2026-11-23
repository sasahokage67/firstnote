import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { TeamRoleField } from "@/components/TeamRoleField";
import { CountryField, DEFAULT_COUNTRY, type HomeLocation } from "@/components/CountryField";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";

// Google sign-in needs the Google provider enabled in your Supabase project.
const GOOGLE_ENABLED = import.meta.env["VITE_ENABLE_GOOGLE_AUTH"] === "true";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — firstnote" },
      { name: "description", content: "Sign in to the firstnote FTC team workspace." },
      { property: "og:title", content: "Sign in — firstnote" },
      { property: "og:description", content: "Sign in to the firstnote FTC team workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("Member");
  const [loc, setLoc] = useState<HomeLocation>({ country: DEFAULT_COUNTRY, area: null });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) navigate({ to: "/app", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/app", data: { full_name: name, team_role: role, country: loc.country, area: loc.area } },
        });
        if (error) throw error;
        if (!data.session) {
          // Accounts are confirmed on sign-up, so sign straight in; fall back to the email hint.
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) toast.success(t("auth.checkEmail"));
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      const msg = (err as Error).message;
      if (/invalid login credentials/i.test(msg)) toast.error(t("auth.err.invalid"));
      else if (/not confirmed/i.test(msg)) toast.error(t("auth.err.notConfirmed"));
      else if (/already registered/i.test(msg)) toast.error(t("auth.err.exists"));
      else toast.error(msg || t("auth.err.server"));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error(r.error.message ?? t("auth.googleFail"));
  }

  return (
    <div className="relative grid min-h-screen place-items-center px-4 py-16">
      <Link to="/" className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground sm:left-6 sm:top-6">
        <ArrowLeft className="size-4" /> {t("auth.back")}
      </Link>
      <LanguageSwitcher className="absolute right-4 top-5 sm:right-6 sm:top-7" />
      <div className="glass w-full max-w-md p-8">
        <Link to="/" aria-label="firstnote home" className="inline-block"><Logo className="h-10" /></Link>
        <h1 className="mt-6 text-2xl font-semibold">{mode === "in" ? t("auth.welcome") : t("auth.join")}</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "up" && (
            <>
              <div className="space-y-1.5"><Label>{t("common.name")}</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
              <TeamRoleField value={role} onChange={setRole} />
              <CountryField value={loc} onChange={setLoc} />
            </>
          )}
          <div className="space-y-1.5"><Label>{t("common.email")}</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t("common.password")}</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <Button type="submit" variant="hero" className="w-full" disabled={busy}>{mode === "in" ? t("common.signIn") : t("auth.create")}</Button>
        </form>
        {GOOGLE_ENABLED && <Button variant="outline" className="mt-3 w-full" onClick={google}>{t("auth.google")}</Button>}
        <button className="mt-6 w-full text-sm text-muted-foreground hover:text-foreground" type="button" onClick={() => { setMode(mode === "in" ? "up" : "in"); setPassword(""); }}>
          {mode === "in" ? t("auth.toUp") : t("auth.toIn")}
        </button>
      </div>
    </div>
  );
}
