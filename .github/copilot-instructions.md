# HR Management System — Project Context

## Stack
- Next.js 16 (App Router), TypeScript strict
- Drizzle ORM + PostgreSQL (local via Laragon)
- NextAuth v5 (Credentials provider, JWT strategy, no adapter)
- Tailwind CSS (no component library yet)
- Server Actions for all mutations (no API routes except NextAuth)

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
