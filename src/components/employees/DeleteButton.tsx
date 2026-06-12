"use client";

import { useActionState } from "react";
import { deleteEmployee } from "@/lib/actions/employee";
import type { ActionState } from "@/lib/actions/employee";

type Props = { employeeId: number };

export default function DeleteButton({ employeeId }: Props) {
    const deleteWithId = deleteEmployee.bind(null, employeeId);
    const [state, action, isPending] = useActionState<ActionState, FormData>(
        deleteWithId,
        null
    );

    return (
        <div className="space-y-2">
            {state?.error && (
                <p className="text-sm text-red-600">{state.error}</p>
            )}
            <form
                action={action}
                onSubmit={(e) => {
                    if (!confirm("Are you sure you want to delete this employee? This cannot be undone.")) {
                        e.preventDefault();
                    }
                }}
            >
                <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                >
                    {isPending ? "Deleting…" : "Delete Employee"}
                </button>
            </form>
        </div>
    );
}
