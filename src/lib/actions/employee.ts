"use server";

import { requireAuth, requireRole } from "@/lib/auth";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { eq, ne } from "drizzle-orm";
import { hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
    createEmployeeSchema,
    updateEmployeeSchema,
    selfUpdateSchema,
    resetPasswordSchema,
} from "@/lib/validations/employee";

export type ActionState = {
    error?: string;
    fieldErrors?: Partial<Record<string, string[]>>;
    success?: string;
} | null;

export async function createEmployee(
    prevState: ActionState,
    formData: FormData
): Promise<ActionState> {
    const session = await requireRole(["admin", "hr"]);

    const raw = {
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
        role: formData.get("role"),
        managerId: formData.get("managerId"),
        position: formData.get("position"),
        department: formData.get("department"),
        baseSalary: formData.get("baseSalary"),
        annualLeaveBalance: formData.get("annualLeaveBalance"),
        joinedAt: formData.get("joinedAt"),
    };

    const result = createEmployeeSchema.safeParse(raw);
    if (!result.success) {
        return { fieldErrors: result.error.flatten().fieldErrors };
    }

    const data = result.data;

    // HR cannot assign the admin role
    if (session.user.role === "hr" && data.role === "admin") {
        return { fieldErrors: { role: ["HR cannot assign the admin role"] } };
    }

    // Email uniqueness check
    const [existing] = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.email, data.email))
        .limit(1);
    if (existing) {
        return { fieldErrors: { email: ["Email is already in use"] } };
    }

    const passwordHash = await hash(data.password, 12);

    await db.insert(employees).values({
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        managerId: data.managerId ?? null,
        position: data.position,
        department: data.department,
        baseSalary: String(data.baseSalary),
        annualLeaveBalance: data.annualLeaveBalance,
        joinedAt: data.joinedAt,
    });

    revalidatePath("/dashboard/employees");
    redirect("/dashboard/employees?success=created");
}

export async function updateEmployee(
    id: number,
    prevState: ActionState,
    formData: FormData
): Promise<ActionState> {
    const session = await requireRole(["admin", "hr"]);

    const raw = {
        name: formData.get("name"),
        email: formData.get("email"),
        role: formData.get("role"),
        managerId: formData.get("managerId"),
        position: formData.get("position"),
        department: formData.get("department"),
        baseSalary: formData.get("baseSalary"),
        annualLeaveBalance: formData.get("annualLeaveBalance"),
        joinedAt: formData.get("joinedAt"),
    };

    const result = updateEmployeeSchema.safeParse(raw);
    if (!result.success) {
        return { fieldErrors: result.error.flatten().fieldErrors };
    }

    const data = result.data;

    // HR cannot assign admin role
    if (session.user.role === "hr" && data.role === "admin") {
        return { fieldErrors: { role: ["HR cannot assign the admin role"] } };
    }

    // Self-management check
    if (data.managerId === id) {
        return { fieldErrors: { managerId: ["An employee cannot manage themselves"] } };
    }

    // Email uniqueness check (excluding self)
    const [existing] = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.email, data.email))
        .limit(1);
    if (existing && existing.id !== id) {
        return { fieldErrors: { email: ["Email is already in use"] } };
    }

    await db
        .update(employees)
        .set({
            name: data.name,
            email: data.email,
            role: data.role,
            managerId: data.managerId ?? null,
            position: data.position,
            department: data.department,
            baseSalary: String(data.baseSalary),
            annualLeaveBalance: data.annualLeaveBalance,
            joinedAt: data.joinedAt,
            updatedAt: new Date(),
        })
        .where(eq(employees.id, id));

    revalidatePath(`/dashboard/employees/${id}`);
    revalidatePath("/dashboard/employees");
    return { success: "Employee updated successfully" };
}

export async function deleteEmployee(
    id: number,
    prevState: ActionState,
    formData: FormData
): Promise<ActionState> {
    await requireRole(["admin", "hr"]);

    // Prevent deleting if they have direct reports
    const [directReport] = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.managerId, id))
        .limit(1);

    if (directReport) {
        return {
            error: "Cannot delete an employee who manages others. Reassign their direct reports first.",
        };
    }

    await db.delete(employees).where(eq(employees.id, id));

    revalidatePath("/dashboard/employees");
    redirect("/dashboard/employees?success=deleted");
}

export async function selfUpdateEmployee(
    prevState: ActionState,
    formData: FormData
): Promise<ActionState> {
    const session = await requireAuth();

    const raw = { name: formData.get("name") };
    const result = selfUpdateSchema.safeParse(raw);
    if (!result.success) {
        return { fieldErrors: result.error.flatten().fieldErrors };
    }

    const employeeId = parseInt(session.user.id);
    await db
        .update(employees)
        .set({ name: result.data.name, updatedAt: new Date() })
        .where(eq(employees.id, employeeId));

    revalidatePath(`/dashboard/employees/${employeeId}`);
    return { success: "Profile updated successfully" };
}

export async function resetPassword(
    id: number,
    prevState: ActionState,
    formData: FormData
): Promise<ActionState> {
    await requireRole(["admin", "hr"]);

    const raw = { password: formData.get("password") };
    const result = resetPasswordSchema.safeParse(raw);
    if (!result.success) {
        return { fieldErrors: result.error.flatten().fieldErrors };
    }

    const passwordHash = await hash(result.data.password, 12);
    await db
        .update(employees)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(employees.id, id));

    return { success: "Password reset successfully" };
}
