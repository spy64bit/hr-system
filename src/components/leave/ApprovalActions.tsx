"use client";

import { useActionState } from "react";
import { approveLeaveRequest, rejectLeaveRequest } from "@/lib/actions/leave";
import type { ActionState } from "@/lib/actions/leave";

export default function ApprovalActions({ requestId }: { requestId: number }) {
    const [approveState, approveAction, approvePending] = useActionState<
        ActionState,
        FormData
    >(approveLeaveRequest, null);
    const [rejectState, rejectAction, rejectPending] = useActionState<
        ActionState,
        FormData
    >(rejectLeaveRequest, null);

    const busy = approvePending || rejectPending;

    return (
        <div className="flex items-center gap-3">
            <form action={approveAction}>
                <input type="hidden" name="requestId" value={requestId} />
                <button
                    type="submit"
                    disabled={busy}
                    className="text-xs font-medium text-green-700 hover:text-green-900 disabled:opacity-50 transition-colors"
                >
                    {approvePending ? "…" : "Approve"}
                </button>
            </form>
            <form
                action={rejectAction}
                onSubmit={(e) => {
                    if (!confirm("Reject this leave request?")) e.preventDefault();
                }}
            >
                <input type="hidden" name="requestId" value={requestId} />
                <button
                    type="submit"
                    disabled={busy}
                    className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors"
                >
                    {rejectPending ? "…" : "Reject"}
                </button>
            </form>
            {approveState?.error && (
                <p className="text-xs text-red-600">{approveState.error}</p>
            )}
            {rejectState?.error && (
                <p className="text-xs text-red-600">{rejectState.error}</p>
            )}
        </div>
    );
}
