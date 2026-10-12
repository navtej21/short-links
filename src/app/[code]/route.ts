import { extractClickInfo } from "@/lib/click-info";
import { supabase as admin } from "@/lib/supabase/admin";
import { logClick } from "@/lib/log-click";
import { resolveLink } from "@/lib/resolve-link";
import { after, NextRequest, NextResponse } from "next/server";


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  // Admin client: the visitor is anonymous, and RLS gives anonymous users
  // no access to `links`. This route only ever reads one row by exact code.
  const result = await resolveLink(admin, code);
  console.log("resolve:", JSON.stringify(code), result);

  switch (result.status) {
    case "not_found":
      return new NextResponse("Link not found", { status: 404 });
    case "inactive":
    case "expired":
      return new NextResponse("This link is no longer available", { status: 410 });
    case "ok": {
      const info = extractClickInfo(request.headers);
      // Runs after the redirect is sent, so logging never slows it down.
      after(() => logClick(admin, result.linkId, info));
      // 307 is not cached by browsers, so every click reaches the server.
      return NextResponse.redirect(result.url, 307);
    }
  }
}