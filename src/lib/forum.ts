import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Profile } from "@/hooks/use-workspace-data";
import { COUNTRIES, type CountryCode } from "./events";

export const POST_MAX = 280;

type Row = Database["public"]["Tables"]["forum_posts"]["Row"];
export type ForumPost = Row & { co: CountryCode | null };
export type Feed = {
  posts: ForumPost[];
  replies: Map<string, ForumPost[]>;
  likes: Map<string, string[]>; // post id → user ids
  people: Map<string, Profile>;
};

const asCountry = (c: string | null) => (COUNTRIES.some((x) => x.code === c) ? (c as CountryCode) : null);

/** Latest top-level posts with their replies, likes and authors. */
export async function loadFeed(): Promise<Feed> {
  const { data: top, error } = await supabase
    .from("forum_posts")
    .select("*")
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;

  const ids = top.map((p) => p.id);
  const [rep, lik] = ids.length
    ? await Promise.all([
        supabase.from("forum_posts").select("*").in("parent_id", ids).order("created_at"),
        supabase.from("forum_likes").select("post_id, user_id").in("post_id", ids),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (rep.error) throw rep.error;
  if (lik.error) throw lik.error;

  const replies = new Map<string, ForumPost[]>();
  for (const r of rep.data ?? []) {
    const list = replies.get(r.parent_id!) ?? [];
    list.push({ ...r, co: asCountry(r.country) });
    replies.set(r.parent_id!, list);
  }
  const likes = new Map<string, string[]>();
  for (const l of lik.data ?? []) likes.set(l.post_id, [...(likes.get(l.post_id) ?? []), l.user_id]);

  const authors = [...new Set([...top, ...(rep.data ?? [])].map((p) => p.author_id))];
  const people = new Map<string, Profile>();
  if (authors.length) {
    const { data: prof } = await supabase.from("profiles").select("*").in("id", authors);
    for (const p of prof ?? []) people.set(p.id, p);
  }
  return { posts: top.map((p) => ({ ...p, co: asCountry(p.country) })), replies, likes, people };
}
