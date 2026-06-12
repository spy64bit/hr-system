import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { employees, leaveRequests, payslips } from "@/db/schema";
import { eq, and, ne, inArray, desc, count } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getApprovalScope } from "@/lib/validations/leave";
import SignOutButton from "@/components/SignOutButton";

export const metadata: Metadata = {
    title: "Dashboard",
};

const STATUS_BADGE: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
};

const LEAVE_TYPE_LABEL: Record<string, string> = {
    annual: "Annual",
    sick: "Sick",
    unpaid: "Unpaid",
    emergency: "Emergency",
};

export default async function DashboardPage() {
    const session = await auth();
    if (!session) redirect("/login");

    const userId = parseInt(session.user.id);
    const role = session.user.role;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Queries common to all roles
    const [[empRow], [pendingCountRow], recentLeaves] = await Promise.all([
        db
            .select({ annualLeaveBalance: employees.annualLeaveBalance })
            .from(employees)
            .where(eq(employees.id, userId))
            .limit(1),
        db
            .select({ value: count() })
            .from(leaveRequests)
            .where(
                and(
                    eq(leaveRequests.employeeId, userId),
                    eq(leaveRequests.status, "pending"),
                ),
            ),
        db
            .select({
                id: leaveRequests.id,
                type: leaveRequests.type,
                startDate: leaveRequests.startDate,
                endDate: leaveRequests.endDate,
                status: leaveRequests.status,
                createdAt: leaveRequests.createdAt,
            })
            .from(leaveRequests)
            .where(eq(leaveRequests.employeeId, userId))
            .orderBy(desc(leaveRequests.createdAt))
            .limit(5),
    ]);

    // Role-gated queries
    let pendingApprovalsCount = 0;
    let totalEmployeesCount = 0;
    let draftPayslipsCount = 0;

    if (role === "manager" || role === "hr" || role === "admin") {
        const scope = getApprovalScope(role, userId);
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

        const [approvalRow] = await db
            .select({ value: count() })
            .from(leaveRequests)
            .innerJoin(requester, eq(leaveRequests.employeeId, requester.id))
            .where(whereCondition);
        pendingApprovalsCount = approvalRow?.value ?? 0;
    }

    if (role === "hr" || role === "admin") {
        const [[empCountRow], [draftRow]] = await Promise.all([
            db.select({ value: count() }).from(employees),
            db
                .select({ value: count() })
                .from(payslips)
                .where(
                    and(
                        eq(payslips.status, "draft"),
                        eq(payslips.month, currentMonth),
                        eq(payslips.year, currentYear),
                    ),
                ),
        ]);
        totalEmployeesCount = empCountRow?.value ?? 0;
        draftPayslipsCount = draftRow?.value ?? 0;
    }

    const leaveBalance = empRow?.annualLeaveBalance ?? 0;
    const myPendingCount = pendingCountRow?.value ?? 0;

    // Grid column class — must be static strings for Tailwind to include them
    const gridCols =
        role === "hr" || role === "admin"
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            : role === "manager"
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                : "grid-cols-1 sm:grid-cols-2";

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Welcome, {session.user.name}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 capitalize">
                        Role: {role}
                    </p>
                </div>
                <SignOutButton />
            </div>

            {/* Summary cards */}
            <div className={`grid ${gridCols} gap-4 mb-8`}>
                {/* Leave Balance — all roles */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <p className="text-sm text-gray-500">Annual Leave Balance</p>
                    <p className="mt-1 text-3xl font-bold text-gray-900">{leaveBalance}</p>
                    <p className="mt-1 text-xs text-gray-400">days remaining</p>
                </div>

                {/* My Pending Requests — all roles */}
                <Link
                    href="/dashboard/leave-requests"
                    className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                    <p className="text-sm text-gray-500">My Pending Requests</p>
                    <p className="mt-1 text-3xl font-bold text-yellow-600">{myPendingCount}</p>
                    <p className="mt-1 text-xs text-gray-400">awaiting decision</p>
                </Link>

                {/* Pending Approvals — manager / hr / admin */}
                {(role === "manager" || role === "hr" || role === "admin") && (
                    <Link
                        href="/dashboard/approvals"
                        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                        <p className="text-sm text-gray-500">Pending Approvals</p>
                        <p className="mt-1 text-3xl font-bold text-blue-600">
                            {pendingApprovalsCount}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">requests to review</p>
                    </Link>
                )}

                {/* Total Employees — hr / admin */}
                {(role === "hr" || role === "admin") && (
                    <Link
                        href="/dashboard/employees"
                        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                        <p className="text-sm text-gray-500">Total Employees</p>
                        <p className="mt-1 text-3xl font-bold text-gray-900">
                            {totalEmployeesCount}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">in the system</p>
                    </Link>
                )}

                {/* Draft Payslips — hr / admin */}
                {(role === "hr" || role === "admin") && (
                    <Link
                        href="/dashboard/payroll"
                        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                        <p className="text-sm text-gray-500">Draft Payslips</p>
                        <p className="mt-1 text-3xl font-bold text-orange-600">
                            {draftPayslipsCount}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                            {now.toLocaleString("default", { month: "long" })} {currentYear}
                        </p>
                    </Link>
                )}
            </div>

            {/* Recent Activity */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Recent Leave Requests
                </h2>
                {recentLeaves.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center shadow-sm">
                        <p className="text-sm text-gray-400">No leave requests yet.</p>
                    </div>
                ) : (
                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Type
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Start
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        End
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Submitted
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {recentLeaves.map((leave) => (
                                    <tr key={leave.id}>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {LEAVE_TYPE_LABEL[leave.type] ?? leave.type}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {leave.startDate}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {leave.endDate}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[leave.status]}`}
                                            >
                                                {leave.status.charAt(0).toUpperCase() +
                                                    leave.status.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {leave.createdAt.toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
