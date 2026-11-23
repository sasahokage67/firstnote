import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { TeamRoleField } from "@/components/TeamRoleField";
import { CountryField, DEFAULT_COUNTRY, type HomeLocation } from "@/components/CountryField";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";


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
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth`, queryParams: { prompt: "select_account" } },
    });
    if (error) { setBusy(false); toast.error(error.message || t("auth.googleFail")); }
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
        <Button type="button" variant="outline" className="mt-6 h-11 w-full gap-3 bg-white text-[#1f1f1f] hover:bg-white/90 hover:text-[#1f1f1f]" disabled={busy} onClick={google}>
          <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
          </svg>
          {t("auth.google")}
        </Button>
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> {t("auth.or")} <div className="h-px flex-1 bg-border" />
        </div>
        <form onSubmit={submit} className="space-y-4">
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
        <button className="mt-6 w-full text-sm text-muted-foreground hover:text-foreground" type="button" onClick={() => { setMode(mode === "in" ? "up" : "in"); setPassword(""); }}>
          {mode === "in" ? t("auth.toUp") : t("auth.toIn")}
        </button>
      </div>
    </div>
  );
}
