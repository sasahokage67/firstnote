import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CATEGORIES, STATUSES } from "@/lib/ftc";
import { cn } from "@/lib/utils";
import { tryT, useI18n } from "@/lib/i18n";
import { Field, MemberAvatar, SectionTitle, TaskCard, TaskDialog, type WsProps } from "./shared";

export function Board({ wsId, data }: WsProps) {
  const { t } = useI18n();
  const [member, setMember] = useState("all");
  const [cat, setCat] = useState("all");
  const [over, setOver] = useState<string | null>(null);
  const tasks = data.tasks.filter(
    (x) => (member === "all" || x.assignee_id === member) && (cat === "all" || x.category === cat),
  );

  async function move(id: string, status: string) {
    if (!id || data.tasks.find((x) => x.id === id)?.status === status) return;
    const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else data.refresh("tasks");
  }

  return (
    <div>
      <SectionTitle title={t("bd.title")} sub={t("bd.sub")}
        action={
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-44"><Field value={member} onChange={setMember} options={[["all", t("bd.allMembers")], ...data.members.map((m) => [m.id, m.full_name] as [string, string])]} /></div>
            <div className="w-40"><Field value={cat} onChange={setCat} options={[["all", t("bd.allCats")], ...CATEGORIES.map((c) => [c, tryT(t, "cat", c)] as [string, string])]} /></div>
            <TaskDialog wsId={wsId} members={data.members} trigger={<Button variant="hero"><Plus /> {t("bd.task")}</Button>} />
          </div>
        } />
      <div className="mb-4 flex flex-wrap gap-1">
        {data.members.map((m) => (
          <button key={m.id} onClick={() => setMember(member === m.id ? "all" : m.id)}
            className={cn("rounded-full ring-2 transition", member === m.id ? "ring-primary" : "ring-transparent opacity-80 hover:opacity-100")}>
            <MemberAvatar p={m} className="size-8" />
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STATUSES.map((s) => {
          const col = tasks.filter((x) => x.status === s.id);
          return (
            <div key={s.id}
              onDragOver={(e) => { e.preventDefault(); setOver(s.id); }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => { setOver(null); move(e.dataTransfer.getData("text/plain"), s.id); }}
              className={cn("glass min-h-64 p-3 transition", over === s.id && "border-primary")}>
              <div className="mb-3 flex items-center justify-between px-1">
                <h3 className="font-semibold">{t(`status.${s.id}`)}</h3>
                <span className="font-mono text-xs text-muted-foreground">{col.length}</span>
              </div>
              <div className="space-y-2">
                {col.map((x) => (
                  <div key={x.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", x.id)}>
                    <TaskCard t={x} data={data} wsId={wsId} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
