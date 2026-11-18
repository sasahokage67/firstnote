import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { PAGE_STATUSES } from "@/lib/ftc";
import { Field, SectionTitle, StatusPill, type WsProps } from "./shared";
import { useI18n } from "@/lib/i18n";

const NONE = "__none";

export function Portfolio({ data }: WsProps) {
  const { t } = useI18n();
  const ready = data.pages.filter((p) => p.status === "ready").length;
  const total = data.pages.length || 15;

  async function update(id: string, patch: { title?: string; status?: string; assignee_id?: string | null }) {
    const { error } = await supabase.from("portfolio_pages").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else data.refresh("pages");
  }

  return (
    <div>
      <SectionTitle title={t("pf.title")} sub={t("pf.sub")} />
      <div className="glass mb-4 p-5">
        <div className="flex justify-between text-sm"><span>{t("pf.ready", { ready, total })}</span><span className="font-mono">{Math.round((ready / total) * 100)}%</span></div>
        <Progress value={(ready / total) * 100} className="mt-2 h-2" />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data.pages.map((p) => (
          <div key={p.id} className="glass space-y-3 p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-primary">{t("pf.page")} {String(p.page_number).padStart(2, "0")}</span>
              <StatusPill status={p.status} label={PAGE_STATUSES.some((s) => s.id === p.status) ? t(`page.${p.status as (typeof PAGE_STATUSES)[number]["id"]}`) : ""} />
            </div>
            <Input defaultValue={p.title} key={p.title} className="font-semibold"
              onBlur={(e) => e.target.value !== p.title && update(p.id, { title: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Field value={p.status} onChange={(v) => update(p.id, { status: v })} options={PAGE_STATUSES.map((s) => [s.id, t(`page.${s.id}`)])} />
              <Field value={p.assignee_id ?? NONE} onChange={(v) => update(p.id, { assignee_id: v === NONE ? null : v })}
                options={[[NONE, t("common.unassigned")], ...data.members.map((m) => [m.id, m.full_name] as [string, string])]} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
