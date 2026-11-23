import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Profile } from "@/hooks/use-workspace-data";
import { COUNTRIES, type CountryCode } from "./events";

export const POST_MAX = 280;
export const MAX_FILES = 4;
const MB = 1024 * 1024;
/** Per-file size limits (after image compression). */
export const LIMITS = { image: 8 * MB, video: 25 * MB, file: 10 * MB } as const;
export const ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.pdf,.txt,.zip,.doc,.docx,.ppt,.pptx,.xls,.xlsx";

export type Attachment = { path: string; name: string; type: string; size: number; w?: number; h?: number };
export type AttachKind = "image" | "video" | "file";
export const kindOf = (type: string): AttachKind =>
  type.startsWith("image/") ? "image" : type.startsWith("video/") ? "video" : "file";

export function fileUrl(path: string) {
  return supabase.storage.from("forum").getPublicUrl(path).data.publicUrl;
}

export function formatSize(bytes: number) {
  return bytes < MB ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / MB).toFixed(1)} MB`;
}

/** Photos are shrunk to 2000px WebP before upload so they load fast and save space. GIFs are kept as is. */
async function shrinkImage(file: File): Promise<{ blob: Blob; type: string; name: string; w: number; h: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale);
  if (file.type === "image/gif" || (scale === 1 && file.size < 1.5 * MB)) {
    bitmap.close();
    return { blob: file, type: file.type, name: file.name, w, h };
  }
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.85));
  if (!blob || blob.size >= file.size) return { blob: file, type: file.type, name: file.name, w, h };
  return { blob, type: "image/webp", name: file.name.replace(/\.[^.]+$/, "") + ".webp", w, h };
}

/** Checks the size limit; returns an error key or null. */
export function checkFile(file: File): "fr.tooBig" | "fr.badType" | null {
  if (!ACCEPT.split(",").some((a) => (a.startsWith(".") ? file.name.toLowerCase().endsWith(a) : a === file.type))) return "fr.badType";
  const kind = kindOf(file.type);
  // Images are compressed first, so only reject truly huge originals.
  if (kind === "image" ? file.size > 30 * MB : file.size > LIMITS[kind]) return "fr.tooBig";
  return null;
}

export async function uploadAttachment(file: File, userId: string): Promise<Attachment> {
  let blob: Blob = file, type = file.type || "application/octet-stream", name = file.name, w: number | undefined, h: number | undefined;
  if (kindOf(type) === "image") ({ blob, type, name, w, h } = await shrinkImage(file));
  if (blob.size > LIMITS[kindOf(type)]) throw new Error("fr.tooBig");
  const safe = name.normalize("NFKD").replace(/[^\w.-]+/g, "_").slice(-80) || "file";
  const path = `${userId}/${crypto.randomUUID()}-${safe}`;
  const { error } = await supabase.storage.from("forum").upload(path, blob, { contentType: type, cacheControl: "31536000" });
  if (error) throw error;
  return { path, name, type, size: blob.size, ...(w ? { w, h } : {}) };
}

export async function removeAttachments(list: Attachment[]) {
  if (list.length) await supabase.storage.from("forum").remove(list.map((a) => a.path));
}

const asAttachments = (v: unknown): Attachment[] =>
  Array.isArray(v) ? (v as Attachment[]).filter((a) => a && typeof a.path === "string") : [];

type Row = Database["public"]["Tables"]["forum_posts"]["Row"];
export type ForumPost = Omit<Row, "attachments"> & { co: CountryCode | null; files: Attachment[] };
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
    list.push({ ...r, co: asCountry(r.country), files: asAttachments(r.attachments) });
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
  return { posts: top.map((p) => ({ ...p, co: asCountry(p.country), files: asAttachments(p.attachments) })), replies, likes, people };
}
