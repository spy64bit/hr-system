"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import {
    parseCommand,
    confirmLeaveRequest,
} from "@/lib/actions/ai-assistant";
import type {
    AIParseResult,
    ConfirmLeaveResult,
    QueryResult,
    ParsedAction,
} from "@/lib/actions/ai-assistant";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserMessage = { kind: "user"; text: string };

type AIMessage = {
    kind: "ai";
    result: AIParseResult;
    leaveDays?: number;
    /** null = not a leave request; pending/confirming/done for leave confirmations */
    confirmStatus: "pending" | "confirming" | "done" | null;
    confirmResult?: ConfirmLeaveResult;
};

type Message = UserMessage | AIMessage;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LEAVE_TYPE_LABEL: Record<string, string> = {
    annual: "Annual",
    sick: "Sick",
    unpaid: "Unpaid",
    emergency: "Emergency",
};

const ROLE_LABEL: Record<string, string> = {
    admin: "Admin",
    hr: "HR",
    manager: "Manager",
    employee: "Employee",
};

function formatDate(dateStr: string): string {
    try {
        return new Date(dateStr + "T00:00:00").toLocaleDateString("en-MY", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    } catch {
        return dateStr;
    }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LeaveBalanceResult({ qr }: { qr: Extract<QueryResult, { type: "leave_balance" }> }) {
    return (
        <p className="text-sm text-gray-700">
            <span className="font-medium">{qr.employeeName}</span> has{" "}
            <span className="font-semibold text-emerald-700">{qr.balance}</span>{" "}
            annual leave day{qr.balance !== 1 ? "s" : ""} remaining.
        </p>
    );
}

function EmployeeInfoResult({ qr }: { qr: Extract<QueryResult, { type: "employee_info" }> }) {
    const rows: [string, string][] = [
        ["Department", qr.department],
        ["Position", qr.position],
        ["Role", ROLE_LABEL[qr.role] ?? qr.role],
        ["Email", qr.email],
    ];
    return (
        <div className="text-sm space-y-2.5">
            <p className="font-medium text-gray-900">{qr.employeeName}</p>
            <dl className="space-y-1">
                {rows.map(([label, value]) => (
                    <div key={label} className="flex gap-3">
                        <dt className="text-gray-500 w-24 shrink-0">{label}</dt>
                        <dd className="text-gray-900 font-medium break-all">{value}</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

function PendingApprovalsResult({
    qr,
}: {
    qr: Extract<QueryResult, { type: "pending_approvals" }>;
}) {
    return (
        <div className="text-sm space-y-3">
            <p className="font-medium text-gray-900">
                {qr.count === 0
                    ? "No pending approvals."
                    : `${qr.count} pending approval${qr.count !== 1 ? "s" : ""}:`}
            </p>
            {qr.count > 0 && (
                <ul className="space-y-2">
                    {qr.items.map((item) => (
                        <li
                            key={item.id}
                            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 space-y-0.5"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-gray-900 truncate">
                                    {item.employeeName}
                                </span>
                                <span className="shrink-0 text-xs text-gray-500 bg-white border border-gray-200 rounded px-1.5 py-0.5">
                                    {LEAVE_TYPE_LABEL[item.type] ?? item.type}
                                </span>
                            </div>
                            <p className="text-gray-600 text-xs">
                                {formatDate(item.startDate)} –{" "}
                                {formatDate(item.endDate)} ({item.days} day
                                {item.days !== 1 ? "s" : ""})
                            </p>
                            {item.reason && (
                                <p className="text-gray-500 text-xs italic">
                                    &ldquo;{item.reason}&rdquo;
                                </p>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function LeaveConfirmCard({
    lr,
    leaveDays,
    confirmStatus,
    confirmResult,
    onConfirm,
    onCancel,
}: {
    lr: NonNullable<ParsedAction["leaveRequest"]>;
    leaveDays?: number;
    confirmStatus: "pending" | "confirming" | "done" | null;
    confirmResult?: ConfirmLeaveResult;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    if (confirmStatus === "done" && confirmResult) {
        return confirmResult.success ? (
            <p className="text-sm text-emerald-700">
                ✓ {confirmResult.message}
            </p>
        ) : (
            <p className="text-sm text-gray-600">{confirmResult.error}</p>
        );
    }

    const rows: [string, string][] = [
        ["Type", LEAVE_TYPE_LABEL[lr.type] ?? lr.type],
        ["From", formatDate(lr.startDate)],
        ["To", formatDate(lr.endDate)],
        ["Working days", leaveDays != null ? String(leaveDays) : "—"],
        ...(lr.reason ? [["Reason", lr.reason] as [string, string]] : []),
    ];

    const isConfirming = confirmStatus === "confirming";

    return (
        <div className="text-sm space-y-3">
            <p className="font-medium text-gray-900">Leave Request Details</p>
            <dl className="space-y-1">
                {rows.map(([label, value]) => (
                    <div key={label} className="flex gap-3">
                        <dt className="text-gray-500 w-24 shrink-0">{label}</dt>
                        <dd className="text-gray-900 font-medium">{value}</dd>
                    </div>
                ))}
            </dl>
            {(confirmStatus === "pending" || isConfirming) && (
                <div className="flex gap-2 pt-1">
                    <button
                        onClick={onConfirm}
                        disabled={isConfirming}
                        className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                        {isConfirming ? "Submitting…" : "Confirm"}
                    </button>
                    <button
                        onClick={onCancel}
                        disabled={isConfirming}
                        className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            )}
        </div>
    );
}

function UnknownResult({ unresolved }: { unresolved?: string }) {
    if (unresolved) {
        return (
            <p className="text-sm text-gray-700">
                I couldn&apos;t find an employee named{" "}
                <span className="font-medium">&ldquo;{unresolved}&rdquo;</span>.
                Please check the name and try again.
            </p>
        );
    }
    return (
        <div className="text-sm text-gray-700 space-y-2">
            <p>
                I couldn&apos;t understand that. I can help you with:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 text-xs">
                <li>Leave balances — &ldquo;How many leave days does Alice have?&rdquo;</li>
                <li>
                    Requesting leave —{" "}
                    &ldquo;Request sick leave from 2026-07-01 to 2026-07-02&rdquo;
                </li>
                <li>Pending approvals — &ldquo;Show my pending approvals&rdquo;</li>
                <li>Employee info — &ldquo;What is Bob&apos;s department?&rdquo;</li>
            </ul>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AIChatInterface() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isParsing, startParsing] = useTransition();
    const bottomRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isParsing]);

    // Auto-resize textarea
    useEffect(() => {
        const el = textareaRef.current;
        if (el) {
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
        }
    }, [input]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const text = input.trim();
        if (!text || isParsing) return;
        setInput("");

        setMessages((prev) => [...prev, { kind: "user", text }]);

        startParsing(async () => {
            const result = await parseCommand(text);
            const isLeaveRequest =
                result.success &&
                result.parsed.action === "request_leave" &&
                !!result.parsed.leaveRequest &&
                !result.parsed.unresolved;

            setMessages((prev) => [
                ...prev,
                {
                    kind: "ai",
                    result,
                    leaveDays: result.success ? result.leaveDays : undefined,
                    confirmStatus: isLeaveRequest ? "pending" : null,
                },
            ]);
        });
    }

    async function handleConfirm(msgIndex: number) {
        const msg = messages[msgIndex];
        if (
            msg.kind !== "ai" ||
            !msg.result.success ||
            msg.result.parsed.action !== "request_leave" ||
            !msg.result.parsed.leaveRequest
        )
            return;

        const lr = msg.result.parsed.leaveRequest;

        setMessages((prev) =>
            prev.map((m, i) =>
                i === msgIndex
                    ? { ...m, confirmStatus: "confirming" as const }
                    : m,
            ),
        );

        const result = await confirmLeaveRequest({
            type: lr.type,
            startDate: lr.startDate,
            endDate: lr.endDate,
            reason: lr.reason,
        });

        setMessages((prev) =>
            prev.map((m, i) =>
                i === msgIndex
                    ? {
                        ...m,
                        confirmStatus: "done" as const,
                        confirmResult: result,
                    }
                    : m,
            ),
        );
    }

    function handleCancel(msgIndex: number) {
        setMessages((prev) =>
            prev.map((m, i) =>
                i === msgIndex
                    ? {
                        ...m,
                        confirmStatus: "done" as const,
                        confirmResult: {
                            success: false as const,
                            error: "Request cancelled.",
                        },
                    }
                    : m,
            ),
        );
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e as unknown as React.FormEvent);
        }
    }

    function renderAIContent(msg: AIMessage, index: number) {
        const { result, leaveDays, confirmStatus, confirmResult } = msg;

        if (!result.success) {
            return (
                <p className="text-sm text-red-600">{result.error}</p>
            );
        }

        const { parsed, queryResult } = result;

        // Employee name couldn't be resolved
        if (
            parsed.unresolved &&
            parsed.action !== "unknown"
        ) {
            return <UnknownResult unresolved={parsed.unresolved} />;
        }

        // Unknown or low-confidence action
        if (parsed.action === "unknown" || parsed.confidence < 0.5) {
            return <UnknownResult />;
        }

        // Read-only query results
        if (queryResult?.type === "leave_balance") {
            return <LeaveBalanceResult qr={queryResult} />;
        }
        if (queryResult?.type === "employee_info") {
            return <EmployeeInfoResult qr={queryResult} />;
        }
        if (queryResult?.type === "pending_approvals") {
            return <PendingApprovalsResult qr={queryResult} />;
        }

        // Leave request confirmation card
        if (parsed.action === "request_leave" && parsed.leaveRequest) {
            return (
                <LeaveConfirmCard
                    lr={parsed.leaveRequest}
                    leaveDays={leaveDays}
                    confirmStatus={confirmStatus}
                    confirmResult={confirmResult}
                    onConfirm={() => handleConfirm(index)}
                    onCancel={() => handleCancel(index)}
                />
            );
        }

        return <UnknownResult />;
    }

    return (
        <div className="flex flex-col flex-1 min-h-0">
            {/* Messages */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 && !isParsing && (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                            <svg
                                className="w-6 h-6 text-indigo-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                                />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-700">
                                How can I help you today?
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                                Ask about leave balances, employee info, or
                                submit a leave request.
                            </p>
                        </div>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`flex ${msg.kind === "user" ? "justify-end" : "justify-start"}`}
                    >
                        {msg.kind === "user" ? (
                            <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-indigo-600 px-4 py-2.5">
                                <p className="text-sm text-white whitespace-pre-wrap">
                                    {msg.text}
                                </p>
                            </div>
                        ) : (
                            <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-gray-200 bg-white px-4 py-3 shadow-sm">
                                {renderAIContent(msg, i)}
                            </div>
                        )}
                    </div>
                ))}

                {/* Typing indicator */}
                {isParsing && (
                    <div className="flex justify-start">
                        <div className="rounded-2xl rounded-tl-sm border border-gray-200 bg-white px-4 py-3.5 shadow-sm">
                            <div className="flex gap-1 items-center">
                                {[0, 150, 300].map((delay) => (
                                    <div
                                        key={delay}
                                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                        style={{ animationDelay: `${delay}ms` }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-4">
                <form
                    onSubmit={handleSubmit}
                    className="flex gap-3 items-end"
                >
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask me anything about HR…"
                        rows={1}
                        disabled={isParsing}
                        className="flex-1 resize-none rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 transition-shadow"
                    />
                    <button
                        type="submit"
                        disabled={isParsing || !input.trim()}
                        className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        Send
                    </button>
                </form>
                <p className="mt-2 text-xs text-gray-400">
                    Enter to send · Shift+Enter for new line · 20 requests/min
                </p>
            </div>
        </div>
    );
}
