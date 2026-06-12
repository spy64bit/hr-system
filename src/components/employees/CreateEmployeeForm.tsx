"use client";

import { useActionState } from "react";
import { createEmployee } from "@/lib/actions/employee";
import type { ActionState } from "@/lib/actions/employee";
import { FormField, inputClass, selectClass } from "./FormField";
import type { UserRole } from "@/auth";

type ManagerOption = { id: number; name: string };

type Props = {
    managers: ManagerOption[];
    sessionRole: UserRole;
};

export default function CreateEmployeeForm({ managers, sessionRole }: Props) {
    const [state, action, isPending] = useActionState<ActionState, FormData>(
        createEmployee,
        null
    );
    const fe = state?.fieldErrors ?? {};

    return (
        <form action={action} className="space-y-5">
            {state?.error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {state.error}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField label="Full Name" name="name" error={fe.name} required>
                    <input
                        id="name"
                        name="name"
                        type="text"
                        autoComplete="off"
                        className={inputClass}
                        disabled={isPending}
                    />
                </FormField>

                <FormField label="Email" name="email" error={fe.email} required>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="off"
                        className={inputClass}
                        disabled={isPending}
                    />
                </FormField>

                <FormField label="Password" name="password" error={fe.password} required>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        className={inputClass}
                        disabled={isPending}
                    />
                </FormField>

                <FormField label="Role" name="role" error={fe.role} required>
                    <select id="role" name="role" className={selectClass} disabled={isPending}>
                        {sessionRole === "admin" && <option value="admin">Admin</option>}
                        <option value="hr">HR</option>
                        <option value="manager">Manager</option>
                        <option value="employee">Employee</option>
                    </select>
                </FormField>

                <FormField label="Position" name="position" error={fe.position} required>
                    <input
                        id="position"
                        name="position"
                        type="text"
                        className={inputClass}
                        disabled={isPending}
                    />
                </FormField>

                <FormField label="Department" name="department" error={fe.department} required>
                    <input
                        id="department"
                        name="department"
                        type="text"
                        className={inputClass}
                        disabled={isPending}
                    />
                </FormField>

                <FormField label="Manager" name="managerId" error={fe.managerId}>
                    <select
                        id="managerId"
                        name="managerId"
                        className={selectClass}
                        disabled={isPending}
                    >
                        <option value="">— No manager —</option>
                        {managers.map((m) => (
                            <option key={m.id} value={m.id}>
                                {m.name}
                            </option>
                        ))}
                    </select>
                </FormField>

                <FormField label="Base Salary (MYR)" name="baseSalary" error={fe.baseSalary} required>
                    <input
                        id="baseSalary"
                        name="baseSalary"
                        type="number"
                        step="0.01"
                        min="0"
                        className={inputClass}
                        disabled={isPending}
                    />
                </FormField>

                <FormField
                    label="Annual Leave Balance (days)"
                    name="annualLeaveBalance"
                    error={fe.annualLeaveBalance}
                    required
                >
                    <input
                        id="annualLeaveBalance"
                        name="annualLeaveBalance"
                        type="number"
                        step="1"
                        min="0"
                        max="365"
                        defaultValue={14}
                        className={inputClass}
                        disabled={isPending}
                    />
                </FormField>

                <FormField label="Join Date" name="joinedAt" error={fe.joinedAt} required>
                    <input
                        id="joinedAt"
                        name="joinedAt"
                        type="date"
                        className={inputClass}
                        disabled={isPending}
                    />
                </FormField>
            </div>

            <div className="flex items-center gap-3 pt-2">
                <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                    {isPending ? "Creating…" : "Create Employee"}
                </button>
            </div>
        </form>
    );
}
