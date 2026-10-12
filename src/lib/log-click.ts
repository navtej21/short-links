import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClickInfo } from "./click-info";

// never store a broken short link

export async function logClick(
  client: SupabaseClient,
  linkId: string,
  info: ClickInfo,
): Promise<void> {
  try {
    const { error } = await client.from("clicks").insert({
      link_id: linkId,
      referrer: info.referrer,
      user_agent:info.userAgent,
      country: info.country,
      city: info.city,
      is_bot: info.isBot,
    });

    if (error) {
      throw new Error(`logClick failed: ${error.message}`);
    }
  } catch (err) {
    console.log("error", err);
  }
}
