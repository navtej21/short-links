import type { SupabaseClient } from "@supabase/supabase-js";
import { generateShortCode } from "./generate-code";


export type Link = {
  id: string;
  code: string;
  target_url: string;
  user_id: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
};

export type CreateLinkInput = {
  targetUrl: string;
  userId: string;
};

// Safe to show to the end user, unlike database errors.
export class InvalidUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidUrlError";
  }
}

// Safe to show to the end user.
export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

export const MAX_LINKS_PER_HOUR = 20;
const WINDOW_MS = 60 * 60 * 1000;

const MAX_ATTEMPTS = 5;
const UNIQUE_VIOLATION = "23505"; // Postgres unique_violation

function parseHttpUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new InvalidUrlError("Please enter a valid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new InvalidUrlError("URL must start with http:// or https://");
  }
  return url.toString();
}

async function assertUnderRateLimit(
  client: SupabaseClient,
  userId: string,
  now: Date,
): Promise<void> {
  const since = new Date(now.getTime() - WINDOW_MS).toISOString();
  const { count, error } = await client
    .from("links")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);

  if (error) throw new Error(`Failed to check rate limit: ${error.message}`);

  if ((count ?? 0) >= MAX_LINKS_PER_HOUR) {
    throw new RateLimitError(
      `You can create at most ${MAX_LINKS_PER_HOUR} links per hour. Please try again later.`,
    );
  }
}

// The caller passes the client. With the user client, RLS guarantees
// the link is owned by the logged-in user even if this code has a bug.
export async function createLink(
  client: SupabaseClient,
  { targetUrl, userId }: CreateLinkInput,
  now: Date = new Date(),
): Promise<Link> {
  const target_url = parseHttpUrl(targetUrl);
  await assertUnderRateLimit(client, userId, now);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { data, error } = await client
      .from("links")
      .insert({
        code: generateShortCode(),
        target_url,
        user_id: userId,
      })
      .select()
      .single();

    if (!error) return data as Link;

    // Only a code collision is worth retrying. Anything else is a real bug.
    if (error.code !== UNIQUE_VIOLATION) {
      throw new Error(`Failed to create link: ${error.message}`);
    }
  }

  throw new Error(
    `Could not generate a unique code after ${MAX_ATTEMPTS} attempts`
  );
}


export class LinkNotFoundError extends Error {
  constructor() {
    super("Link not found.");
    this.name = "LinkNotFoundError";
  }
}

// Filters by user_id as well as id so a bug here can't touch another
// user's row even if RLS were misconfigured. Zero affected rows means
// the link doesn't exist or isn't theirs.
export async function setLinkActive(
  client: SupabaseClient,
  { id, userId, isActive }: { id: string; userId: string; isActive: boolean },
): Promise<void> {
  const { data, error } = await client
    .from("links")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");

  if (error) throw new Error(`Failed to update link: ${error.message}`);
  if (!data || data.length === 0) throw new LinkNotFoundError();
}

export async function deleteLink(
  client: SupabaseClient,
  { id, userId }: { id: string; userId: string },
): Promise<void> {
  const { data, error } = await client
    .from("links")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");

  if (error) throw new Error(`Failed to delete link: ${error.message}`);
  if (!data || data.length === 0) throw new LinkNotFoundError();
}
