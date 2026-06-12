"use client";

import { useActionState, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { generatePayslips } from "@/lib/actions/payroll";
import type { ActionState } from "@/lib/actions/payroll";

const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

const selectClass =
    "rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

export default function PayrollControls({
    defaultMonth,
    defaultYear,
}: {
    defaultMonth: number;
    defaultYear: number;
}) {
    const [month, setMonth] = useState(defaultMonth);
    const [year, setYear] = useState(defaultYear);
    const router = useRouter();
    const [state, action, isPending] = useActionState<ActionState, FormData>(
        generatePayslips,
        null,
    );

    // Sync local state if URL params change (e.g. browser back/forward)
    useEffect(() => {
        setMonth(defaultMonth);
        setYear(defaultYear);
    }, [defaultMonth, defaultYear]);

    const handlePeriodChange = (newMonth: number, newYear: number) => {
        setMonth(newMonth);
        setYear(newYear);
        router.replace(`/dashboard/payroll?month=${newMonth}&year=${newYear}`);
    };

    return (
        <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
                <select
                    value={month}
                    onChange={(e) => handlePeriodChange(parseInt(e.target.value), year)}
                    className={selectClass}
                >
                    {MONTHS.map((m, i) => (
                        <option key={i + 1} value={i + 1}>
                            {m}
                        </option>
                    ))}
                </select>
                <select
                    value={year}
                    onChange={(e) => handlePeriodChange(month, parseInt(e.target.value))}
                    className={selectClass}
                >
                    {YEARS.map((y) => (
                        <option key={y} value={y}>
                            {y}
                        </option>
                    ))}
                </select>
            </div>

            <form action={action} className="flex items-center gap-3">
                <input type="hidden" name="month" value={month} />
                <input type="hidden" name="year" value={year} />
                <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    {isPending ? "Generating…" : "Generate Payslips"}
                </button>
                {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
                {state?.success && <p className="text-sm text-green-600">{state.success}</p>}
            </form>
        </div>
    );
}
