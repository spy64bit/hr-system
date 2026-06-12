import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { alias } from "drizzle-orm/pg-core";
import { eq, or, ilike } from "drizzle-orm";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Employees",
};

const ROLE_BADGE: Record<string, string> = {
    admin: "bg-purple-100 text-purple-700",
    hr: "bg-blue-100 text-blue-700",
    manager: "bg-amber-100 text-amber-700",
    employee: "bg-gray-100 text-gray-600",
};

export default async function EmployeesPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; success?: string }>;
}) {
    await requireRole(["admin", "hr"]);
    const { q, success } = await searchParams;

    const manager = alias(employees, "manager");

    const whereClause =
        q
            ? or(ilike(employees.name, `%${q}%`), ilike(employees.email, `%${q}%`))
            : undefined;

    const rows = await db
        .select({
            id: employees.id,
            name: employees.name,
            email: employees.email,
            role: employees.role,
            department: employees.department,
            position: employees.position,
            joinedAt: employees.joinedAt,
            managerName: manager.name,
        })
        .from(employees)
        .leftJoin(manager, eq(employees.managerId, manager.id))
        .where(whereClause);

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Employees</h1>
                    <p className="mt-1 text-sm text-gray-500">{rows.length} total</p>
                </div>
                <Link
                    href="/dashboard/employees/new"
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                    + Add Employee
                </Link>
            </div>

            {success === "created" && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    Employee created successfully.
                </div>
            )}
            {success === "deleted" && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    Employee deleted successfully.
                </div>
            )}

            {/* Search */}
            <form method="GET" className="mb-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        name="q"
                        defaultValue={q ?? ""}
                        placeholder="Search by name or email…"
                        className="block w-72 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                        type="submit"
                        className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                        Search
                    </button>
                    {q && (
                        <Link
                            href="/dashboard/employees"
                            className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                        >
                            Clear
                        </Link>
                    )}
                </div>
            </form>

            {/* Table */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {["Name", "Email", "Role", "Department", "Position", "Manager", "Joined"].map(
                                (h) => (
                                    <th
                                        key={h}
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide"
                                    >
                                        {h}
                                    </th>
                                )
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {rows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-4 py-8 text-center text-sm text-gray-400"
                                >
                                    No employees found.
                                </td>
                            </tr>
                        ) : (
                            rows.map((row) => (
                                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <Link
                                            href={`/dashboard/employees/${row.id}`}
                                            className="text-sm font-medium text-blue-600 hover:underline"
                                        >
                                            {row.name}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{row.email}</td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ROLE_BADGE[row.role] ?? "bg-gray-100 text-gray-600"}`}
                                        >
                                            {row.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{row.department}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{row.position}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500">
                                        {row.managerName ?? <span className="text-gray-300">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500">{row.joinedAt}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
