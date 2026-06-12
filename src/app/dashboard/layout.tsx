import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { UserRole } from "@/auth";
import SidebarUserMenu from "@/components/SidebarUserMenu";

const navItems: {
    href: string;
    label: string;
    allowedRoles: UserRole[];
}[] = [
        {
            href: "/dashboard",
            label: "Dashboard",
            allowedRoles: ["admin", "hr", "manager", "employee"],
        },
        {
            href: "/dashboard/leave-requests",
            label: "Leave Requests",
            allowedRoles: ["admin", "hr", "manager", "employee"],
        },
        {
            href: "/dashboard/ai-assistant",
            label: "AI Assistant",
            allowedRoles: ["admin", "hr", "manager", "employee"],
        },
        {
            href: "/dashboard/payroll/my-payslips",
            label: "My Payslips",
            allowedRoles: ["admin", "hr", "manager", "employee"],
        },
        {
            href: "/dashboard/approvals",
            label: "Approvals",
            allowedRoles: ["admin", "hr", "manager"],
        },
        {
            href: "/dashboard/employees",
            label: "Employees",
            allowedRoles: ["admin", "hr"],
        },
        {
            href: "/dashboard/payroll",
            label: "Payroll",
            allowedRoles: ["admin", "hr"],
        },
    ];

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    if (!session) redirect("/login");

    const role = session.user.role;
    const visibleItems = navItems.filter((item) =>
        item.allowedRoles.includes(role)
    );

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="w-56 shrink-0 border-r border-gray-200 bg-white flex flex-col">
                <div className="px-5 py-5 border-b border-gray-200">
                    <span className="text-sm font-semibold text-gray-900 tracking-tight">
                        HR System
                    </span>
                </div>
                <nav className="flex-1 px-3 py-4 space-y-0.5">
                    {visibleItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>
                <SidebarUserMenu email={session.user.email ?? ""} role={role} />
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-auto">{children}</main>
        </div>
    );
}
