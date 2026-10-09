
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";

export async function GET() {
  // 1. Insert a row
  const { error: insertError } = await supabase
    .from("healthcheck")
    .insert({});

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  // 2. Read the latest row back
  const { data, error: readError } = await supabase
    .from("healthcheck")
    .select("*")
    .order("id", { ascending: false })
    .limit(1)
    .single();

  if (readError) {
    return NextResponse.json(
      { error: readError.message },
      { status: 500 }
    );
  }

  // 3. Return the row as JSON
  return NextResponse.json(data, { status: 200 });
}