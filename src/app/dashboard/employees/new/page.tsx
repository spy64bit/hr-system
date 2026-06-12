import { requireRole } from "@/lib/auth";
import { db } from "@/db";
import { employees } from "@/db/schema";
import Link from "next/link";
import CreateEmployeeForm from "@/components/employees/CreateEmployeeForm";

export default async function NewEmployeePage() {
    const session = await requireRole(["admin", "hr"]);

    const managers = await db
        .select({ id: employees.id, name: employees.name })
        .from(employees);

    return (
        <div className="p-8 max-w-3xl">
            <div className="mb-6">
                <Link
                    href="/dashboard/employees"
                    className="text-sm text-gray-500 hover:text-gray-700"
                >
                    ← Back to Employees
                </Link>
                <h1 className="mt-2 text-2xl font-semibold text-gray-900">Add Employee</h1>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <CreateEmployeeForm
                    managers={managers}
                    sessionRole={session.user.role}
                />
            </div>
        </div>
    );
}
