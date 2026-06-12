"use client";

import { useActionState } from "react";
import { cancelLeaveRequest } from "@/lib/actions/leave";
import type { ActionState } from "@/lib/actions/leave";

export default function CancelButton({ requestId }: { requestId: number }) {
    const [state, action, isPending] = useActionState<ActionState, FormData>(
        cancelLeaveRequest,
        null,
    );

    return (
        <div>
            <form
                action={action}
                onSubmit={(e) => {
                    if (!confirm("Cancel this leave request?")) e.preventDefault();
                }}
            >
                <input type="hidden" name="requestId" value={requestId} />
                <button
                    type="submit"
                    disabled={isPending}
                    className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors"
                >
                    {isPending ? "Cancelling…" : "Cancel"}
                </button>
            </form>
            {state?.error && (
                <p className="mt-1 text-xs text-red-600">{state.error}</p>
            )}
        </div>
    );
}
