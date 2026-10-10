import {createServerClient} from "@supabase/ssr";
import {cookies} from "next/headers";
import { connection } from "next/server";


// USER client: uses the PUBLISHABLE key plus the visitor's session cookies,
// so Row Level Security applies as that user. Call it once per request;
// never store it in a module-level constant.

export async function createUserClient() {


    await connection();
    
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component, where cookies can't be written.
          // Safe to ignore once a proxy/middleware refreshes the session
          // (Task 2.2).
        }
      },
    },
  });
}