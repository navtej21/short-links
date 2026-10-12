import type { SupabaseClient } from "@supabase/supabase-js";

export type ResolveResult =
  | { status: "ok"; linkId: string; url: string }
  | { status: "not_found" }
  | { status: "inactive" }
  | { status: "expired" };

const CODE_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;

export async function resolveLink(
  client: SupabaseClient,
  code: string,
  now: Date = new Date(),
): Promise<ResolveResult> {


  if (!CODE_PATTERN.test(code)) {
    return { status: "not_found" };
  }

  const { data, error } = await client
    .from("links")
    .select("id,target_url,is_active,expires_at")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve link:${error.message}`);
  }

  if (!data) {
    return { status: "not_found" };
  }

  if (!data.is_active) {
    return { status: "inactive" };
  }

  if (data.expires_at && new Date(data.expires_at) <= now) {
    return { status: "expired" };
  }

  return {status:"ok",linkId:data.id,url:data.target_url}
}
