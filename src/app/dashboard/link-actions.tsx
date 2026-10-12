"use client";

import { useActionState } from "react";
import {
  deleteLinkAction,
  setLinkActiveAction,
  type LinkActionState,
} from "./actions";

const initial: LinkActionState = {};

export function LinkActions({ id, isActive }: { id: string; isActive: boolean }) {
  const [toggleState, toggleAction, toggling] = useActionState(
    setLinkActiveAction,
    initial,
  );
  const [deleteState, deleteAction, deleting] = useActionState(
    deleteLinkAction,
    initial,
  );
  const error = toggleState.error ?? deleteState.error;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <form action={toggleAction}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="active" value={String(!isActive)} />
          <button
            disabled={toggling || deleting}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            {isActive ? "Deactivate" : "Activate"}
          </button>
        </form>
        <form
          action={deleteAction}
          onSubmit={(e) => {
            if (!confirm("Delete this link and its click history? This can't be undone.")) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={id} />
          <button
            disabled={toggling || deleting}
            className="rounded border border-red-300 px-3 py-1 text-sm text-red-700 disabled:opacity-50"
          >
            Delete
          </button>
        </form>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
