"use client";

import { useActionState, useState, useEffect } from "react";
import { submitLeaveRequest } from "@/lib/actions/leave";
import type { ActionState } from "@/lib/actions/leave";

const inputClass =
    "block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500";
const selectClass =
    "block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500";

function calcDays(start: string, end: string): number | null {
    if (!start || !end) return null;
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return null;
    let count = 0;
    const current = new Date(s);
    current.setHours(0, 0, 0, 0);
    const endNorm = new Date(e);
    endNorm.setHours(0, 0, 0, 0);
    while (current <= endNorm) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) count++;
        current.setDate(current.getDate() + 1);
    }
    return count === 0 ? null : count;
}

export default function LeaveRequestForm({
    annualLeaveBalance,
}: {
    annualLeaveBalance: number;
}) {
    const [state, action, isPending] = useActionState<ActionState, FormData>(
        submitLeaveRequest,
        null,
    );
    const [type, setType] = useState("annual");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [reason, setReason] = useState("");

    const fe = state?.fieldErrors ?? {};
    const reasonRequired = type === "unpaid" || type === "emergency";
    const days = calcDays(startDate, endDate);

    useEffect(() => {
        if (state?.success) {
            setType("annual");
            setStartDate("");
            setEndDate("");
            setReason("");
        }
    }, [state?.success]);

    return (
        <form action={action} className="space-y-4">
            {state?.error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {state.error}
                </div>
            )}
            {state?.success && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {state.success}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Type */}
                <div>
                    <label
                        htmlFor="type"
                        className="block text-sm font-medium text-gray-700 mb-1"
                    >
                        Leave Type <span className="text-red-500">*</span>
                    </label>
                    <select
                        id="type"
                        name="type"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className={selectClass}
                        disabled={isPending}
                    >
                        <option value="annual">
                            Annual ({annualLeaveBalance} day
                            {annualLeaveBalance !== 1 ? "s" : ""} remaining)
                        </option>
                        <option value="sick">Sick</option>
                        <option value="unpaid">Unpaid</option>
                        <option value="emergency">Emergency</option>
                    </select>
                    {fe.type?.[0] && (
                        <p className="mt-1 text-xs text-red-600">{fe.type[0]}</p>
                    )}
                </div>

                {/* Days preview */}
                <div className="flex items-end pb-0.5">
                    {days !== null && (
                        <p className="text-sm text-gray-500">
                            <span className="font-semibold text-gray-900">{days}</span>{" "}
                            day{days !== 1 ? "s" : ""}
                        </p>
                    )}
                </div>

                {/* Start Date */}
                <div>
                    <label
                        htmlFor="startDate"
                        className="block text-sm font-medium text-gray-700 mb-1"
                    >
                        Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="startDate"
                        name="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className={inputClass}
                        disabled={isPending}
                    />
                    {fe.startDate?.[0] && (
                        <p className="mt-1 text-xs text-red-600">{fe.startDate[0]}</p>
                    )}
                </div>

                {/* End Date */}
                <div>
                    <label
                        htmlFor="endDate"
                        className="block text-sm font-medium text-gray-700 mb-1"
                    >
                        End Date <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="endDate"
                        name="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className={inputClass}
                        disabled={isPending}
                    />
                    {fe.endDate?.[0] && (
                        <p className="mt-1 text-xs text-red-600">{fe.endDate[0]}</p>
                    )}
                </div>

                {/* Reason */}
                <div className="sm:col-span-2">
                    <label
                        htmlFor="reason"
                        className="block text-sm font-medium text-gray-700 mb-1"
                    >
                        Reason{" "}
                        {reasonRequired ? (
                            <span className="text-red-500">*</span>
                        ) : (
                            <span className="text-xs font-normal text-gray-400">(optional)</span>
                        )}
                    </label>
                    <textarea
                        id="reason"
                        name="reason"
                        rows={3}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder={
                            reasonRequired
                                ? "Required for this leave type"
                                : "Add a reason (optional)"
                        }
                        className={inputClass}
                        disabled={isPending}
                    />
                    {fe.reason?.[0] && (
                        <p className="mt-1 text-xs text-red-600">{fe.reason[0]}</p>
                    )}
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    {isPending ? "Submitting…" : "Submit Request"}
                </button>
            </div>
        </form>
    );
}
