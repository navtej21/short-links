export type TargetCheck =
  | { ok: true; url: string }
  | { ok: false; reason: string };

// Turns "https://short-links-x.vercel.app" into ["short-links-x.vercel.app"].
export function hostsFromAppUrl(appUrl: string | undefined): string[] {
  if (!appUrl) return [];
  try {
    return [new URL(appUrl).host];
  } catch {
    return [];
  }
}

export function checkTargetUrl(raw: string, blockedHosts: string[]): TargetCheck {
  const trimmed = raw.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: "Enter a valid URL" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "Only http and https links are allowed" };
  }

  const blocked = blockedHosts.map((h) => h.toLowerCase());
  if (blocked.includes(parsed.host.toLowerCase())) {
    return { ok: false, reason: "You can't shorten a link that points to this site" };
  }

  return { ok: true, url: trimmed };
}