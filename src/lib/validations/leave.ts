import { z } from "zod";
import type { UserRole } from "@/auth";

export function calculateLeaveDays(start: Date, end: Date): number {
    let count = 0;
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);
    const endNorm = new Date(end);
    endNorm.setHours(0, 0, 0, 0);
    while (current <= endNorm) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) count++;
        current.setDate(current.getDate() + 1);
    }
    return count;
}

export type ApprovalScope =
    | { type: "all" }
    | { type: "manager"; managerId: number }
    | { type: "hr"; excludeId: number };

export function getApprovalScope(
    approverRole: UserRole,
    approverId: number,
): ApprovalScope {
    if (approverRole === "admin") return { type: "all" };
    if (approverRole === "hr") return { type: "hr", excludeId: approverId };
    if (approverRole === "manager") return { type: "manager", managerId: approverId };
    return { type: "all" };
}

export const createLeaveSchema = z
    .object({
        type: z.enum(["annual", "sick", "unpaid", "emergency"]),
        startDate: z.string().min(1, "Start date is required"),
        endDate: z.string().min(1, "End date is required"),
        reason: z.string().optional(),
    })
    .superRefine((data, ctx) => {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        if (isNaN(start.getTime())) {
            ctx.addIssue({ code: "custom", path: ["startDate"], message: "Invalid start date" });
            return;
        }
        if (isNaN(end.getTime())) {
            ctx.addIssue({ code: "custom", path: ["endDate"], message: "Invalid end date" });
            return;
        }
        if (start > end) {
            ctx.addIssue({
                code: "custom",
                path: ["endDate"],
                message: "End date must be on or after start date",
            });
        }
        if (
            (data.type === "unpaid" || data.type === "emergency") &&
            !data.reason?.trim()
        ) {
            ctx.addIssue({
                code: "custom",
                path: ["reason"],
                message: "Reason is required for unpaid and emergency leave",
            });
        }
    });

export type CreateLeaveInput = z.infer<typeof createLeaveSchema>;
