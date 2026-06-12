"use server";

import { requireAuth, requireRole } from "@/lib/auth";
import { db } from "@/db";
import { employees, leaveRequests } from "@/db/schema";
import { eq, and, sql, or, lte, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
    createLeaveSchema,
    calculateLeaveDays,
    getApprovalScope,
} from "@/lib/validations/leave";

export type ActionState = {
    error?: string;
    fieldErrors?: Partial<Record<string, string[]>>;
    success?: string;
} | null;

export async function submitLeaveRequest(
    prevState: ActionState,
    formData: FormData,
): Promise<ActionState> {
    const session = await requireAuth();
    const employeeId = parseInt(session.user.id);

    const raw = {
        type: formData.get("type"),
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate"),
        reason: formData.get("reason") ?? undefined,
    };

    const result = createLeaveSchema.safeParse(raw);
    if (!result.success) {
        return { fieldErrors: result.error.flatten().fieldErrors };
    }

    const data = result.data;
    const days = calculateLeaveDays(new Date(data.startDate), new Date(data.endDate));

    // Overlap check: pending or approved requests that overlap [startDate, endDate]
    const [overlapping] = await db
        .select({ id: leaveRequests.id })
        .from(leaveRequests)
        .where(
            and(
                eq(leaveRequests.employeeId, employeeId),
                or(
                    eq(leaveRequests.status, "pending"),
                    eq(leaveRequests.status, "approved"),
                ),
                lte(leaveRequests.startDate, data.endDate),
                gte(leaveRequests.endDate, data.startDate),
            ),
        )
        .limit(1);

    if (overlapping) {
        return { error: "You already have a leave request overlapping these dates." };
    }

    if (data.type === "annual") {
        const [emp] = await db
            .select({ annualLeaveBalance: employees.annualLeaveBalance })
            .from(employees)
            .where(eq(employees.id, employeeId))
            .limit(1);

        if (!emp) return { error: "Employee not found" };

        if (days > emp.annualLeaveBalance) {
            return {
                error: `Insufficient annual leave balance. You have ${emp.annualLeaveBalance} day(s) remaining but requested ${days} day(s).`,
            };
        }
    }

    await db.insert(leaveRequests).values({
        employeeId,
        type: data.type,
        startDate: data.startDate,
        endDate: data.endDate,
        days,
        reason: data.reason?.trim() || null,
        status: "pending",
    });

    revalidatePath("/dashboard/leave-requests");
    return { success: "Leave request submitted successfully." };
}

export async function cancelLeaveRequest(
    prevState: ActionState,
    formData: FormData,
): Promise<ActionState> {
    const session = await requireAuth();
    const employeeId = parseInt(session.user.id);
    const requestId = parseInt(formData.get("requestId") as string);

    if (isNaN(requestId)) return { error: "Invalid request ID" };

    const [request] = await db
        .select({ id: leaveRequests.id })
        .from(leaveRequests)
        .where(
            and(
                eq(leaveRequests.id, requestId),
                eq(leaveRequests.employeeId, employeeId),
                eq(leaveRequests.status, "pending"),
            ),
        )
        .limit(1);

    if (!request) return { error: "Request not found or cannot be cancelled" };

    await db.delete(leaveRequests).where(eq(leaveRequests.id, requestId));

    revalidatePath("/dashboard/leave-requests");
    return { success: "Leave request cancelled." };
}

export async function approveLeaveRequest(
    prevState: ActionState,
    formData: FormData,
): Promise<ActionState> {
    const session = await requireRole(["admin", "hr", "manager"]);
    const approverId = parseInt(session.user.id);
    const requestId = parseInt(formData.get("requestId") as string);

    if (isNaN(requestId)) return { error: "Invalid request ID" };

    const [request] = await db
        .select({
            id: leaveRequests.id,
            employeeId: leaveRequests.employeeId,
            type: leaveRequests.type,
            days: leaveRequests.days,
        })
        .from(leaveRequests)
        .where(and(eq(leaveRequests.id, requestId), eq(leaveRequests.status, "pending")))
        .limit(1);

    if (!request) return { error: "Request not found or already processed" };

    const [requester] = await db
        .select({ role: employees.role, managerId: employees.managerId })
        .from(employees)
        .where(eq(employees.id, request.employeeId))
        .limit(1);

    if (!requester) return { error: "Employee not found" };

    const scope = getApprovalScope(session.user.role, approverId);

    if (scope.type === "manager" && requester.managerId !== approverId) {
        return { error: "You can only approve requests from your direct reports" };
    }
    if (scope.type === "hr") {
        if (request.employeeId === approverId) {
            return { error: "You cannot approve your own leave request" };
        }
        if (!["employee", "manager", "hr"].includes(requester.role)) {
            return { error: "Insufficient permissions to approve this request" };
        }
    }

    if (request.type === "annual") {
        const [emp] = await db
            .select({ annualLeaveBalance: employees.annualLeaveBalance })
            .from(employees)
            .where(eq(employees.id, request.employeeId))
            .limit(1);

        if (!emp || emp.annualLeaveBalance < request.days) {
            return { error: "Insufficient annual leave balance — cannot approve this request." };
        }

        await db.transaction(async (tx) => {
            await tx
                .update(leaveRequests)
                .set({ status: "approved", approvedBy: approverId, approvedAt: new Date() })
                .where(eq(leaveRequests.id, requestId));
            await tx
                .update(employees)
                .set({
                    annualLeaveBalance: sql`${employees.annualLeaveBalance} - ${request.days}`,
                })
                .where(eq(employees.id, request.employeeId));
        });
    } else {
        await db
            .update(leaveRequests)
            .set({ status: "approved", approvedBy: approverId, approvedAt: new Date() })
            .where(eq(leaveRequests.id, requestId));
    }

    revalidatePath("/dashboard/approvals");
    revalidatePath("/dashboard/leave-requests");
    return { success: "Leave request approved." };
}

export async function rejectLeaveRequest(
    prevState: ActionState,
    formData: FormData,
): Promise<ActionState> {
    const session = await requireRole(["admin", "hr", "manager"]);
    const approverId = parseInt(session.user.id);
    const requestId = parseInt(formData.get("requestId") as string);

    if (isNaN(requestId)) return { error: "Invalid request ID" };

    const [request] = await db
        .select({
            id: leaveRequests.id,
            employeeId: leaveRequests.employeeId,
        })
        .from(leaveRequests)
        .where(and(eq(leaveRequests.id, requestId), eq(leaveRequests.status, "pending")))
        .limit(1);

    if (!request) return { error: "Request not found or already processed" };

    const [requester] = await db
        .select({ role: employees.role, managerId: employees.managerId })
        .from(employees)
        .where(eq(employees.id, request.employeeId))
        .limit(1);

    if (!requester) return { error: "Employee not found" };

    const scope = getApprovalScope(session.user.role, approverId);

    if (scope.type === "manager" && requester.managerId !== approverId) {
        return { error: "You can only reject requests from your direct reports" };
    }
    if (scope.type === "hr") {
        if (request.employeeId === approverId) {
            return { error: "You cannot reject your own leave request" };
        }
        if (!["employee", "manager", "hr"].includes(requester.role)) {
            return { error: "Insufficient permissions to reject this request" };
        }
    }

    await db
        .update(leaveRequests)
        .set({ status: "rejected", approvedBy: approverId, approvedAt: new Date() })
        .where(eq(leaveRequests.id, requestId));

    revalidatePath("/dashboard/approvals");
    revalidatePath("/dashboard/leave-requests");
    return { success: "Leave request rejected." };
}
