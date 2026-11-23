import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, MailCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  const [mode, setMode] = useState<"in" | "up" | "forgot" | "reset" | "sent">(() =>
    typeof window !== "undefined" && /type=recovery/.test(window.location.hash) ? "reset" : "in");
  // Opened from a password-reset email: stay here to set a new password instead of jumping to the app.
  const recovering = useRef(mode === "reset");
  const [sentKind, setSentKind] = useState<"confirm" | "reset">("confirm");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("Member");
  const [loc, setLoc] = useState<HomeLocation>({ country: DEFAULT_COUNTRY, area: null });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // A link from an email that has expired or was already used comes back with an error in the hash.
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.get("error_description")) {
      toast.error(t("auth.linkExpired"));
      history.replaceState(null, "", window.location.pathname);
      recovering.current = false;
      setMode("in");
    }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && !recovering.current) navigate({ to: "/app", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") { recovering.current = true; setMode("reset"); return; }
      if (s && !recovering.current) navigate({ to: "/app", replace: true });
    });
    return () => data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const linkBack = () => `${window.location.origin}/auth`;

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: linkBack() });
    setBusy(false);
    if (error) { toast.error(/rate limit/i.test(error.message) ? t("auth.err.rate") : error.message); return; }
    setSentKind("reset"); setMode("sent");
  }

  async function saveNewPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    recovering.current = false;
    toast.success(t("auth.passwordSaved"));
    navigate({ to: "/app", replace: true });
  }

  async function resend() {
    setBusy(true);
    const { error } = sentKind === "reset"
      ? await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: linkBack() })
      : await supabase.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: linkBack() } });
    setBusy(false);
    if (error) toast.error(/rate limit|seconds/i.test(error.message) ? t("auth.err.rate") : error.message);
    else toast.success(t("auth.resent"));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: linkBack(), data: { full_name: name, team_role: role, country: loc.country, area: loc.area } },
        });
        if (error) throw error;
        // With email confirmation on, an already-registered email comes back as a user with no identities.
        if (data.user && data.user.identities?.length === 0) throw new Error("already registered");
        if (!data.session) {
          // If the account is already confirmed (auto-confirm), sign straight in; otherwise ask to check the email.
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) { setSentKind("confirm"); setMode("sent"); }
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
      else if (/rate limit/i.test(msg)) toast.error(t("auth.err.rate"));
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
        {mode === "sent" ? (
          <div className="mt-6 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary/15 text-primary"><MailCheck className="size-7" /></div>
            <h1 className="mt-4 text-2xl font-semibold">{t("auth.sentTitle")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t(sentKind === "reset" ? "auth.sentReset" : "auth.sentConfirm", { email: email.trim() })}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{t("auth.checkSpam")}</p>
            <Button variant="outline" className="mt-6 w-full" disabled={busy} onClick={resend}>{t("auth.resend")}</Button>
            <button type="button" className="mt-4 text-sm text-muted-foreground hover:text-foreground" onClick={() => { setMode("in"); setPassword(""); }}>
              {t("auth.backToIn")}
            </button>
          </div>
        ) : mode === "forgot" ? (
          <>
            <h1 className="mt-6 text-2xl font-semibold">{t("auth.forgotTitle")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("auth.forgotSub")}</p>
            <form onSubmit={sendReset} className="mt-6 space-y-4">
              <div className="space-y-1.5"><Label>{t("common.email")}</Label><Input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <Button type="submit" variant="hero" className="w-full" disabled={busy}>{t("auth.sendLink")}</Button>
            </form>
            <button type="button" className="mt-6 w-full text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode("in")}>{t("auth.backToIn")}</button>
          </>
        ) : mode === "reset" ? (
          <>
            <h1 className="mt-6 text-2xl font-semibold">{t("auth.resetTitle")}</h1>
            <form onSubmit={saveNewPassword} className="mt-6 space-y-4">
              <div className="space-y-1.5"><Label>{t("auth.newPassword")}</Label><Input type="password" required minLength={6} autoFocus value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <Button type="submit" variant="hero" className="w-full" disabled={busy}>{t("auth.savePassword")}</Button>
            </form>
          </>
        ) : (
          <>
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
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>{t("common.password")}</Label>
              {mode === "in" && (
                <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => { setMode("forgot"); setPassword(""); }}>
                  {t("auth.forgot")}
                </button>
              )}
            </div>
            <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" variant="hero" className="w-full" disabled={busy}>{mode === "in" ? t("common.signIn") : t("auth.create")}</Button>
        </form>
        {GOOGLE_ENABLED && <Button variant="outline" className="mt-3 w-full" onClick={google}>{t("auth.google")}</Button>}
        <button className="mt-6 w-full text-sm text-muted-foreground hover:text-foreground" type="button" onClick={() => { setMode(mode === "in" ? "up" : "in"); setPassword(""); }}>
          {mode === "in" ? t("auth.toUp") : t("auth.toIn")}
        </button>
          </>
        )}
      </div>
    </div>
  );
}
