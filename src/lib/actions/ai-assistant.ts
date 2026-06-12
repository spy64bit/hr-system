"use server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { employees, leaveRequests } from "@/db/schema";
import { eq, and, or, lte, gte, ne, inArray } from "drizzle-orm";
import { GoogleGenAI, Type } from "@google/genai";
import { calculateLeaveDays, getApprovalScope } from "@/lib/validations/leave";
import { alias } from "drizzle-orm/pg-core";
import { revalidatePath } from "next/cache";

// In-memory rate limiter: 20 requests/minute per user
const rateLimiter = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const entry = rateLimiter.get(userId);
    if (!entry || now - entry.windowStart > 60_000) {
        rateLimiter.set(userId, { count: 1, windowStart: now });
        return true;
    }
    if (entry.count >= 20) return false;
    entry.count++;
    return true;
}

// ─── Public types ─────────────────────────────────────────────────────────────

export type ParsedAction = {
    action:
    | "check_leave_balance"
    | "request_leave"
    | "check_pending_approvals"
    | "check_employee_info"
    | "unknown";
    confidence: number;
    employeeName?: string;
    matchedEmployeeId?: number;
    leaveRequest?: {
        type: "annual" | "sick" | "unpaid" | "emergency";
        startDate: string; // YYYY-MM-DD
        endDate: string;
        reason?: string;
    };
    unresolved?: string;
};

export type PendingApprovalItem = {
    id: number;
    employeeName: string;
    type: string;
    startDate: string;
    endDate: string;
    days: number;
    reason: string | null;
};

export type QueryResult =
    | { type: "leave_balance"; employeeName: string; balance: number }
    | {
        type: "employee_info";
        employeeName: string;
        department: string;
        position: string;
        role: string;
        email: string;
    }
    | {
        type: "pending_approvals";
        count: number;
        items: PendingApprovalItem[];
    };

export type AIParseResult =
    | {
        success: true;
        parsed: ParsedAction;
        queryResult?: QueryResult;
        leaveDays?: number;
    }
    | { success: false; error: string };

export type ConfirmLeaveResult =
    | { success: true; message: string }
    | { success: false; error: string };

// ─── parseCommand ─────────────────────────────────────────────────────────────

export async function parseCommand(prompt: string): Promise<AIParseResult> {
    const session = await requireAuth();
    const userId = parseInt(session.user.id);
    const userRole = session.user.role;

    if (!checkRateLimit(session.user.id)) {
        return {
            success: false,
            error: "Rate limit exceeded. Please wait a moment before trying again.",
        };
    }

    // Fetch scoped employee list
    const cols = {
        id: employees.id,
        name: employees.name,
        role: employees.role,
        department: employees.department,
    };

    const scopedEmployees =
        userRole === "admin" || userRole === "hr"
            ? await db.select(cols).from(employees).orderBy(employees.name)
            : userRole === "manager"
                ? await db
                    .select(cols)
                    .from(employees)
                    .where(
                        or(
                            eq(employees.id, userId),
                            eq(employees.managerId, userId),
                        ),
                    )
                    .orderBy(employees.name)
                : await db
                    .select(cols)
                    .from(employees)
                    .where(eq(employees.id, userId))
                    .limit(1);

    const scopedIds = new Set(scopedEmployees.map((e) => e.id));

    const [currentEmployee] = await db
        .select({ name: employees.name })
        .from(employees)
        .where(eq(employees.id, userId))
        .limit(1);

    const today = new Date().toISOString().split("T")[0];

    const employeeListStr = scopedEmployees
        .map((e) => `${e.id}|${e.name}|${e.role}|${e.department}`)
        .join("\n");

    const systemPrompt = `You are an HR assistant for a company HR management system.

Today's date is ${today}.

The currently logged-in user is: ${currentEmployee?.name ?? "Unknown"} (ID: ${userId}, Role: ${userRole}).

Available employees you may reference (ID|Name|Role|Department):
${employeeListStr}

Parse the user's natural language input into structured JSON for one of these actions:
- check_leave_balance: Query an employee's annual leave balance. Set employeeName and matchedEmployeeId from the list above.
- request_leave: Submit a leave request for the logged-in user only (ID: ${userId}). Extract type (annual/sick/unpaid/emergency), startDate (YYYY-MM-DD), endDate (YYYY-MM-DD), optional reason.
- check_pending_approvals: List the current user's pending leave approvals to review (manager/hr/admin only).
- check_employee_info: Get an employee's department, position, and role. Set employeeName and matchedEmployeeId.
- unknown: When the request doesn't match, or confidence is below 0.5.

Rules:
- Only use employees from the provided list. If a name is mentioned but not found, set unresolved to the name as typed.
- request_leave is ONLY for the currently logged-in user (ID: ${userId}). Never create leave for another person.
- matchedEmployeeId must be an exact numeric ID from the list — never fabricate it.
- Resolve relative dates ("tomorrow", "next Monday") relative to today (${today}).
- All date fields must be YYYY-MM-DD format.
- Set confidence between 0.0 and 1.0.`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return {
            success: false,
            error: "AI service is not configured. Please set GEMINI_API_KEY.",
        };
    }

    const ai = new GoogleGenAI({ apiKey });

    let rawParsed: Record<string, unknown>;
    try {
        const response = await ai.models.generateContent({
            model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
            contents: prompt,
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        action: {
                            type: Type.STRING,
                            enum: [
                                "check_leave_balance",
                                "request_leave",
                                "check_pending_approvals",
                                "check_employee_info",
                                "unknown",
                            ],
                        },
                        confidence: { type: Type.NUMBER },
                        employeeName: { type: Type.STRING, nullable: true },
                        matchedEmployeeId: {
                            type: Type.NUMBER,
                            nullable: true,
                        },
                        leaveRequest: {
                            type: Type.OBJECT,
                            nullable: true,
                            properties: {
                                type: {
                                    type: Type.STRING,
                                    enum: [
                                        "annual",
                                        "sick",
                                        "unpaid",
                                        "emergency",
                                    ],
                                },
                                startDate: { type: Type.STRING },
                                endDate: { type: Type.STRING },
                                reason: {
                                    type: Type.STRING,
                                    nullable: true,
                                },
                            },
                            propertyOrdering: [
                                "type",
                                "startDate",
                                "endDate",
                                "reason",
                            ],
                        },
                        unresolved: { type: Type.STRING, nullable: true },
                    },
                    propertyOrdering: [
                        "action",
                        "confidence",
                        "employeeName",
                        "matchedEmployeeId",
                        "leaveRequest",
                        "unresolved",
                    ],
                },
            },
        });

        const text = response.text;
        if (!text) return { success: false, error: "No response from AI." };
        rawParsed = JSON.parse(text) as Record<string, unknown>;
    } catch (err) {
        console.error("Gemini API error:", err);
        return {
            success: false,
            error: "Failed to parse your request. Please try again.",
        };
    }

    // Build a validated ParsedAction from the raw AI output
    const validActions = [
        "check_leave_balance",
        "request_leave",
        "check_pending_approvals",
        "check_employee_info",
        "unknown",
    ] as const;
    const rawAction =
        typeof rawParsed.action === "string" ? rawParsed.action : "unknown";
    const action = validActions.includes(
        rawAction as (typeof validActions)[number],
    )
        ? (rawAction as ParsedAction["action"])
        : "unknown";

    const parsed: ParsedAction = {
        action,
        confidence:
            typeof rawParsed.confidence === "number"
                ? Math.max(0, Math.min(1, rawParsed.confidence))
                : 0,
    };

    if (rawParsed.employeeName && typeof rawParsed.employeeName === "string") {
        parsed.employeeName = rawParsed.employeeName;
    }
    if (
        rawParsed.matchedEmployeeId &&
        typeof rawParsed.matchedEmployeeId === "number" &&
        rawParsed.matchedEmployeeId > 0
    ) {
        parsed.matchedEmployeeId = rawParsed.matchedEmployeeId;
    }
    if (rawParsed.unresolved && typeof rawParsed.unresolved === "string") {
        parsed.unresolved = rawParsed.unresolved;
    }

    // Parse leaveRequest sub-object
    const validLeaveTypes = ["annual", "sick", "unpaid", "emergency"] as const;
    if (
        rawParsed.leaveRequest &&
        typeof rawParsed.leaveRequest === "object" &&
        rawParsed.leaveRequest !== null
    ) {
        const lr = rawParsed.leaveRequest as Record<string, unknown>;
        if (
            typeof lr.type === "string" &&
            validLeaveTypes.includes(lr.type as (typeof validLeaveTypes)[number]) &&
            typeof lr.startDate === "string" &&
            typeof lr.endDate === "string"
        ) {
            parsed.leaveRequest = {
                type: lr.type as (typeof validLeaveTypes)[number],
                startDate: lr.startDate,
                endDate: lr.endDate,
            };
            if (lr.reason && typeof lr.reason === "string") {
                parsed.leaveRequest.reason = lr.reason;
            }
        }
    }

    // Security: verify matchedEmployeeId is within the scoped list
    if (
        parsed.matchedEmployeeId !== undefined &&
        !scopedIds.has(parsed.matchedEmployeeId)
    ) {
        parsed.unresolved = parsed.employeeName ?? "Unknown employee";
        delete parsed.matchedEmployeeId;
    }

    // request_leave is always for the currently logged-in user
    if (parsed.action === "request_leave") {
        parsed.matchedEmployeeId = userId;
    }

    // ─── Execute read-only queries immediately ───────────────────────────────

    if (parsed.action === "check_leave_balance") {
        if (parsed.unresolved || !parsed.matchedEmployeeId) {
            if (!parsed.unresolved && parsed.employeeName) {
                parsed.unresolved = parsed.employeeName;
            }
            return { success: true, parsed };
        }
        const [emp] = await db
            .select({
                name: employees.name,
                annualLeaveBalance: employees.annualLeaveBalance,
            })
            .from(employees)
            .where(eq(employees.id, parsed.matchedEmployeeId))
            .limit(1);
        if (!emp) {
            return {
                success: true,
                parsed: {
                    ...parsed,
                    unresolved: parsed.employeeName ?? "Unknown",
                },
            };
        }
        return {
            success: true,
            parsed,
            queryResult: {
                type: "leave_balance",
                employeeName: emp.name,
                balance: emp.annualLeaveBalance,
            },
        };
    }

    if (parsed.action === "check_employee_info") {
        if (parsed.unresolved || !parsed.matchedEmployeeId) {
            return { success: true, parsed };
        }
        const [emp] = await db
            .select({
                name: employees.name,
                department: employees.department,
                position: employees.position,
                role: employees.role,
                email: employees.email,
            })
            .from(employees)
            .where(eq(employees.id, parsed.matchedEmployeeId))
            .limit(1);
        if (!emp) {
            return {
                success: true,
                parsed: {
                    ...parsed,
                    unresolved: parsed.employeeName ?? "Unknown",
                },
            };
        }
        return {
            success: true,
            parsed,
            queryResult: {
                type: "employee_info",
                employeeName: emp.name,
                department: emp.department,
                position: emp.position,
                role: emp.role,
                email: emp.email,
            },
        };
    }

    if (parsed.action === "check_pending_approvals") {
        if (!["admin", "hr", "manager"].includes(userRole)) {
            return { success: true, parsed: { ...parsed, action: "unknown" } };
        }
        const scope = getApprovalScope(userRole, userId);
        const requester = alias(employees, "requester");
        const baseCondition = eq(leaveRequests.status, "pending");
        const whereCondition =
            scope.type === "manager"
                ? and(
                    baseCondition,
                    eq(requester.managerId, scope.managerId),
                )
                : scope.type === "hr"
                    ? and(
                        baseCondition,
                        ne(leaveRequests.employeeId, scope.excludeId),
                        inArray(requester.role, [
                            "employee",
                            "manager",
                            "hr",
                        ] as ("admin" | "hr" | "manager" | "employee")[]),
                    )
                    : baseCondition;

        const rows = await db
            .select({
                id: leaveRequests.id,
                employeeName: requester.name,
                type: leaveRequests.type,
                startDate: leaveRequests.startDate,
                endDate: leaveRequests.endDate,
                days: leaveRequests.days,
                reason: leaveRequests.reason,
            })
            .from(leaveRequests)
            .innerJoin(requester, eq(leaveRequests.employeeId, requester.id))
            .where(whereCondition)
            .orderBy(leaveRequests.createdAt);

        return {
            success: true,
            parsed,
            queryResult: {
                type: "pending_approvals",
                count: rows.length,
                items: rows.map((r) => ({
                    id: r.id,
                    employeeName: r.employeeName,
                    type: r.type,
                    startDate: r.startDate,
                    endDate: r.endDate,
                    days: r.days,
                    reason: r.reason,
                })),
            },
        };
    }

    if (parsed.action === "request_leave") {
        const lr = parsed.leaveRequest;
        if (!lr) {
            return { success: true, parsed: { ...parsed, action: "unknown" } };
        }
        const start = new Date(lr.startDate);
        const end = new Date(lr.endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
            return { success: true, parsed: { ...parsed, action: "unknown" } };
        }
        const leaveDays = calculateLeaveDays(start, end);
        return { success: true, parsed, leaveDays };
    }

    return { success: true, parsed };
}

// ─── confirmLeaveRequest ──────────────────────────────────────────────────────

export async function confirmLeaveRequest(input: {
    type: "annual" | "sick" | "unpaid" | "emergency";
    startDate: string;
    endDate: string;
    reason?: string;
}): Promise<ConfirmLeaveResult> {
    const session = await requireAuth();
    const employeeId = parseInt(session.user.id);

    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        return { success: false, error: "Invalid date range." };
    }

    const days = calculateLeaveDays(start, end);
    if (days === 0) {
        return {
            success: false,
            error: "No working days in the selected range.",
        };
    }

    if (
        (input.type === "unpaid" || input.type === "emergency") &&
        !input.reason?.trim()
    ) {
        return {
            success: false,
            error: "Reason is required for unpaid and emergency leave.",
        };
    }

    // Overlap check
    const [overlapping] = await db
        .select({ id: leaveRequests.id })
        .from(leaveRequests)
        .where(
            and(
                eq(leaveRequests.employeeId, employeeId),
                or(
                    eq(leaveRequests.status, "pending"),
                    eq(leaveRequests.status, "approved"),
                ),
                lte(leaveRequests.startDate, input.endDate),
                gte(leaveRequests.endDate, input.startDate),
            ),
        )
        .limit(1);

    if (overlapping) {
        return {
            success: false,
            error: "You already have a leave request overlapping these dates.",
        };
    }

    // Annual balance check
    if (input.type === "annual") {
        const [emp] = await db
            .select({ annualLeaveBalance: employees.annualLeaveBalance })
            .from(employees)
            .where(eq(employees.id, employeeId))
            .limit(1);
        if (!emp) return { success: false, error: "Employee not found." };
        if (days > emp.annualLeaveBalance) {
            return {
                success: false,
                error: `Insufficient annual leave balance. You have ${emp.annualLeaveBalance} day(s) remaining but requested ${days} day(s).`,
            };
        }
    }

    await db.insert(leaveRequests).values({
        employeeId,
        type: input.type,
        startDate: input.startDate,
        endDate: input.endDate,
        days,
        reason: input.reason?.trim() || null,
        status: "pending",
    });

    revalidatePath("/dashboard/leave-requests");
    return {
        success: true,
        message: `Leave request for ${days} working day(s) submitted successfully.`,
    };
}
