import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { db } from "@/db";
import { employees, payslips } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import PayrollControls from "@/components/payroll/PayrollControls";
import DraftPayslipRow from "@/components/payroll/DraftPayslipRow";

export const metadata: Metadata = {
    title: "Payroll",
};

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const COL_HEADERS = [
    "Employee", "Base Salary", "EPF", "SOCSO", "EIS", "PCB",
    "Bonuses", "Other Deductions", "Net Salary", "Status", "Actions",
];

function fmt(v: string | number): string {
    return parseFloat(String(v)).toFixed(2);
}

export default async function PayrollPage({
    searchParams,
}: {
    searchParams: Promise<{ month?: string; year?: string }>;
}) {
    await requireRole(["hr", "admin"]);

    const { month: monthParam, year: yearParam } = await searchParams;
    const now = new Date();
    const month = monthParam ? parseInt(monthParam) : now.getMonth() + 1;
    const year = yearParam ? parseInt(yearParam) : now.getFullYear();

    const periodPayslips = await db
        .select({
            id: payslips.id,
            employeeName: employees.name,
            baseSalary: payslips.baseSalary,
            epfEmployee: payslips.epfEmployee,
            socsoEmployee: payslips.socsoEmployee,
            eisEmployee: payslips.eisEmployee,
            pcb: payslips.pcb,
            bonuses: payslips.bonuses,
            otherDeductions: payslips.otherDeductions,
            netSalary: payslips.netSalary,
            status: payslips.status,
        })
        .from(payslips)
        .innerJoin(employees, eq(payslips.employeeId, employees.id))
        .where(and(eq(payslips.month, month), eq(payslips.year, year)))
        .orderBy(employees.name);

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-gray-900">Payroll</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Manage payslips for {MONTHS[month - 1]} {year}
                </p>
            </div>

            <div className="mb-6">
                <PayrollControls defaultMonth={month} defaultYear={year} />
            </div>

            {periodPayslips.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
                    <p className="text-sm text-gray-500">
                        No payslips for {MONTHS[month - 1]} {year}. Click &quot;Generate Payslips&quot; to create them.
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {COL_HEADERS.map((col, i) => (
                                    <th
                                        key={col}
                                        className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 ${i === 0 || i >= 9 ? "text-left" : "text-right"}`}
                                    >
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {periodPayslips.map((p) =>
                                p.status === "draft" ? (
                                    <DraftPayslipRow
                                        key={p.id}
                                        id={p.id}
                                        employeeName={p.employeeName}
                                        baseSalary={p.baseSalary}
                                        epfEmployee={p.epfEmployee}
                                        socsoEmployee={p.socsoEmployee}
                                        eisEmployee={p.eisEmployee}
                                        pcb={p.pcb}
                                        bonuses={p.bonuses}
                                        otherDeductions={p.otherDeductions}
                                        netSalary={p.netSalary}
                                    />
                                ) : (
                                    <tr key={p.id} className="border-b border-gray-100">
                                        <td className="px-4 py-2.5 text-sm text-gray-900 whitespace-nowrap">{p.employeeName}</td>
                                        <td className="px-4 py-2.5 text-sm text-right tabular-nums text-gray-700">{fmt(p.baseSalary)}</td>
                                        <td className="px-4 py-2.5 text-sm text-right tabular-nums text-gray-700">{fmt(p.epfEmployee)}</td>
                                        <td className="px-4 py-2.5 text-sm text-right tabular-nums text-gray-700">{fmt(p.socsoEmployee)}</td>
                                        <td className="px-4 py-2.5 text-sm text-right tabular-nums text-gray-700">{fmt(p.eisEmployee)}</td>
                                        <td className="px-4 py-2.5 text-sm text-right tabular-nums text-gray-700">{fmt(p.pcb)}</td>
                                        <td className="px-4 py-2.5 text-sm text-right tabular-nums text-gray-700">{fmt(p.bonuses)}</td>
                                        <td className="px-4 py-2.5 text-sm text-right tabular-nums text-gray-700">{fmt(p.otherDeductions)}</td>
                                        <td className="px-4 py-2.5 text-sm text-right tabular-nums font-medium text-gray-900">{fmt(p.netSalary)}</td>
                                        <td className="px-4 py-2.5">
                                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                                Finalized
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-sm text-gray-300">—</td>
                                    </tr>
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
