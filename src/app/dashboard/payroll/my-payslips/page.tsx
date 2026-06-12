import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { payslips } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import Link from "next/link";

export const metadata: Metadata = {
    title: "My Payslips",
};

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

function fmt(v: string | number): string {
    return parseFloat(String(v)).toFixed(2);
}

export default async function MyPayslipsPage() {
    const session = await requireAuth();
    const employeeId = parseInt(session.user.id);

    const myPayslips = await db
        .select()
        .from(payslips)
        .where(and(eq(payslips.employeeId, employeeId), eq(payslips.status, "finalized")))
        .orderBy(desc(payslips.year), desc(payslips.month));

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-gray-900">My Payslips</h1>
                <p className="mt-1 text-sm text-gray-500">Your finalized payslips</p>
            </div>

            {myPayslips.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
                    <p className="text-sm text-gray-500">No finalized payslips yet.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {[
                                    "Period",
                                    "Base Salary",
                                    "EPF",
                                    "SOCSO",
                                    "EIS",
                                    "PCB",
                                    "Bonuses",
                                    "Other Deductions",
                                    "Net Salary",
                                ].map((col, i) => (
                                    <th
                                        key={col}
                                        className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 ${i === 0 ? "text-left" : "text-right"}`}
                                    >
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {myPayslips.map((p) => (
                                <tr
                                    key={p.id}
                                    className="border-b border-gray-100 hover:bg-gray-50"
                                >
                                    <td className="px-4 py-3">
                                        <Link
                                            href={`/dashboard/payroll/my-payslips/${p.id}`}
                                            className="text-sm font-medium text-blue-600 hover:text-blue-800"
                                        >
                                            {MONTHS[p.month - 1]} {p.year}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right tabular-nums text-gray-700">
                                        {fmt(p.baseSalary)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right tabular-nums text-gray-700">
                                        {fmt(p.epfEmployee)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right tabular-nums text-gray-700">
                                        {fmt(p.socsoEmployee)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right tabular-nums text-gray-700">
                                        {fmt(p.eisEmployee)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right tabular-nums text-gray-700">
                                        {fmt(p.pcb)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right tabular-nums text-gray-700">
                                        {fmt(p.bonuses)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right tabular-nums text-gray-700">
                                        {fmt(p.otherDeductions)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right tabular-nums font-semibold text-gray-900">
                                        {fmt(p.netSalary)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
