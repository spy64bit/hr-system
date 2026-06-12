"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const DEMO_ACCOUNTS = [
    { label: "Admin", email: "admin@example.com" },
    { label: "HR", email: "hr@example.com" },
    { label: "Manager", email: "manager@example.com" },
    { label: "Employee (Alice)", email: "alice@example.com" },
    { label: "Employee (Bob)", email: "bob@example.com" },
];

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    function fillDemo(demoEmail: string) {
        setEmail(demoEmail);
        setPassword("password");
        setError(null);
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        setLoading(false);

        if (result?.error) {
            setError("Invalid email or password.");
        } else {
            router.push("/dashboard");
            router.refresh();
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-full max-w-sm space-y-4">
                {/* Demo accounts card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-4 py-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Demo Accounts
                    </p>
                    <div className="flex flex-col gap-0.5">
                        {DEMO_ACCOUNTS.map((account) => (
                            <button
                                key={account.email}
                                type="button"
                                onClick={() => fillDemo(account.email)}
                                className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-50 transition group"
                            >
                                <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
                                    {account.label}
                                </span>
                                <span className="text-xs text-gray-400">
                                    {account.email}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Login form card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                    <div className="mb-8 text-center">
                        <h1 className="text-2xl font-semibold text-gray-900">HR System</h1>
                        <p className="mt-1 text-sm text-gray-500">Sign in to your account</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-gray-700 mb-1.5"
                            >
                                Email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                placeholder="you@company.com"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-gray-700 mb-1.5"
                            >
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                placeholder="••••••••"
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition"
                        >
                            {loading ? "Signing in…" : "Sign in"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
