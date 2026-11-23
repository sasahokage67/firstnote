import { supabase } from "@/integrations/supabase/client";
import type { CountryCode } from "./events";

/**
 * The forum lives in one shared workspace that every user joins on first visit.
 * Posts, replies and likes are rows of `journal_entries` in that workspace; the row's
 * `title` holds a small JSON tag saying which kind of row it is.
 */
export const FORUM_CODE: string = import.meta.env["VITE_FORUM_CODE"] ?? "FORUM_CODE_PENDING";
export const POST_MAX = 280;

export type ForumMeta =
  | { k: "post"; co?: CountryCode | null }
  | { k: "reply"; p: string }
  | { k: "like"; p: string };

export function parseMeta(title: string): ForumMeta | null {
  if (!title.startsWith("{")) return null;
  try {
    const m = JSON.parse(title) as ForumMeta;
    return m && typeof m === "object" && "k" in m ? m : null;
  } catch {
    return null;
  }
}

let forumId: Promise<string> | null = null;

/** The forum workspace id, joining it first if this user is not a member yet. */
export function ensureForum(): Promise<string> {
  forumId ??= (async () => {
    const { data } = await supabase.from("workspaces").select("id").eq("invite_code", FORUM_CODE).maybeSingle();
    if (data) return data.id;
    const { data: id, error } = await supabase.rpc("join_workspace", { _code: FORUM_CODE });
    if (error || !id) throw error ?? new Error("Forum is not available");
    return id;
  })();
  forumId.catch(() => { forumId = null; });
  return forumId;
}
