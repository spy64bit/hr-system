import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { payslips, employees } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import PrintButton from "@/components/payroll/PrintButton";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

function fmt(v: string | number): string {
    return parseFloat(String(v)).toFixed(2);
}

export default async function PayslipDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await requireAuth();
    const { id: idParam } = await params;
    const payslipId = parseInt(idParam);

    if (isNaN(payslipId)) notFound();

    const [payslip] = await db
        .select({
            id: payslips.id,
            employeeId: payslips.employeeId,
            month: payslips.month,
            year: payslips.year,
            baseSalary: payslips.baseSalary,
            epfEmployee: payslips.epfEmployee,
            socsoEmployee: payslips.socsoEmployee,
            eisEmployee: payslips.eisEmployee,
            pcb: payslips.pcb,
            bonuses: payslips.bonuses,
            otherDeductions: payslips.otherDeductions,
            netSalary: payslips.netSalary,
            status: payslips.status,
            finalizedAt: payslips.finalizedAt,
            employeeName: employees.name,
            department: employees.department,
            position: employees.position,
        })
        .from(payslips)
        .innerJoin(employees, eq(payslips.employeeId, employees.id))
        .where(eq(payslips.id, payslipId))
        .limit(1);

    if (!payslip) notFound();

    // Verify the payslip belongs to the logged-in user
    if (payslip.employeeId !== parseInt(session.user.id)) {
        redirect("/dashboard/payroll/my-payslips");
    }

    // Only finalized payslips are visible to employees
    if (payslip.status !== "finalized") {
        redirect("/dashboard/payroll/my-payslips");
    }

    const bonuses = parseFloat(payslip.bonuses);
    const otherDeductions = parseFloat(payslip.otherDeductions);
    const grossEarnings = parseFloat(payslip.baseSalary) + bonuses;
    const totalDeductions =
        parseFloat(payslip.epfEmployee) +
        parseFloat(payslip.socsoEmployee) +
        parseFloat(payslip.eisEmployee) +
        parseFloat(payslip.pcb) +
        otherDeductions;

    return (
        <div className="p-8">
            <div className="mb-6 print:hidden">
                <Link
                    href="/dashboard/payroll/my-payslips"
                    className="text-sm text-blue-600 hover:text-blue-800"
                >
                    ← Back to My Payslips
                </Link>
            </div>

            {/* Payslip card */}
            <div className="max-w-2xl bg-white border border-gray-200 rounded-xl overflow-hidden print:border-0 print:rounded-none print:max-w-none">
                {/* Header */}
                <div className="bg-gray-50 px-8 py-6 border-b border-gray-200 print:bg-white">
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-xl font-semibold text-gray-900">Payslip</h1>
                            <p className="text-sm text-gray-500 mt-0.5">
                                {MONTHS[payslip.month - 1]} {payslip.year}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-medium text-gray-700">HR System</p>
                            {payslip.finalizedAt && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Issued{" "}
                                    {new Date(payslip.finalizedAt).toLocaleDateString("en-MY", {
                                        day: "numeric",
                                        month: "long",
                                        year: "numeric",
                                    })}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Employee info */}
                <div className="px-8 py-5 border-b border-gray-100">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                        Employee
                    </h2>
                    <div className="grid grid-cols-2 gap-y-1.5 text-sm">
                        <span className="text-gray-500">Name</span>
                        <span className="font-medium text-gray-900">{payslip.employeeName}</span>
                        <span className="text-gray-500">Position</span>
                        <span className="text-gray-900">{payslip.position}</span>
                        <span className="text-gray-500">Department</span>
                        <span className="text-gray-900">{payslip.department}</span>
                    </div>
                </div>

                {/* Earnings */}
                <div className="px-8 py-5 border-b border-gray-100">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                        Earnings
                    </h2>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Basic Salary</span>
                            <span className="tabular-nums text-gray-900">
                                RM {fmt(payslip.baseSalary)}
                            </span>
                        </div>
                        {bonuses > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Bonuses</span>
                                <span className="tabular-nums text-gray-900">
                                    RM {fmt(payslip.bonuses)}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm font-medium">
                        <span className="text-gray-700">Gross Earnings</span>
                        <span className="tabular-nums text-gray-900">
                            RM {fmt(grossEarnings)}
                        </span>
                    </div>
                </div>

                {/* Deductions */}
                <div className="px-8 py-5 border-b border-gray-100">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                        Deductions
                    </h2>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">EPF (11%)</span>
                            <span className="tabular-nums text-gray-900">
                                RM {fmt(payslip.epfEmployee)}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">SOCSO</span>
                            <span className="tabular-nums text-gray-900">
                                RM {fmt(payslip.socsoEmployee)}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">EIS</span>
                            <span className="tabular-nums text-gray-900">
                                RM {fmt(payslip.eisEmployee)}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">PCB (Income Tax)</span>
                            <span className="tabular-nums text-gray-900">
                                RM {fmt(payslip.pcb)}
                            </span>
                        </div>
                        {otherDeductions > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Other Deductions</span>
                                <span className="tabular-nums text-gray-900">
                                    RM {fmt(payslip.otherDeductions)}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm font-medium">
                        <span className="text-gray-700">Total Deductions</span>
                        <span className="tabular-nums text-red-600">
                            RM {fmt(totalDeductions)}
                        </span>
                    </div>
                </div>

                {/* Net salary */}
                <div className="px-8 py-6">
                    <div className="flex items-baseline justify-between">
                        <span className="text-base font-semibold text-gray-900">Net Salary</span>
                        <span className="text-2xl font-bold tabular-nums text-gray-900">
                            RM {fmt(payslip.netSalary)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Print */}
            <div className="mt-4 max-w-2xl flex justify-end print:hidden">
                <PrintButton />
            </div>
        </div>
    );
}
