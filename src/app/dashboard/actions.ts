"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createUserClient } from "@/lib/supabase/user";
import { createLink, InvalidUrlError } from "@/lib/links";

export type CreateLinkState = {
  error?: string;
  shortUrl?: string;
};

export async function createLinkAction(
  _prevState: CreateLinkState,
  formData: FormData
): Promise<CreateLinkState> {
  const supabase = await createUserClient();

  // Server actions are public POST endpoints, so check auth again here
  // even though the proxy already guards /dashboard.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const targetUrl = String(formData.get("url") ?? "").trim();
  if (!targetUrl) return { error: "Please enter a URL." };

  try {
    const link = await createLink(supabase, { targetUrl, userId: user.id });
    revalidatePath("/dashboard");

    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return { shortUrl: `${base}/${link.code}` };
  } catch (err) {
    // User-fixable problem: show the message.
    if (err instanceof InvalidUrlError) return { error: err.message };

    // Anything else: log details for us, show a generic message to the user.
    console.error("createLinkAction failed:", err);
    return { error: "Something went wrong. Please try again." };
  }
}