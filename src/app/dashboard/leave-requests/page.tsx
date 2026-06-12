import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { employees, leaveRequests } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import LeaveRequestForm from "@/components/leave/LeaveRequestForm";
import CancelButton from "@/components/leave/CancelButton";

const LEAVE_TYPE_LABEL: Record<string, string> = {
    annual: "Annual",
    sick: "Sick",
    unpaid: "Unpaid",
    emergency: "Emergency",
};

const STATUS_BADGE: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
};

export default async function LeaveRequestsPage() {
    const session = await requireAuth();
    const employeeId = parseInt(session.user.id);

    const [emp] = await db
        .select({ annualLeaveBalance: employees.annualLeaveBalance })
        .from(employees)
        .where(eq(employees.id, employeeId))
        .limit(1);

    const approver = alias(employees, "approver");

    const myRequests = await db
        .select({
            id: leaveRequests.id,
            type: leaveRequests.type,
            startDate: leaveRequests.startDate,
            endDate: leaveRequests.endDate,
            days: leaveRequests.days,
            reason: leaveRequests.reason,
            status: leaveRequests.status,
            approvedAt: leaveRequests.approvedAt,
            approverName: approver.name,
            createdAt: leaveRequests.createdAt,
        })
        .from(leaveRequests)
        .leftJoin(approver, eq(leaveRequests.approvedBy, approver.id))
        .where(eq(leaveRequests.employeeId, employeeId))
        .orderBy(desc(leaveRequests.createdAt));

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-gray-900">Leave Requests</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Annual leave balance:{" "}
                    <span className="font-medium text-gray-700">
                        {emp?.annualLeaveBalance ?? 0} day
                        {(emp?.annualLeaveBalance ?? 0) !== 1 ? "s" : ""}
                    </span>
                </p>
            </div>

            {/* Request Leave Form */}
            <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-base font-medium text-gray-900 mb-4">Request Leave</h2>
                <LeaveRequestForm annualLeaveBalance={emp?.annualLeaveBalance ?? 0} />
            </div>

            {/* My Requests */}
            <div>
                <h2 className="text-base font-medium text-gray-900 mb-3">My Requests</h2>
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {[
                                    "Type",
                                    "Start",
                                    "End",
                                    "Days",
                                    "Status",
                                    "Reason",
                                    "Approved By",
                                    "Approved At",
                                    "",
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
                            {myRequests.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="px-4 py-8 text-center text-sm text-gray-400"
                                    >
                                        No leave requests yet.
                                    </td>
                                </tr>
                            ) : (
                                myRequests.map((req) => (
                                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {LEAVE_TYPE_LABEL[req.type] ?? req.type}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {req.startDate}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {req.endDate}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {req.days}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[req.status] ?? "bg-gray-100 text-gray-600"}`}
                                            >
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500 max-w-45 truncate">
                                            {req.reason ?? (
                                                <span className="text-gray-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {req.approverName ?? (
                                                <span className="text-gray-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {req.approvedAt
                                                ? req.approvedAt.toLocaleDateString()
                                                : <span className="text-gray-300">—</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            {req.status === "pending" && (
                                                <CancelButton requestId={req.id} />
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
