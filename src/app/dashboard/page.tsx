import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createUserClient } from "@/lib/supabase/user";
import { logout } from "../login/action";
import { CreateLinkForm } from "./create-link-form";
import { LinksList } from "./links-link";

export async function UserPanel() {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <>
      <p className="mt-2">Signed in as {user.email}</p>
      <form action={logout} className="mt-6">
        <button className="rounded border px-3 py-2">Log out</button>
      </form>

      <CreateLinkForm />

      <h2 className="mt-10 text-lg font-semibold">Your links</h2>
      <Suspense fallback={<p className="mt-2 text-sm">Loading links...</p>}>
        <LinksList />
      </Suspense>
    </>
  );
}

export default function DashboardPage() {
  return (
    <main className="mx-auto mt-12 max-w-2xl p-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <Suspense fallback={<p className="mt-2">Loading...</p>}>
        <UserPanel />
      </Suspense>
    </main>
  );
}
