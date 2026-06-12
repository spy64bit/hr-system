# HR Management System — Project Context

## Stack
- Next.js 16 (App Router), TypeScript strict
- Drizzle ORM + PostgreSQL (local via Laragon)
- NextAuth v5 (Credentials provider, JWT strategy, no adapter)
- Tailwind CSS (no component library yet)
- Server Actions for all mutations (no API routes except NextAuth)
- `@google/genai` for AI features (NOT deprecated `@google/generative-ai`)

## Database
- src/db/schema.ts — 3 tables: `employees`, `leaveRequests`, `payslips`
- src/db/index.ts — drizzle connection
- Migrations: use `npx drizzle-kit generate` + `npx drizzle-kit migrate` (NOT push)
- Seed: src/db/seed.ts, run via `npm run db:seed`

### Schema notes
- `employees`: id, name, email, passwordHash, role, managerId (self-ref), position, department, baseSalary, annualLeaveBalance (default 14), joinedAt, createdAt, updatedAt
- `leaveRequests`: type enum = `annual | sick | unpaid | emergency`; status enum = `pending | approved | rejected`
- `payslips`: stores epfEmployee, socsoEmployee, eisEmployee, pcb (Malaysian statutory, auto-calculated), plus bonuses and otherDeductions (manual overrides), netSalary; status = `draft | finalized`

## Auth
- src/auth.ts — NextAuth config (Credentials provider, JWT strategy, bcryptjs)
- src/lib/auth.ts — `requireAuth()` returns session or redirects to `/login`; `requireRole(allowedRoles)` calls `requireAuth()` then checks role or redirects to `/dashboard`
- DO NOT use middleware.ts / proxy.ts for auth checks (Next.js 16 deprecated this pattern for security reasons — auth must be in Data Access Layer / route handlers)
- Roles (in priority order): `admin > hr > manager > employee`
- `employees.managerId` is a self-reference (org hierarchy)
- JWT token carries: `id`, `role`, `managerId`

## Leave approval hierarchy
- employee → approved by their manager
- manager → approved by hr/admin
- hr → approved by another hr or admin (not self)
- admin → can approve anything including own (testing convenience)

## Payslips
- Hybrid: auto-calculated fields (EPF, SOCSO, EIS, PCB — Malaysian statutory) + manual overrides (bonuses, otherDeductions)
- status: `draft` → `finalized` (HR reviews before finalizing)

## Conventions
- Server Components by default; Client Components only for forms/interactivity
- src/lib/validations/ — Zod schemas, one file per domain (e.g. `employee.ts`)
- src/lib/actions/ — Server Actions, one file per domain (e.g. `employee.ts`); export `ActionState` type
- Client forms use `useActionState<ActionState, FormData>` (React 19) with `.bind(null, id)` for entity-scoped actions
- bcryptjs for password hashing (cost factor 12)
- No `any` types
- Keep UI minimal Tailwind — no shadcn yet (may add later)
- `params` and `searchParams` in pages must be `await`ed (async in Next.js 16)

## Demo users (seeded, password: `"password"` for all)
- admin@example.com — role: admin, no manager
- hr@example.com — role: hr, reports to admin (Sarah HR)
- manager@example.com — role: manager, reports to admin (Mike Manager), manages Alice & Bob
- alice@example.com — role: employee, reports to manager (Alice Employee)
- bob@example.com — role: employee, reports to manager (Bob Employee)

## Completed features
- **Employee Management** (`/dashboard/employees`)
  - List page with name/email search (admin/hr only)
  - Create form at `/dashboard/employees/new` (admin/hr only)
  - Detail/edit page at `/dashboard/employees/[id]`:
    - admin/hr: full edit + reset password + delete
    - manager: read-only view of their direct reports
    - employee: name-only editable self-profile
  - `/dashboard/profile` → redirects to own employee detail page
  - Zod schemas: `src/lib/validations/employee.ts`
  - Server Actions: `src/lib/actions/employee.ts` (`createEmployee`, `updateEmployee`, `deleteEmployee`, `selfUpdateEmployee`, `resetPassword`)
  - Shared UI components: `src/components/employees/` (`FormField`, `CreateEmployeeForm`, `EditEmployeeForm`, `SelfEditForm`, `ResetPasswordForm`, `DeleteButton`)

- **Leave Requests & Approvals**
  - `/dashboard/leave-requests` — all roles; submit form + table of own requests
    - Leave types: annual / sick / unpaid / emergency
    - Days counted as **working days only** (Mon–Fri, no weekends)
    - Annual leave: validates against `annualLeaveBalance` before inserting
    - Overlap validation: blocks submission if pending/approved request overlaps date range
    - Reason required for `unpaid` and `emergency` types
    - Cancel own pending requests (deletes the row)
    - Status badges: pending=yellow, approved=green, rejected=red
  - `/dashboard/approvals` — manager/hr/admin only; scoped pending requests per hierarchy
    - Approve: sets `approved`, decrements `annualLeaveBalance` in a transaction for annual
    - Reject: sets `rejected`
    - Scope logic: manager sees direct reports; hr sees all except self; admin sees all
  - Zod schemas + helpers: `src/lib/validations/leave.ts`
    - `calculateLeaveDays(start, end)` — working days only
    - `getApprovalScope(approverRole, approverId)` — returns typed scope descriptor
    - `createLeaveSchema` — with cross-field validation
  - Server Actions: `src/lib/actions/leave.ts` (`submitLeaveRequest`, `cancelLeaveRequest`, `approveLeaveRequest`, `rejectLeaveRequest`)
  - Client Components: `src/components/leave/` (`LeaveRequestForm`, `CancelButton`, `ApprovalActions`)

- **Payroll**
  - `/dashboard/payroll` — hr/admin only; month/year selector, generate payslips, inline draft editing, finalize
    - "Generate Payslips" creates draft payslips for all employees not yet covered for that period
    - Draft rows: bonuses and otherDeductions editable inline; saving recalculates netSalary
    - "Finalize" is irreversible — sets status=`finalized` + `finalizedAt`
    - Finalized rows: read-only, no controls
  - `/dashboard/payroll/my-payslips` — all roles; shows own finalized payslips only
  - `/dashboard/payroll/my-payslips/[id]` — read-only payslip breakdown, printable; ownership + finalized check
  - Pure calc fn: `src/lib/payroll.ts` → `calculatePayslip(baseSalary, bonuses?, otherDeductions?)`
    - EPF: 11% of baseSalary
    - SOCSO: 0.5%, capped RM 19.75
    - EIS: 0.2%, capped RM 9.90
    - PCB: tiered (0 / 5% / 10%) — simplified, not legally accurate
    - netSalary = baseSalary + bonuses − EPF − SOCSO − EIS − PCB − otherDeductions
  - Server Actions: `src/lib/actions/payroll.ts` (`generatePayslips`, `updatePayslipAdjustments`, `finalizePayslip`)
  - Client Components: `src/components/payroll/` (`PayrollControls`, `DraftPayslipRow`, `PrintButton`)

- **AI Assistant**
  - `/dashboard/ai-assistant` — all roles; natural language HR commands
  - Uses `@google/genai`: `import { GoogleGenAI, Type } from "@google/genai"`, init with `new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })`
  - Call: `ai.models.generateContent({ model, contents, config: { systemInstruction, responseMimeType: "application/json", responseSchema: {...} } })`
  - `responseSchema` uses `Type` enum (Type.STRING, Type.OBJECT, Type.ARRAY, Type.NUMBER, Type.BOOLEAN); `response.text` returns JSON string
  - Env: `GEMINI_API_KEY` (required), `GEMINI_MODEL` (default `gemini-2.0-flash`)
  - Two-step flow: parse intent → read-only actions execute immediately; `request_leave` shows confirmation card
  - Supported actions: `check_leave_balance`, `check_employee_info`, `check_pending_approvals`, `request_leave`, `unknown`
  - `request_leave` is always scoped to the logged-in user — never creates leave for someone else
  - Employee list injected into system prompt, scoped by role (admin/hr: all; manager: self+reports; employee: self only)
  - `matchedEmployeeId` verified server-side against scoped list before any DB query (security boundary)
  - In-memory rate limiter: 20 req/min per user (Map in server action module)
  - Server Actions: `src/lib/actions/ai-assistant.ts` (`parseCommand`, `confirmLeaveRequest`)
    - `parseCommand` returns `AIParseResult` — includes `queryResult` for read-only actions and `leaveDays` for leave requests
    - `confirmLeaveRequest` runs full Phase 3 validation (overlap, balance, working-days) before insert
  - Client Component: `src/components/ai-assistant/AIChatInterface.tsx`
    - Chat-style UI: user messages right-aligned, AI responses left-aligned
    - Stateless per session (no persistence — page reload clears chat)
    - No streaming, no queues
