import type { SupabaseClient } from "@supabase/supabase-js";

export type DayCount={day:string,clicks:number};
export type ReferrerCount = { referrer: string; clicks: number };
export type CountryCount = { country: string; clicks: number };


export type LinkStats = {
  total: number;
  byDay: DayCount[];
  topReferrers: ReferrerCount[];
  topCountries: CountryCount[];
};

export function fillMissingDays(
  rows: DayCount[],
  days: number,
  now: Date = new Date()
): DayCount[] {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD
  const counts = new Map(rows.map((r) => [r.day, Number(r.clicks)]));
  const result: DayCount[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = fmt.format(new Date(now.getTime() - i * 86_400_000));
    result.push({ day, clicks: counts.get(day) ?? 0 });
  }
  return result;
}


export async function getLinkStats(
  client: SupabaseClient,
  linkId: string,
  days = 30
): Promise<LinkStats> {
  const { data, error } = await client.rpc("link_click_stats", {
    p_link_id: linkId,
    p_days: days,
  });
  if (error) throw new Error(`Failed to load stats: ${error.message}`);

  return {
    total: Number(data?.total ?? 0),
    byDay: fillMissingDays(data?.by_day ?? [], days),
    topReferrers: data?.top_referrers ?? [],
    topCountries: data?.top_countries ?? [],
  };
}