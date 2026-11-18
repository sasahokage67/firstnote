import { MemberAvatar, SectionTitle, type WsProps } from "./shared";
import { tryT, useI18n } from "@/lib/i18n";

export function Roster({ data, inviteCode }: WsProps & { inviteCode: string }) {
  const { t } = useI18n();
  return (
    <div>
      <SectionTitle title={t("rs.title")} sub={t("rs.sub")}
        action={<div className="glass px-4 py-2 text-sm">{t("rs.invite")} <span className="font-mono font-bold text-primary">{inviteCode}</span></div>} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data.members.map((m) => {
          const mine = data.tasks.filter((x) => x.assignee_id === m.id);
          const open = mine.filter((x) => x.status !== "done").length;
          const pages = data.pages.filter((p) => p.assignee_id === m.id).length;
          return (
            <div key={m.id} className="glass flex items-center gap-4 p-5">
              <MemberAvatar p={m} className="size-12" />
              <div className="flex-1">
                <p className="font-semibold">{m.full_name}</p>
                <p className="text-xs uppercase tracking-widest text-primary">{tryT(t, "role", m.team_role)}</p>
              </div>
              <div className="text-right font-mono text-xs text-muted-foreground">
                <p><b className="text-foreground">{open}</b> {t("rs.open")}</p>
                <p>{mine.length - open} {t("rs.done")}</p>
                <p>{pages} {t("rs.pages")}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
