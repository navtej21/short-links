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

// The caller passes the client. With the user client, RLS guarantees
// the link is owned by the logged-in user even if this code has a bug.
export async function createLink(
  client: SupabaseClient,
  { targetUrl, userId }: CreateLinkInput
): Promise<Link> {
  const target_url = parseHttpUrl(targetUrl);

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

