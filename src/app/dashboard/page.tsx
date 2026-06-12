import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/SignOutButton";

export const metadata: Metadata = {
    title: "Dashboard",
};

export default async function DashboardPage() {
    const session = await auth();
    if (!session) redirect("/login");

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Welcome, {session.user.name}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 capitalize">
                        Role: {session.user.role}
                    </p>
                </div>
                <SignOutButton />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="mt-1 text-lg font-medium text-gray-900">Active</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <p className="text-sm text-gray-500">Role</p>
                    <p className="mt-1 text-lg font-medium text-gray-900 capitalize">
                        {session.user.role}
                    </p>
                </div>
            </div>
        </div>
    );
}
