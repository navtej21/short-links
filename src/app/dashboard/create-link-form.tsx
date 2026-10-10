"use client";

import { useActionState } from "react";
import { createLinkAction, type CreateLinkState } from "./actions";

const initialState: CreateLinkState = {};

export function CreateLinkForm() {
  const [state, formAction, isPending] = useActionState(
    createLinkAction,
    initialState
  );

  return (
    <form action={formAction} noValidate className="mt-8 flex flex-col gap-3">
      <label htmlFor="url" className="text-sm font-medium">
        Shorten a URL
      </label>
      <div className="flex gap-2">
        <input
          id="url"
          name="url"
          type="url"
          required
          placeholder="https://example.com/a/very/long/link"
          className="flex-1 rounded border p-2"
        />
        <button
          disabled={isPending}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {isPending ? "Creating..." : "Shorten"}
        </button>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.shortUrl && (
        <p className="text-sm">
          Short link:{" "}
          <a href={state.shortUrl} className="underline">
            {state.shortUrl}
          </a>
        </p>
      )}
    </form>
  );
}