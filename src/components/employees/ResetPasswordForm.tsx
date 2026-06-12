"use client";

import { useActionState } from "react";
import { resetPassword } from "@/lib/actions/employee";
import type { ActionState } from "@/lib/actions/employee";
import { FormField, inputClass } from "./FormField";

type Props = { employeeId: number };

export default function ResetPasswordForm({ employeeId }: Props) {
    const resetWithId = resetPassword.bind(null, employeeId);
    const [state, action, isPending] = useActionState<ActionState, FormData>(
        resetWithId,
        null
    );
    const fe = state?.fieldErrors ?? {};

    return (
        <form action={action} className="space-y-4">
            {state?.success && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {state.success}
                </div>
            )}
            {state?.error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {state.error}
                </div>
            )}

            <FormField label="New Password" name="password" error={fe.password} required>
                <input
                    id="reset-password"
                    name="password"
                    type="password"
                    placeholder="Min. 8 characters"
                    className={inputClass}
                    disabled={isPending}
                />
            </FormField>

            <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60 transition-colors"
            >
                {isPending ? "Resetting…" : "Reset Password"}
            </button>
        </form>
    );
}
