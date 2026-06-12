import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { UserRole } from "@/auth";

export async function requireAuth() {
    const session = await auth();
    if (!session) redirect("/login");
    return session;
}

export async function requireRole(allowedRoles: UserRole[]) {
    const session = await requireAuth();
    if (!allowedRoles.includes(session.user.role)) redirect("/dashboard");
    return session;
}
