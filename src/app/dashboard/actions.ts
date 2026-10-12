"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createUserClient } from "@/lib/supabase/user";
import {
  createLink,
  deleteLink,
  InvalidUrlError,
  LinkNotFoundError,
  RateLimitError,
  setLinkActive,
} from "@/lib/links";
import { checkTargetUrl, hostsFromAppUrl } from "@/lib/target-url";

export type CreateLinkState = {
  error?: string;
  shortUrl?: string;
};

export async function createLinkAction(
  _prevState: CreateLinkState,
  formData: FormData,
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

  // Reject our own host before anything is stored.
  const check = checkTargetUrl(
    targetUrl,
    hostsFromAppUrl(process.env.NEXT_PUBLIC_APP_URL),
  );
  if (!check.ok) return { error: check.reason };

  try {
    const link = await createLink(supabase, { targetUrl: check.url, userId: user.id });
    revalidatePath("/dashboard");

    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return { shortUrl: `${base}/${link.code}` };
  } catch (err) {
    // User-fixable problem: show the message.
    if (err instanceof InvalidUrlError || err instanceof RateLimitError)
      return { error: err.message };

    // Anything else: log details for us, show a generic message to the user.
    console.error("createLinkAction failed:", err);
    return { error: "Something went wrong. Please try again." };
  }
}

export type LinkActionState = { error?: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Shared by the link actions: server actions are public POST endpoints,
// so each one re-checks auth and the id instead of trusting the form.
async function authedLinkId(formData: FormData) {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  return { supabase, user, id: UUID_RE.test(id) ? id : null };
}

async function runLinkAction(
  fn: () => Promise<void>,
  failureLog: string,
): Promise<LinkActionState> {
  try {
    await fn();
    revalidatePath("/dashboard");
    return {};
  } catch (err) {
    if (err instanceof LinkNotFoundError) return { error: err.message };
    console.error(failureLog, err);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function setLinkActiveAction(
  _prev: LinkActionState,
  formData: FormData,
): Promise<LinkActionState> {
  const { supabase, user, id } = await authedLinkId(formData);
  if (!id) return { error: "Link not found." };
  const isActive = formData.get("active") === "true";

  return runLinkAction(
    () => setLinkActive(supabase, { id, userId: user.id, isActive }),
    "setLinkActiveAction failed:",
  );
}

export async function deleteLinkAction(
  _prev: LinkActionState,
  formData: FormData,
): Promise<LinkActionState> {
  const { supabase, user, id } = await authedLinkId(formData);
  if (!id) return { error: "Link not found." };

  return runLinkAction(
    () => deleteLink(supabase, { id, userId: user.id }),
    "deleteLinkAction failed:",
  );
}
