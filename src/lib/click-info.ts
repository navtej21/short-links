export type ClickInfo={
    referrer:string|null,
    userAgent:string|null,
    country:string|null,
    city:string|null,
    isBot:boolean
};



// just to get the normal patterns of what and all can be a bot.
const BOT_PATTERN= /bot|crawler|spider|slurp|facebookexternalhit|preview|headless|curl|wget|python-requests|httpclient|monitor|uptime/i;


export function isBot(userAgent:string|null):boolean{
    if(!userAgent){
        return true;
    }
    return BOT_PATTERN.test(userAgent);
}

// keep only the origin
function referrerOrigin(raw: string | null): string | null {
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

// Vercel sends the city URL-encoded (e.g. "S%C3%A3o%20Paulo").
function decodeCity(raw: string | null): string | null {
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}


export function extractClickInfo(headers: Headers): ClickInfo {
  const userAgent = headers.get("user-agent");
  return {
    referrer: referrerOrigin(headers.get("referer")),
    userAgent: userAgent ? userAgent.slice(0, 500) : null,
    country: headers.get("x-vercel-ip-country"),
    city: decodeCity(headers.get("x-vercel-ip-city")),
    isBot: isBot(userAgent),
  };
}