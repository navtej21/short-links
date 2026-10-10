"use server";

import { redirect } from "next/navigation";
import { createUserClient } from "@/lib/supabase/user";

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  return { email, password };
}

function failWith(message: string): never {
  redirect(`/login?error=${encodeURIComponent(message)}`);
}

export async function login(formData: FormData) {
  const { email, password } = readCredentials(formData);
  const supabase = await createUserClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {failWith(error.message)};

  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const { email, password } = readCredentials(formData);
  const supabase = await createUserClient();

  const { data,error } = await supabase.auth.signUp({ email, password });

  console.log(data);

   if (!data.session) {
    failWith(
      "Could not create the account. If you already have one, use Log in."
    );
  }
  if (error) {failWith(error.message)};

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createUserClient();
  await supabase.auth.signOut();
  redirect("/login");
}