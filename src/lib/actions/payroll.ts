"use server";

import { requireRole } from "@/lib/auth";
import { db } from "@/db";
import { employees, payslips } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { calculatePayslip } from "@/lib/payroll";

export type ActionState = {
    error?: string;
    fieldErrors?: Partial<Record<string, string[]>>;
    success?: string;
} | null;

// useActionState-compatible — reads month/year from FormData
export async function generatePayslips(
    prevState: ActionState,
    formData: FormData,
): Promise<ActionState> {
    await requireRole(["hr", "admin"]);

    const month = parseInt(formData.get("month") as string);
    const year = parseInt(formData.get("year") as string);

    if (isNaN(month) || month < 1 || month > 12) return { error: "Invalid month" };
    if (isNaN(year) || year < 2000 || year > 2100) return { error: "Invalid year" };

    const allEmployees = await db
        .select({ id: employees.id, baseSalary: employees.baseSalary })
        .from(employees);

    const existing = await db
        .select({ employeeId: payslips.employeeId })
        .from(payslips)
        .where(and(eq(payslips.month, month), eq(payslips.year, year)));

    const existingIds = new Set(existing.map((p) => p.employeeId));
    const toInsert = allEmployees.filter((emp) => !existingIds.has(emp.id));

    if (toInsert.length > 0) {
        await db.insert(payslips).values(
            toInsert.map((emp) => {
                const salary = parseFloat(emp.baseSalary);
                const calc = calculatePayslip(salary, 0, 0);
                return {
                    employeeId: emp.id,
                    month,
                    year,
                    baseSalary: String(salary),
                    epfEmployee: String(calc.epfEmployee),
                    socsoEmployee: String(calc.socsoEmployee),
                    eisEmployee: String(calc.eisEmployee),
                    pcb: String(calc.pcb),
                    bonuses: "0",
                    otherDeductions: "0",
                    netSalary: String(calc.netSalary),
                    status: "draft" as const,
                };
            }),
        );
    }

    revalidatePath("/dashboard/payroll");
    return {
        success: `${toInsert.length} generated, ${existingIds.size} skipped (already exist)`,
    };
}

// Direct call from DraftPayslipRow client component
export async function updatePayslipAdjustments(
    payslipId: number,
    bonuses: number,
    otherDeductions: number,
): Promise<ActionState> {
    await requireRole(["hr", "admin"]);

    const [payslip] = await db
        .select({ id: payslips.id, baseSalary: payslips.baseSalary, status: payslips.status })
        .from(payslips)
        .where(eq(payslips.id, payslipId))
        .limit(1);

    if (!payslip) return { error: "Payslip not found" };
    if (payslip.status !== "draft") return { error: "Cannot edit a finalized payslip" };

    const baseSalary = parseFloat(payslip.baseSalary);
    const calc = calculatePayslip(baseSalary, bonuses, otherDeductions);

    await db
        .update(payslips)
        .set({
            bonuses: String(bonuses),
            otherDeductions: String(otherDeductions),
            netSalary: String(calc.netSalary),
        })
        .where(eq(payslips.id, payslipId));

    revalidatePath("/dashboard/payroll");
    return { success: "Saved" };
}

// Direct call from DraftPayslipRow client component
export async function finalizePayslip(payslipId: number): Promise<ActionState> {
    await requireRole(["hr", "admin"]);

    const [payslip] = await db
        .select({ id: payslips.id, status: payslips.status })
        .from(payslips)
        .where(eq(payslips.id, payslipId))
        .limit(1);

    if (!payslip) return { error: "Payslip not found" };
    if (payslip.status !== "draft") return { error: "Payslip is already finalized" };

    await db
        .update(payslips)
        .set({ status: "finalized", finalizedAt: new Date() })
        .where(eq(payslips.id, payslipId));

    revalidatePath("/dashboard/payroll");
    revalidatePath("/dashboard/payroll/my-payslips");
    return { success: "Finalized" };
}
