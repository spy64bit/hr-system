"use client";

import { useActionState } from "react";
import { selfUpdateEmployee } from "@/lib/actions/employee";
import type { ActionState } from "@/lib/actions/employee";
import { FormField, inputClass } from "./FormField";

type Props = {
    name: string;
    email: string;
    role: string;
    department: string;
    position: string;
    joinedAt: string;
};

export default function SelfEditForm({ name, email, role, department, position, joinedAt }: Props) {
    const [state, action, isPending] = useActionState<ActionState, FormData>(
        selfUpdateEmployee,
        null
    );
    const fe = state?.fieldErrors ?? {};

    return (
        <div className="space-y-6">
            <form action={action} className="space-y-5">
                {state?.success && (
                    <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                        {state.success}
                    </div>
                )}

                <FormField label="Full Name" name="name" error={fe.name} required>
                    <input
                        id="name"
                        name="name"
                        type="text"
                        defaultValue={name}
                        className={inputClass}
                        disabled={isPending}
                    />
                </FormField>

                <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                    {isPending ? "Saving…" : "Update Name"}
                </button>
            </form>

            {/* Read-only fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {[
                    { label: "Email", value: email },
                    { label: "Role", value: role },
                    { label: "Department", value: department },
                    { label: "Position", value: position },
                    { label: "Join Date", value: joinedAt },
                ].map(({ label, value }) => (
                    <div key={label}>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                            {label}
                        </p>
                        <p className="text-sm text-gray-900 capitalize">{value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
