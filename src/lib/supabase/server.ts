import "server-only";
import { createClient } from "@supabase/supabase-js";

// TODO: one-line comment: which key does this client use, and why?

// 1. Read the env vars
const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const key = process.env.SUPABASE_SECRET_KEY as string;

// 2. TODO: if either is missing, throw new Error("...") naming the missing var.
//    After this check, TypeScript should know both are `string`, not `string | undefined`.

// 3. Create and export the client
export const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});