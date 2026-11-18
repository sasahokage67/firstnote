import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { TeamRoleField } from "@/components/TeamRoleField";
import { CountryField, DEFAULT_COUNTRY } from "@/components/CountryField";
import type { CountryCode } from "@/lib/events";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [mode, setMode] = useState<"in" | "up" | "forgot" | "reset">("in");
  const [password2, setPassword2] = useState("");
  // true while the user is setting a new password from a recovery link (don't auto-redirect to /app)
  const recovering = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("Member");
  const [country, setCountry] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const isRecovery = new URLSearchParams(window.location.search).get("reset") === "1" || hash.get("type") === "recovery";
    if (hash.get("error_code") || hash.get("error")) {
      toast.error("This reset link is invalid or has expired. Request a new one.");
      setMode("forgot");
    } else if (isRecovery) {
      recovering.current = true;
      setMode("reset");
    }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && !recovering.current) navigate({ to: "/app", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") {
        recovering.current = true;
        setMode("reset");
        return;
      }
      if (s && !recovering.current) navigate({ to: "/app", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + "/auth?reset=1",
    });
    setBusy(false);
    if (error) {
      if (/rate limit|too many|429/i.test(error.message)) toast.error("Too many requests. Please wait a bit and try again.");
      else toast.error(error.message);
      return;
    }
    // Same message whether or not the account exists (doesn't reveal registered emails)
    toast.success("If an account with this email exists, we've sent a password reset link. Check your inbox and spam.");
    setMode("in");
  }

  async function setNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters."); return; }
    if (password !== password2) { toast.error("Passwords don't match."); return; }
    setBusy(true);
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) {
      setBusy(false);
      toast.error("This reset link is invalid or has expired. Request a new one.");
      setMode("forgot");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated.");
    recovering.current = false;
    window.history.replaceState(null, "", "/auth");
    navigate({ to: "/app", replace: true });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/app", data: { full_name: name, team_role: role, country } },
        });
        if (error) throw error;
        if (!data.session) toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      const msg = (err as Error).message;
      if (/invalid login credentials/i.test(msg)) toast.error("Неверный email или пароль. Если вы только зарегистрировались — сначала подтвердите почту по ссылке из письма.");
      else if (/not confirmed/i.test(msg)) toast.error("Почта не подтверждена. Откройте письмо и нажмите ссылку.");
      else if (/already registered/i.test(msg)) toast.error("Этот email уже зарегистрирован — войдите.");
      else toast.error(msg || "Сервер временно недоступен, попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error(r.error.message ?? "Google sign-in failed");
  }

  return (
    <div className="relative grid min-h-screen place-items-center px-4 py-16">
      <Link to="/" className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground sm:left-6 sm:top-6">
        <ArrowLeft className="size-4" /> Back to home
      </Link>
      <div className="glass w-full max-w-md p-8">
        <Link to="/" aria-label="firstnote home" className="inline-block"><Logo className="h-10" /></Link>
        <h1 className="mt-6 text-2xl font-semibold">
          {mode === "in" ? "Welcome back" : mode === "up" ? "Join the team" : mode === "forgot" ? "Reset password" : "Set a new password"}
        </h1>
        {mode === "forgot" && (
          <form onSubmit={sendReset} className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">Enter your account email and we'll send you a link to reset your password.</p>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
            <Button type="submit" variant="hero" className="w-full" disabled={busy}>Send reset link</Button>
            <button type="button" className="w-full text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode("in")}>Back to sign in</button>
          </form>
        )}
        {mode === "reset" && (
          <form onSubmit={setNewPassword} className="mt-6 space-y-4">
            <div className="space-y-1.5"><Label>New password</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></div>
            <div className="space-y-1.5"><Label>Repeat new password</Label><Input type="password" required minLength={6} value={password2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" /></div>
            <Button type="submit" variant="hero" className="w-full" disabled={busy}>Save password</Button>
          </form>
        )}
        {(mode === "in" || mode === "up") && (<>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "up" && (
            <>
              <div className="space-y-1.5"><Label>Name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
              <TeamRoleField value={role} onChange={setRole} />
              <CountryField value={country} onChange={setCountry} />
            </>
          )}
          <div className="space-y-1.5"><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Password</Label>
              {mode === "in" && (
                <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => { setMode("forgot"); setPassword(""); }}>
                  Forgot password?
                </button>
              )}
            </div>
            <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" variant="hero" className="w-full" disabled={busy}>{mode === "in" ? "Sign in" : "Create account"}</Button>
        </form>
        {GOOGLE_ENABLED && <Button variant="outline" className="mt-3 w-full" onClick={google}>Continue with Google</Button>}
        <button className="mt-6 w-full text-sm text-muted-foreground hover:text-foreground" type="button" onClick={() => { setMode(mode === "in" ? "up" : "in"); setPassword(""); }}>
          {mode === "in" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
        </>)}
      </div>
    </div>
  );
}
