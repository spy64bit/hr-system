import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
    const session = await requireAuth();
    redirect(`/dashboard/employees/${session.user.id}`);
}
