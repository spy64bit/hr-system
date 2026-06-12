import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { db } from "@/db";
import { employees, leaveRequests } from "@/db/schema";
import { eq, and, ne, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getApprovalScope } from "@/lib/validations/leave";
import ApprovalActions from "@/components/leave/ApprovalActions";

export const metadata: Metadata = {
    title: "Leave Approvals",
};

const LEAVE_TYPE_LABEL: Record<string, string> = {
    annual: "Annual",
    sick: "Sick",
    unpaid: "Unpaid",
    emergency: "Emergency",
};

const ROLE_BADGE: Record<string, string> = {
    admin: "bg-purple-100 text-purple-700",
    hr: "bg-blue-100 text-blue-700",
    manager: "bg-amber-100 text-amber-700",
    employee: "bg-gray-100 text-gray-600",
};

export default async function ApprovalsPage() {
    const session = await requireRole(["admin", "hr", "manager"]);
    const approverId = parseInt(session.user.id);
    const scope = getApprovalScope(session.user.role, approverId);

    const requester = alias(employees, "requester");

    const baseCondition = eq(leaveRequests.status, "pending");

    const whereCondition =
        scope.type === "manager"
            ? and(baseCondition, eq(requester.managerId, scope.managerId))
            : scope.type === "hr"
                ? and(
                    baseCondition,
                    ne(leaveRequests.employeeId, scope.excludeId),
                    inArray(requester.role, [
                        "employee",
                        "manager",
                        "hr",
                    ] as ("admin" | "hr" | "manager" | "employee")[]),
                )
                : baseCondition;

    const rows = await db
        .select({
            id: leaveRequests.id,
            employeeName: requester.name,
            employeeRole: requester.role,
            type: leaveRequests.type,
            startDate: leaveRequests.startDate,
            endDate: leaveRequests.endDate,
            days: leaveRequests.days,
            reason: leaveRequests.reason,
            createdAt: leaveRequests.createdAt,
        })
        .from(leaveRequests)
        .innerJoin(requester, eq(leaveRequests.employeeId, requester.id))
        .where(whereCondition)
        .orderBy(leaveRequests.createdAt);

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-gray-900">Pending Approvals</h1>
                <p className="mt-1 text-sm text-gray-500">
                    {rows.length} pending request{rows.length !== 1 ? "s" : ""}
                </p>
            </div>

            {rows.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
                    <p className="text-sm text-gray-400">No pending approvals.</p>
                </div>
            ) : (
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {[
                                    "Employee",
                                    "Type",
                                    "Start",
                                    "End",
                                    "Days",
                                    "Reason",
                                    "Requested",
                                    "Actions",
                                ].map((h) => (
                                    <th
                                        key={h}
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {rows.map((row) => (
                                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <p className="text-sm font-medium text-gray-900">
                                            {row.employeeName}
                                        </p>
                                        <span
                                            className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${ROLE_BADGE[row.employeeRole] ?? "bg-gray-100 text-gray-600"}`}
                                        >
                                            {row.employeeRole}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900">
                                        {LEAVE_TYPE_LABEL[row.type] ?? row.type}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                        {row.startDate}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                        {row.endDate}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                        {row.days}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500 max-w-50 truncate">
                                        {row.reason ?? (
                                            <span className="text-gray-300">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500">
                                        {row.createdAt.toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <ApprovalActions requestId={row.id} />
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
