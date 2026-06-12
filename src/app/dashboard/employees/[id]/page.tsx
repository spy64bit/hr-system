import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { alias } from "drizzle-orm/pg-core";
import { eq, ne } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import EditEmployeeForm from "@/components/employees/EditEmployeeForm";
import SelfEditForm from "@/components/employees/SelfEditForm";
import ResetPasswordForm from "@/components/employees/ResetPasswordForm";
import DeleteButton from "@/components/employees/DeleteButton";
import type { UserRole } from "@/auth";

const ROLE_BADGE: Record<string, string> = {
    admin: "bg-purple-100 text-purple-700",
    hr: "bg-blue-100 text-blue-700",
    manager: "bg-amber-100 text-amber-700",
    employee: "bg-gray-100 text-gray-600",
};

export default async function EmployeeDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await requireAuth();
    const { id: idParam } = await params;
    const employeeId = parseInt(idParam, 10);

    if (isNaN(employeeId)) notFound();

    const sessionUserId = parseInt(session.user.id, 10);
    const role = session.user.role;

    const manager = alias(employees, "manager");

    const [employee] = await db
        .select({
            id: employees.id,
            name: employees.name,
            email: employees.email,
            role: employees.role,
            managerId: employees.managerId,
            position: employees.position,
            department: employees.department,
            baseSalary: employees.baseSalary,
            annualLeaveBalance: employees.annualLeaveBalance,
            joinedAt: employees.joinedAt,
            managerName: manager.name,
        })
        .from(employees)
        .leftJoin(manager, eq(employees.managerId, manager.id))
        .where(eq(employees.id, employeeId));

    if (!employee) notFound();

    // Access control
    if (role === "employee") {
        if (sessionUserId !== employeeId) redirect("/dashboard");
    } else if (role === "manager") {
        if (employee.managerId !== sessionUserId) redirect("/dashboard");
    }
    // admin and hr: full access

    const isAdminOrHr = role === "admin" || role === "hr";
    const isManager = role === "manager";

    // For admin/hr: load other employees for the manager dropdown
    const otherEmployees =
        isAdminOrHr
            ? await db
                .select({ id: employees.id, name: employees.name })
                .from(employees)
                .where(ne(employees.id, employeeId))
            : [];

    return (
        <div className="p-8 max-w-3xl">
            <div className="mb-6">
                {isAdminOrHr && (
                    <Link
                        href="/dashboard/employees"
                        className="text-sm text-gray-500 hover:text-gray-700"
                    >
                        ← Back to Employees
                    </Link>
                )}
                <div className="mt-2 flex items-center gap-3">
                    <h1 className="text-2xl font-semibold text-gray-900">{employee.name}</h1>
                    <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ROLE_BADGE[employee.role] ?? "bg-gray-100 text-gray-600"}`}
                    >
                        {employee.role}
                    </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">{employee.email}</p>
            </div>

            {/* Admin / HR: full edit form */}
            {isAdminOrHr && (
                <>
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mb-6">
                        <h2 className="text-base font-semibold text-gray-800 mb-5">Edit Details</h2>
                        <EditEmployeeForm
                            employee={{
                                id: employee.id,
                                name: employee.name,
                                email: employee.email,
                                role: employee.role as UserRole,
                                managerId: employee.managerId ?? null,
                                position: employee.position,
                                department: employee.department,
                                baseSalary: employee.baseSalary,
                                annualLeaveBalance: employee.annualLeaveBalance,
                                joinedAt: employee.joinedAt,
                            }}
                            managers={otherEmployees}
                            sessionRole={role}
                        />
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mb-6">
                        <h2 className="text-base font-semibold text-gray-800 mb-4">Reset Password</h2>
                        <ResetPasswordForm employeeId={employee.id} />
                    </div>

                    <div className="rounded-xl border border-red-100 bg-red-50 p-6">
                        <h2 className="text-base font-semibold text-red-800 mb-2">Danger Zone</h2>
                        <p className="text-sm text-red-600 mb-4">
                            Permanently delete this employee. This action cannot be undone.
                        </p>
                        <DeleteButton employeeId={employee.id} />
                    </div>
                </>
            )}

            {/* Manager: read-only view of direct report */}
            {isManager && (
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-base font-semibold text-gray-800 mb-5">Employee Details</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {[
                            { label: "Email", value: employee.email },
                            { label: "Role", value: employee.role },
                            { label: "Department", value: employee.department },
                            { label: "Position", value: employee.position },
                            { label: "Manager", value: employee.managerName ?? "—" },
                            { label: "Join Date", value: employee.joinedAt },
                            { label: "Leave Balance", value: `${employee.annualLeaveBalance} days` },
                        ].map(({ label, value }) => (
                            <div key={label}>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                    {label}
                                </p>
                                <p className="text-sm text-gray-900 capitalize">{value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Employee: self-service — name editable, rest read-only */}
            {role === "employee" && (
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-base font-semibold text-gray-800 mb-5">My Profile</h2>
                    <SelfEditForm
                        name={employee.name}
                        email={employee.email}
                        role={employee.role}
                        department={employee.department}
                        position={employee.position}
                        joinedAt={employee.joinedAt}
                    />
                </div>
            )}
        </div>
    );
}
