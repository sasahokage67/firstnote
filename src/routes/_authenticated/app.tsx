import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Check, LogOut, Plus, LayoutDashboard, Trophy, KanbanSquare, BookOpen, FileText, Users, UserCog, MessagesSquare } from "lucide-react";
import { Logo } from "@/components/Logo";
import { TeamRoleField } from "@/components/TeamRoleField";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useMyProfile, useMyWorkspaces, useWorkspaceData, type Profile } from "@/hooks/use-workspace-data";
import { cn } from "@/lib/utils";
import { LanguageSwitcher, tryT, useI18n } from "@/lib/i18n";
import { Field, MemberAvatar } from "@/components/ws/shared";
import { Overview } from "@/components/ws/Overview";
import { Awards } from "@/components/ws/Awards";
import { Board } from "@/components/ws/Board";
import { Journal } from "@/components/ws/Journal";
import { Portfolio } from "@/components/ws/Portfolio";
import { Roster } from "@/components/ws/Roster";
import { Forum } from "@/components/ws/Forum";
import { CountryField, DEFAULT_COUNTRY, saveHomeCountry, useHomeCountry, type HomeLocation } from "@/components/CountryField";


export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Workspace — firstnote" },
      { name: "description", content: "firstnote team workspace: awards, tasks, journal and portfolio." },
      { property: "og:title", content: "Workspace — firstnote" },
      { property: "og:description", content: "firstnote team workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AppPage,
});

const TABS = [
  { id: "overview", icon: LayoutDashboard },
  { id: "forum", icon: MessagesSquare },
  { id: "awards", icon: Trophy },
  { id: "board", icon: KanbanSquare },
  { id: "journal", icon: BookOpen },
  { id: "portfolio", icon: FileText },
  { id: "roster", icon: Users },
] as const;

function AppPage() {
  const { user } = Route.useRouteContext();
  const ws = useMyWorkspaces();
  const profile = useMyProfile(user.id);
  const [wsId, setWsId] = useState<string | null>(null);
  const [lastWs, setLastWs] = useState<string | null>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useI18n();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  useEffect(() => {
    if (!ws.data?.length) return;
    const saved = localStorage.getItem("firstnote-ws");
    setWsId((cur) => cur && ws.data!.some((w) => w.id === cur) ? cur : ws.data!.find((w) => w.id === saved)?.id ?? ws.data![0]!.id);
  }, [ws.data]);

  if (ws.isLoading) return <div className="grid min-h-screen place-items-center text-muted-foreground">{t("common.loading")}</div>;
  if (ws.isError)
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <p className="text-lg font-semibold">{t("app.loadError")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("app.checkConnection")}</p>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="hero" onClick={() => ws.refetch()}>{t("common.retry")}</Button>
            <Button variant="outline" onClick={signOut}>{t("common.signOut")}</Button>
          </div>
        </div>
      </div>
    );
  if (!ws.data?.length || !wsId)
    return (
      <Onboarding
        onSignOut={signOut}
        onCancel={ws.data?.length ? () => setWsId(lastWs ?? ws.data![0]!.id) : undefined}
        onDone={(id) => { localStorage.setItem("firstnote-ws", id); setLastWs(id); setWsId(id); ws.refetch(); }}
      />
    );
  // A just-created/joined workspace may not be in the list until the refetch lands.
  if (!ws.data.some((w) => w.id === wsId))
    return <div className="grid min-h-screen place-items-center text-muted-foreground">{t("common.loading")}</div>;

  return (
    <Workspace
      key={wsId}
      wsId={wsId}
      userId={user.id}
      profile={profile.data ?? null}
      workspaces={ws.data}
      onSwitch={(id) => { localStorage.setItem("firstnote-ws", id); setWsId(id); }}
      onNew={() => { setLastWs(wsId); setWsId(null); }}
      onSignOut={signOut}
    />
  );
}

function Workspace({ wsId, userId, profile, workspaces, onSwitch, onNew, onSignOut }: {
  wsId: string; userId: string; profile: Profile | null;
  workspaces: { id: string; name: string; invite_code: string }[];
  onSwitch: (id: string) => void; onNew: () => void; onSignOut: () => void;
}) {
  const data = useWorkspaceData(wsId);
  const { t } = useI18n();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("overview");
  const [editProfile, setEditProfile] = useState(false);
  const current = workspaces.find((w) => w.id === wsId)!;
  const props = { wsId, userId, data };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <button type="button" onClick={() => setTab("overview")} aria-label={t("app.goOverview")} className="shrink-0">
            <Logo className="h-7 sm:h-8" />
          </button>
          <div className="hidden w-56 sm:block">
            <Field value={wsId} onChange={(v) => (v === "__new" ? onNew() : onSwitch(v))}
              options={[...workspaces.map((w) => [w.id, w.name] as [string, string]), ["__new", t("app.createJoin")]]} />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3 hover:border-primary/50">
                  <MemberAvatar p={profile} />
                  <span className="hidden text-left leading-tight sm:block">
                    <span className="block text-sm font-medium">{profile?.full_name}</span>
                    <span className="block text-xs text-primary font-medium">{profile?.team_role ? tryT(t, "role", profile.team_role) : ""}</span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{current.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="sm:hidden">
                  {workspaces.map((w) => (
                    <DropdownMenuItem key={w.id} onClick={() => onSwitch(w.id)}>
                      <Check className={cn(w.id === wsId ? "opacity-100" : "opacity-0")} /> {w.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem onClick={onNew}><Plus /> {t("app.createJoinShort")}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                </div>
                <DropdownMenuItem onClick={() => setEditProfile(true)}><UserCog /> {t("profile.edit")}</DropdownMenuItem>
                <DropdownMenuItem onClick={onSignOut}><LogOut /> {t("common.signOut")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2">
          {TABS.map((x) => (
            <button key={x.id} onClick={() => setTab(x.id)}
              className={cn("flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition",
                tab === x.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}>
              <x.icon className="size-4" /> {t(`tab.${x.id}`)}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        {tab === "overview" && <Overview {...props} />}
        {tab === "forum" && <Forum userId={userId} me={profile} />}
        {tab === "awards" && <Awards {...props} />}
        {tab === "board" && <Board {...props} />}
        {tab === "journal" && <Journal {...props} />}
        {tab === "portfolio" && <Portfolio {...props} />}
        {tab === "roster" && <Roster {...props} inviteCode={current.invite_code} />}
      </main>
      {profile && <ProfileDialog open={editProfile} onOpenChange={setEditProfile} profile={profile} />}
    </div>
  );
}

function ProfileDialog({ open, onOpenChange, profile }: { open: boolean; onOpenChange: (o: boolean) => void; profile: Profile }) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const [name, setName] = useState(profile.full_name);
  const [role, setRole] = useState(profile.team_role);
  const [avatar, setAvatar] = useState(profile.avatar_url ?? "");
  const home = useHomeCountry();
  const [loc, setLoc] = useState<HomeLocation | null>(null);
  async function save() {
    if (!name.trim() || !role.trim()) { toast.error(t("profile.required")); return; }
    const { error } = await supabase.from("profiles").update({ full_name: name, team_role: role, avatar_url: avatar || null }).eq("id", profile.id);
    if (error) { toast.error(error.message); return; }
    if (loc && (loc.country !== home.country || loc.area !== home.area)) {
      const r = await saveHomeCountry(loc);
      if (r.error) { toast.error(r.error.message); return; }
    }
    qc.invalidateQueries();
    onOpenChange(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("profile.title")}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>{t("common.name")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <TeamRoleField value={role} onChange={setRole} />
          <CountryField value={loc ?? { country: home.country ?? DEFAULT_COUNTRY, area: home.area }} onChange={setLoc} />
          <div className="space-y-1.5"><Label>{t("profile.avatar")}</Label><Input value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://…" /></div>
          <Button variant="hero" className="w-full" onClick={save}>{t("common.save")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Onboarding({ onDone, onCancel, onSignOut }: {
  onDone: (id: string) => void; onCancel?: (() => void) | undefined; onSignOut: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  async function create() {
    if (!name.trim()) { toast.error(t("onb.needName")); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("create_workspace", { _name: name.trim() });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    onDone(data as string);
  }
  async function join() {
    if (!code.trim()) { toast.error(t("onb.needCode")); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("join_workspace", { _code: code.trim() });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    onDone(data as string);
  }
  return (
    <div className="relative grid min-h-screen place-items-center px-4 py-20">
      <div className="absolute inset-x-4 top-4 flex items-center justify-between sm:inset-x-6 sm:top-6">
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel}><ArrowLeft /> {t("onb.back")}</Button>
        ) : (
          <Logo className="h-8" />
        )}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Button variant="ghost" onClick={onSignOut}><LogOut /> {t("common.signOut")}</Button>
        </div>
      </div>
      <div className="w-full max-w-3xl">
        <h1 className="text-center text-4xl font-bold">{t("onb.title1")}<span className="text-gradient">{t("onb.title2")}</span></h1>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="glass space-y-4 p-6">
            <h2 className="text-lg font-semibold">{t("onb.create")}</h2>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("onb.teamPh")}
              onKeyDown={(e) => e.key === "Enter" && create()} />
            <Button variant="hero" className="w-full" onClick={create} disabled={busy}>{t("onb.createBtn")}</Button>
          </div>
          <div className="glass space-y-4 p-6">
            <h2 className="text-lg font-semibold">{t("onb.join")}</h2>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t("onb.codePh")} className="font-mono uppercase"
              onKeyDown={(e) => e.key === "Enter" && join()} />
            <Button variant="outline" className="w-full" onClick={join} disabled={busy}>{t("onb.joinBtn")}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
