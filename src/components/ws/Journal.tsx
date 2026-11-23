import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { matchStats } from "@/lib/ftc";
import { MemberAvatar, SectionTitle, type WsProps } from "./shared";
import { useI18n, type TFn } from "@/lib/i18n";

// YYYY-MM-DD in the user's local time zone (toISOString() would give the UTC date).
function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function removeRow(t: TFn, table: "journal_entries" | "matches", id: string, label: string, onDone: () => void) {
  if (!window.confirm(t("common.deleteConfirm", { name: label }))) return;
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) toast.error(error.message);
  else onDone();
}

export function Journal({ wsId, userId, data }: WsProps) {
  const { t, locale } = useI18n();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [date, setDate] = useState(localToday);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const { error } = await supabase.from("journal_entries").insert({ workspace_id: wsId, title, content, entry_date: date });
    if (error) { toast.error(error.message); return; }
    setTitle(""); setContent(""); data.refresh("journal");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div>
        <SectionTitle title={t("jr.title")} sub={t("jr.sub")} />
        <form onSubmit={add} className="glass space-y-3 p-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input placeholder={t("jr.whatPh")} value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input type="date" className="sm:w-44" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <Textarea rows={4} placeholder={t("jr.contentPh")} value={content} onChange={(e) => setContent(e.target.value)} />
          <div className="flex justify-end"><Button variant="hero" type="submit">{t("jr.log")}</Button></div>
        </form>
        <div className="mt-4 space-y-3">
          {data.journal.length === 0 && <p className="glass py-10 text-center text-sm text-muted-foreground">{t("jr.empty")}</p>}
          {data.journal.map((j) => {
            const a = data.members.find((m) => m.id === j.author_id);
            return (
              <article key={j.id} className="glass p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <MemberAvatar p={a} />
                    <div>
                      <h3 className="font-semibold">{j.title}</h3>
                      <p className="text-xs text-muted-foreground">{a?.full_name ?? t("common.unknown")}<span className="ml-2 tabular-nums">{new Date(j.entry_date + "T00:00:00Z").toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</span></p>
                    </div>
                  </div>
                  {j.author_id === userId && (
                    <Button size="icon" variant="ghost" aria-label={t("jr.deleteEntry")} onClick={() => removeRow(t, "journal_entries", j.id, j.title, () => data.refresh("journal"))}><Trash2 /></Button>
                  )}
                </div>
                {j.content && <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{j.content}</p>}
              </article>
            );
          })}
        </div>
      </div>
      <MatchScorer wsId={wsId} userId={userId} data={data} />
    </div>
  );
}

function MatchScorer({ wsId, data }: WsProps) {
  const { t } = useI18n();
  const [label, setLabel] = useState("");
  const [s, setS] = useState({ auto: 0, teleop: 0, endgame: 0 });
  const total = s.auto + s.teleop + s.endgame;
  const stats = matchStats(data.matches);

  async function save() {
    const { error } = await supabase.from("matches").insert({
      workspace_id: wsId, label: label || t("ms.practice", { n: data.matches.length + 1 }),
      auto_score: s.auto, teleop_score: s.teleop, endgame_score: s.endgame,
    });
    if (error) { toast.error(error.message); return; }
    setLabel(""); setS({ auto: 0, teleop: 0, endgame: 0 }); data.refresh("matches");
  }

  return (
    <div>
      <SectionTitle title={t("ms.title")} sub={t("ms.sub")} />
      <div className="glass space-y-4 p-5">
        <Input placeholder={t("ms.labelPh")} value={label} onChange={(e) => setLabel(e.target.value)} />
        {(["auto", "teleop", "endgame"] as const).map((k) => (
          <div key={k} className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">{t(`ms.${k}`)}</span>
            <Input type="number" inputMode="numeric" min={0} className="w-28 text-right tabular-nums" value={s[k]} onFocus={(e) => e.target.select()}
              onChange={(e) => setS({ ...s, [k]: Math.max(0, Number(e.target.value) || 0) })} />
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-sm text-muted-foreground">{t("ms.total")}</span>
          <span className="text-3xl font-bold text-primary tabular-nums">{total}</span>
        </div>
        <Button variant="hero" className="w-full" onClick={save}>{t("ms.save")}</Button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="glass p-4"><p className="text-xs text-muted-foreground font-medium">{t("ms.high")}</p><p className="text-2xl font-bold tabular-nums">{stats.high}</p></div>
        <div className="glass p-4"><p className="text-xs text-muted-foreground font-medium">{t("ms.avg")}</p><p className="text-2xl font-bold tabular-nums">{stats.average}</p></div>
      </div>
      <div className="glass mt-4 divide-y divide-border">
        {data.matches.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted-foreground">{t("ms.empty")}</p>}
        {[...data.matches].reverse().map((m) => (
          <div key={m.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <span>{m.label}</span>
            <span className="flex items-center gap-1 text-muted-foreground tabular-nums">
              {m.auto_score}/{m.teleop_score}/{m.endgame_score} <b className="ml-1 text-foreground">{m.auto_score + m.teleop_score + m.endgame_score}</b>
              <Button size="icon" variant="ghost" className="size-7" aria-label={t("ms.deleteMatch")}
                onClick={() => removeRow(t, "matches", m.id, m.label, () => data.refresh("matches"))}><Trash2 className="size-3.5" /></Button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
