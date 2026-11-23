import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Heart, MessageCircle, Trash2, Globe2, ArrowUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { Journal, Profile } from "@/hooks/use-workspace-data";
import { useHomeCountry } from "@/components/CountryField";
import { COUNTRIES, type CountryCode } from "@/lib/events";
import { POST_MAX, ensureForum, parseMeta } from "@/lib/forum";
import { useI18n, type TFn } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { MemberAvatar } from "./shared";

type Post = Journal & { co: CountryCode | null };
type Feed = {
  forumId: string;
  posts: Post[];
  replies: Map<string, Journal[]>;
  likes: Map<string, Journal[]>;
  people: Map<string, Profile>;
};

async function loadFeed(): Promise<Feed> {
  const forumId = await ensureForum();
  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("workspace_id", forumId)
    .order("created_at", { ascending: false })
    .limit(600);
  if (error) throw error;

  const posts: Post[] = [];
  const replies = new Map<string, Journal[]>();
  const likes = new Map<string, Journal[]>();
  for (const row of data) {
    const m = parseMeta(row.title);
    if (!m) continue;
    if (m.k === "post") posts.push({ ...row, co: m.co ?? null });
    else {
      const map = m.k === "reply" ? replies : likes;
      map.set(m.p, [...(map.get(m.p) ?? []), row]);
    }
  }
  for (const r of replies.values()) r.reverse(); // oldest reply first

  const ids = [...new Set(data.map((r) => r.author_id))];
  const people = new Map<string, Profile>();
  if (ids.length) {
    const { data: mem } = await supabase
      .from("workspace_members")
      .select("user_id, profiles(*)")
      .eq("workspace_id", forumId)
      .in("user_id", ids);
    for (const m of mem ?? []) if (m.profiles) people.set(m.user_id, m.profiles as Profile);
  }
  return { forumId, posts, replies, likes, people };
}

function ago(iso: string, locale: string, t: TFn) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return t("fr.now");
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "always", style: "narrow" });
  if (s < 3600) return rtf.format(-Math.round(s / 60), "minute");
  if (s < 86400) return rtf.format(-Math.round(s / 3600), "hour");
  if (s < 7 * 86400) return rtf.format(-Math.round(s / 86400), "day");
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" });
}

const flagOf = (co: CountryCode | null) => (co ? COUNTRIES.find((c) => c.code === co)?.flag ?? "" : "");

export function Forum({ userId, me }: { userId: string; me: Profile | null }) {
  const { t } = useI18n();
  const home = useHomeCountry();
  const qc = useQueryClient();
  const feed = useQuery({ queryKey: ["forum"], queryFn: loadFeed, refetchInterval: 20_000 });
  const [scope, setScope] = useState<"all" | "mine">("all");
  const refresh = () => qc.invalidateQueries({ queryKey: ["forum"] });

  const shown = useMemo(() => {
    const p = feed.data?.posts ?? [];
    return scope === "mine" && home.country ? p.filter((x) => x.co === home.country) : p;
  }, [feed.data, scope, home.country]);

  async function write(title: object, content: string) {
    const forumId = feed.data?.forumId ?? (await ensureForum());
    const { error } = await supabase.from("journal_entries").insert({ workspace_id: forumId, title: JSON.stringify(title), content });
    if (error) { toast.error(error.message); return false; }
    refresh();
    return true;
  }
  async function remove(id: string) {
    if (!window.confirm(t("fr.deleteConfirm"))) return;
    const { error } = await supabase.from("journal_entries").delete().eq("id", id);
    if (error) toast.error(error.message); else refresh();
  }
  async function toggleLike(postId: string) {
    const mine = feed.data?.likes.get(postId)?.find((l) => l.author_id === userId);
    if (mine) {
      const { error } = await supabase.from("journal_entries").delete().eq("id", mine.id);
      if (error) toast.error(error.message); else refresh();
    } else await write({ k: "like", p: postId }, "");
  }

  const myFlag = flagOf(home.country);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{t("fr.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("fr.sub")}</p>
        </div>
        {home.country && (
          <div className="flex rounded-full border border-border p-0.5 text-sm">
            {(["all", "mine"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setScope(s)}
                className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors",
                  scope === s ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}>
                {s === "all" ? <><Globe2 className="size-3.5" /> {t("fr.everyone")}</> : <>{myFlag} {t(`country.${home.country!}`)}</>}
              </button>
            ))}
          </div>
        )}
      </div>

      <Composer me={me} onPost={(text) => write({ k: "post", co: home.country }, text)} />

      <div className="mt-5 space-y-3">
        {feed.isLoading && [0, 1, 2].map((i) => <div key={i} className="glass h-28 animate-pulse" />)}
        {feed.isError && (
          <div className="glass py-10 text-center text-sm text-muted-foreground">
            <p>{t("fr.loadFail")}</p>
            <Button className="mt-3" variant="outline" size="sm" onClick={() => feed.refetch()}>{t("common.retry")}</Button>
          </div>
        )}
        {feed.data && shown.length === 0 && (
          <p className="glass py-12 text-center text-sm text-muted-foreground">{t("fr.empty")}</p>
        )}
        {feed.data && shown.map((p) => (
          <PostCard key={p.id} post={p} feed={feed.data} userId={userId} me={me}
            onLike={() => toggleLike(p.id)} onDelete={remove}
            onReply={(text) => write({ k: "reply", p: p.id }, text)} />
        ))}
      </div>
    </div>
  );
}

function Composer({ me, onPost, compact, placeholder }: {
  me: Profile | null; onPost: (text: string) => Promise<boolean>; compact?: boolean; placeholder?: string;
}) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const left = POST_MAX - text.length;
  const ok = text.trim().length > 0 && left >= 0 && !busy;

  async function submit() {
    if (!ok) return;
    setBusy(true);
    const done = await onPost(text.trim());
    setBusy(false);
    if (done) { setText(""); if (ref.current) ref.current.style.height = ""; }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }}
      className={cn("flex gap-3", compact ? "items-start" : "glass p-4")}>
      <MemberAvatar p={me} className={compact ? "size-7" : "size-10"} />
      <div className="min-w-0 flex-1">
        <textarea
          ref={ref}
          rows={compact ? 1 : 2}
          value={text}
          maxLength={POST_MAX + 40}
          placeholder={placeholder ?? t("fr.composePh")}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); } }}
          className={cn("w-full resize-none bg-transparent outline-none placeholder:text-muted-foreground/70",
            compact ? "py-1 text-sm" : "pt-2 text-base")}
        />
        <div className={cn("flex items-center justify-end gap-3", !compact && "mt-2 border-t border-border pt-3")}>
          {text.length > 0 && (
            <span className={cn("font-mono text-xs tabular-nums", left < 0 ? "text-destructive" : left <= 20 ? "text-amber-400" : "text-muted-foreground")}>
              {left}
            </span>
          )}
          {compact ? (
            <Button type="submit" size="icon" variant="hero" className="size-7 rounded-full" disabled={!ok} aria-label={t("fr.reply")}>
              <ArrowUp className="size-4" />
            </Button>
          ) : (
            <Button type="submit" variant="hero" size="sm" className="rounded-full px-5" disabled={!ok}>{t("fr.post")}</Button>
          )}
        </div>
      </div>
    </form>
  );
}

function PostCard({ post, feed, userId, me, onLike, onDelete, onReply }: {
  post: Post; feed: Feed; userId: string; me: Profile | null;
  onLike: () => void; onDelete: (id: string) => void; onReply: (text: string) => Promise<boolean>;
}) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const author = feed.people.get(post.author_id);
  const replies = feed.replies.get(post.id) ?? [];
  const likes = feed.likes.get(post.id) ?? [];
  const liked = likes.some((l) => l.author_id === userId);

  return (
    <article className="glass p-4 transition-colors hover:border-primary/30">
      <div className="flex gap-3">
        <MemberAvatar p={author} className="size-10" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5 text-sm">
            <span className="truncate font-semibold">{author?.full_name || t("common.unknown")}</span>
            {post.co && <span title={t(`country.${post.co}`)}>{flagOf(post.co)}</span>}
            {author?.team_role && <span className="hidden truncate text-muted-foreground sm:inline">· {author.team_role}</span>}
            <span className="shrink-0 text-muted-foreground">· {ago(post.created_at, locale, t)}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{post.content}</p>

          <div className="-ml-2 mt-2 flex items-center gap-1 text-muted-foreground">
            <button type="button" onClick={() => setOpen((o) => !o)}
              className={cn("flex items-center gap-1.5 rounded-full px-2 py-1 text-xs transition-colors hover:bg-primary/10 hover:text-primary", open && "text-primary")}>
              <MessageCircle className="size-4" /> {replies.length || ""}
              <span className="sr-only">{t("fr.reply")}</span>
            </button>
            <button type="button" onClick={onLike} aria-pressed={liked}
              className={cn("flex items-center gap-1.5 rounded-full px-2 py-1 text-xs transition-colors hover:bg-rose-500/10 hover:text-rose-400", liked && "text-rose-400")}>
              <Heart className={cn("size-4", liked && "fill-current")} /> {likes.length || ""}
              <span className="sr-only">{t("fr.like")}</span>
            </button>
            {post.author_id === userId && (
              <button type="button" onClick={() => onDelete(post.id)} aria-label={t("fr.delete")}
                className="ml-auto rounded-full p-1.5 opacity-60 transition hover:bg-destructive/10 hover:text-destructive hover:opacity-100">
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>

          {open && (
            <div className="mt-3 space-y-3 border-l-2 border-border pl-3">
              {replies.map((r) => {
                const a = feed.people.get(r.author_id);
                return (
                  <div key={r.id} className="group flex gap-2.5">
                    <MemberAvatar p={a} className="size-7" />
                    <div className="min-w-0 flex-1 text-sm">
                      <span className="font-semibold">{a?.full_name || t("common.unknown")}</span>
                      <span className="text-muted-foreground"> · {ago(r.created_at, locale, t)}</span>
                      <p className="whitespace-pre-wrap break-words">{r.content}</p>
                    </div>
                    {r.author_id === userId && (
                      <button type="button" onClick={() => onDelete(r.id)} aria-label={t("fr.delete")}
                        className="self-start rounded-full p-1 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive focus:opacity-100">
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
              <Composer compact me={me} onPost={onReply} placeholder={t("fr.replyPh")} />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
