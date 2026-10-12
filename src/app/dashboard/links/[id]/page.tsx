import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createUserClient } from "@/lib/supabase/user";
import { getLinkStats } from "@/lib/stats";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAYS = 30;

export default function LinkStatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <Link href="/dashboard" className="text-sm underline">
        ← Back to dashboard
      </Link>
      <Suspense fallback={<p>Loading stats…</p>}>
        <StatsContent params={params} />
      </Suspense>
    </main>
  );
}

async function StatsContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS only lets you read your own links, so someone else's id returns null.
  const { data: link, error } = await supabase
    .from("links")
    .select("id, code, target_url")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load link: ${error.message}`);
  if (!link) notFound();

  const stats = await getLinkStats(supabase, link.id, DAYS);
  const maxDay = Math.max(1, ...stats.byDay.map((d) => d.clicks));

  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold">/{link.code}</h1>
        <p className="break-all text-sm text-gray-500">{link.target_url}</p>
      </header>

      <section>
        <p className="text-4xl font-bold">{stats.total}</p>
        <p className="text-sm text-gray-500">human clicks in the last {DAYS} days</p>
      </section>

      <section>
        <h2 className="mb-2 font-medium">Clicks per day</h2>
        <div className="flex h-32 items-end gap-1">
          {stats.byDay.map((d) => (
            <div
              key={d.day}
              title={`${d.day}: ${d.clicks}`}
              className="flex-1 rounded-t bg-blue-500"
              style={{ height: `${(d.clicks / maxDay) * 100}%`, minHeight: d.clicks ? 4 : 1 }}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="mb-2 font-medium">Top referrers</h2>
          <ul className="space-y-1 text-sm">
            {stats.topReferrers.length === 0 && <li className="text-gray-500">No clicks yet</li>}
            {stats.topReferrers.map((r) => (
              <li key={r.referrer} className="flex justify-between">
                <span className="truncate">{r.referrer}</span>
                <span>{r.clicks}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-2 font-medium">Top countries</h2>
          <ul className="space-y-1 text-sm">
            {stats.topCountries.length === 0 && <li className="text-gray-500">No clicks yet</li>}
            {stats.topCountries.map((c) => (
              <li key={c.country} className="flex justify-between">
                <span>{c.country}</span>
                <span>{c.clicks}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}