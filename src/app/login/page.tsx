import { Suspense } from "react";
import { login, signup } from "./action";


type SearchParams = Promise<{ error?: string }>;

async function ErrorBanner({ searchParams }: { searchParams: SearchParams }) {
  const { error } = await searchParams;
  if (!error) return null;
  return (
    <p className="mb-4 rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <main className="mx-auto mt-24 max-w-sm p-4">
      <h1 className="mb-6 text-2xl font-semibold">Sign in</h1>

      <Suspense>
        <ErrorBanner searchParams={searchParams} />
      </Suspense>

      <form className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          className="rounded border p-2"
        />
        <br></br>
        <input
          name="password"
          type="password"
          placeholder="Password (min 6 chars)"
          required
          minLength={6}
          className="rounded border p-2"
        />
        <br></br>
        <button formAction={login} className="rounded bg-black p-2 text-white">
          Log in
        </button>
        <br></br>
        <button formAction={signup} className="rounded border p-2">
          Sign up
        </button>
      </form>
    </main>
  );
}