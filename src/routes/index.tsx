import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, KanbanSquare, BookOpen } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "firstnote — FTC Team Workspace" },
      { name: "description", content: "Plan awards, tasks, matches and your 15-page portfolio together as an FTC team." },
      { property: "og:title", content: "firstnote — FTC Team Workspace" },
      { property: "og:description", content: "Plan awards, tasks, matches and your portfolio together." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const { t } = useI18n();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) navigate({ to: "/app", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);
  const features = [
    { icon: Trophy, t: t("landing.f1.t"), d: t("landing.f1.d") },
    { icon: KanbanSquare, t: t("landing.f2.t"), d: t("landing.f2.d") },
    { icon: BookOpen, t: t("landing.f3.t"), d: t("landing.f3.d") },
  ];
  return (
    <div className="min-h-screen px-6">
      <header className="mx-auto flex max-w-6xl items-center justify-between py-6">
        <Link to="/" aria-label="firstnote home"><Logo className="h-9" /></Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Button asChild variant="ghost"><Link to="/auth">{t("common.signIn")}</Link></Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl py-20">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">{t("landing.kicker")}</p>
        <h1 className="mt-4 max-w-3xl text-5xl font-bold leading-[1.05] md:text-7xl">
          {t("landing.title1")}<span className="text-gradient">FTC</span>{t("landing.title2")}
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          {t("landing.sub")}
        </p>
        <div className="mt-10 flex gap-3">
          <Button asChild variant="hero" size="lg"><Link to="/auth">{t("landing.enter")}</Link></Button>
        </div>
        <div className="mt-24 grid gap-4 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.t} className="glass p-6">
              <f.icon className="size-6 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">{f.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
