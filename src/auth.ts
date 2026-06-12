import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { DefaultSession } from "next-auth";

export type UserRole = "admin" | "hr" | "manager" | "employee";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role: UserRole;
            managerId: number | null;
        } & DefaultSession["user"];
    }

    interface User {
        role: UserRole;
        managerId: number | null;
    }
}

declare module "@auth/core/jwt" {
    interface JWT {
        id: string;
        role: UserRole;
        managerId: number | null;
    }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    session: { strategy: "jwt" },
    pages: {
        signIn: "/login",
    },
    providers: [
        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (
                    typeof credentials?.email !== "string" ||
                    typeof credentials?.password !== "string"
                ) {
                    return null;
                }

                const [employee] = await db
                    .select()
                    .from(employees)
                    .where(eq(employees.email, credentials.email))
                    .limit(1);

                if (!employee) return null;

                const passwordMatch = await compare(
                    credentials.password,
                    employee.passwordHash
                );

                if (!passwordMatch) return null;

                return {
                    id: String(employee.id),
                    name: employee.name,
                    email: employee.email,
                    role: employee.role,
                    managerId: employee.managerId ?? null,
                };
            },
        }),
    ],
    callbacks: {
        jwt({ token, user }) {
            if (user) {
                token.id = user.id as string;
                token.role = user.role;
                token.managerId = user.managerId;
            }
            return token;
        },
        session({ session, token }) {
            session.user.id = token.id;
            session.user.role = token.role;
            session.user.managerId = token.managerId;
            return session;
        },
    },
});
