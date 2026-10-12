import { createUserClient } from "@/lib/supabase/user";
import { CopyButton } from "./copy-button";
import Link from "next/link";
import { LinkActions } from "./link-actions";

const dateFormat = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

export async function LinksList() {
  const supabase = await createUserClient();

  // No .eq("user_id", ...) here on purpose: RLS only returns this
  // user's rows. That is what the two-account test below proves.
  const { data: links, error } = await supabase
    .from("links")
    // clicks(count) is an embedded aggregate; the .eq on "clicks.is_bot"
    // filters only the embedded rows, so bots are excluded from the count
    // like on the Stats page.
    .select("id, code, target_url, created_at, is_active, clicks(count)")
    .eq("clicks.is_bot", false)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("LinksList query failed:", error);
    return (
      <p role="alert" className="mt-2 text-sm text-red-700">
        Could not load your links. Please refresh.
      </p>
    );
  }

  if (!links || links.length === 0) {
    return (
      <p className="mt-2 text-sm text-gray-600">
        No links yet. Create your first one above.
      </p>
    );
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <ul className="mt-3 divide-y rounded border">
      {links.map((link) => {
        const shortUrl = `${base}/${link.code}`;
        const clickCount = Number(link.clicks?.[0]?.count ?? 0);
        return (
          <li key={link.id} className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {shortUrl}
                {!link.is_active && (
                  <span className="ml-2 rounded bg-gray-200 px-2 py-0.5 text-xs font-normal">
                    Inactive
                  </span>
                )}
              </p>
              <p
                className="truncate text-sm text-gray-600"
                title={link.target_url}
              >
                {link.target_url}
              </p>
              <p className="text-xs text-gray-500">
                {dateFormat.format(new Date(link.created_at))}
                {" · "}
                {clickCount} {clickCount === 1 ? "click" : "clicks"}
              </p>

              <Link
                href={`/dashboard/links/${link.id}`}
                className="text-sm underline"
              >
                Stats
              </Link>
            </div>
            <CopyButton text={shortUrl} />
            <LinkActions id={link.id} isActive={link.is_active} />
          </li>
        );
      })}
    </ul>
  );
}
