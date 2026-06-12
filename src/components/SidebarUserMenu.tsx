"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";

interface SidebarUserMenuProps {
    email: string;
    role: string;
}

export default function SidebarUserMenu({ email, role }: SidebarUserMenuProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={ref} className="relative px-3 py-3 border-t border-gray-200">
            <button
                onClick={() => setOpen((prev) => !prev)}
                className="w-full flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-gray-100 transition-colors text-left"
            >
                <div className="shrink-0 w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 uppercase">
                    {email.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{email}</p>
                    <p className="text-xs text-gray-400 capitalize">{role}</p>
                </div>
                <svg
                    className={`shrink-0 w-3.5 h-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                    />
                </svg>
            </button>

            {open && (
                <div className="absolute bottom-full left-3 right-3 mb-1 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-50">
                    <Link
                        href="/dashboard/profile"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        <svg className="w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
                        </svg>
                        Profile
                    </Link>
                    <div className="h-px bg-gray-100 mx-2 my-1" />
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                            <path
                                fillRule="evenodd"
                                d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z"
                                clipRule="evenodd"
                            />
                            <path
                                fillRule="evenodd"
                                d="M6 10a.75.75 0 01.75-.75h9.546l-1.048-.943a.75.75 0 111.004-1.114l2.5 2.25a.75.75 0 010 1.114l-2.5 2.25a.75.75 0 11-1.004-1.114l1.048-.943H6.75A.75.75 0 016 10z"
                                clipRule="evenodd"
                            />
                        </svg>
                        Sign out
                    </button>
                </div>
            )}
        </div>
    );
}
