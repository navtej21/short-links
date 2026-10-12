import { createUserClient } from "@/lib/supabase/user";
import { CopyButton } from "./copy-button";
import Link from "next/link";

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
    .select("id, code, target_url, created_at")
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
        return (
          <li key={link.id} className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{shortUrl}</p>
              <p
                className="truncate text-sm text-gray-600"
                title={link.target_url}
              >
                {link.target_url}
              </p>
              <p className="text-xs text-gray-500">
                {dateFormat.format(new Date(link.created_at))}
              </p>

              <Link
                href={`/dashboard/links/${link.id}`}
                className="text-sm underline"
              >
                Stats
              </Link>
            </div>
            <CopyButton text={shortUrl} />
          </li>
        );
      })}
    </ul>
  );
}
