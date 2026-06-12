# HR Management System

## Project Overview

A full-stack HR management system built with Next.js 16 (App Router), TypeScript, Drizzle ORM, and PostgreSQL. It covers the core HR workflows a small-to-medium company would need: employee records and org hierarchy, leave requests with role-based approval routing, payroll with Malaysian statutory deductions (EPF/SOCSO/EIS/PCB), and an AI Assistant powered by Google Gemini for natural-language HR queries.

Built as a companion piece to [my Laravel inventory management system](https://github.com/), demonstrating the same architectural patterns — role-based auth, AI-assisted natural language actions, and two-step confirm-before-execute flows — in a different stack (Node.js/Next.js instead of PHP/Laravel).

---

## Features

- **Auth & Roles** — NextAuth v5 (Credentials provider, JWT strategy), 4-tier role hierarchy: `admin > hr > manager > employee`
- **Employee Management** — Full CRUD with org hierarchy (self-referencing `managerId`), role-scoped access (admin/HR can edit all; managers see their direct reports; employees edit only their own profile)
- **Leave Requests & Approvals** — Working-days-only day calculation, overlap detection to prevent double-booking, leave type validation (reason required for `unpaid`/`emergency`), hierarchy-based approval routing (employee → manager → hr/admin)
- **Payroll** — Auto-calculated statutory deductions (EPF 11%, SOCSO 0.5% capped RM 19.75, EIS 0.2% capped RM 9.90, PCB tiered) with manual bonus/deduction overrides; draft → finalized workflow prevents post-finalization edits
- **AI Assistant** — Natural-language HR commands via Gemini structured output; read-only queries execute immediately, mutations (e.g. submit leave) require explicit user confirmation

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions) |
| Language | TypeScript (strict) |
| Database | PostgreSQL + Drizzle ORM |
| Auth | NextAuth v5 (Credentials provider, JWT) |
| AI | Google Gemini (`@google/genai`) |
| Styling | Tailwind CSS |

---

## Setup — Development

### Prerequisites

- Node.js 20+
- PostgreSQL (e.g. [Laragon](https://laragon.org/) on Windows includes a built-in PostgreSQL server)

### Steps

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd hr-system
   npm install
   ```

2. **Create a PostgreSQL database**

   Using Laragon: start the PostgreSQL service, then create a database named `hr_system` via HeidiSQL or `psql`.

3. **Configure environment variables**

   ```bash
   copy .env.example .env.local
   ```

   Fill in `.env.local`:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | `postgresql://username:password@localhost:5432/hr_system` |
   | `NEXTAUTH_SECRET` | Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
   | `NEXTAUTH_URL` | `http://localhost:3000` |
   | `GEMINI_API_KEY` | Your Google Gemini API key |
   | `GEMINI_MODEL` | `gemini-2.0-flash` (or leave as-is from `.env.example`) |

4. **Run database migrations**
   ```bash
   npx drizzle-kit generate
   npx drizzle-kit migrate
   ```

5. **Seed the database**
   ```bash
   npm run db:seed
   ```

6. **Start the dev server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

### Demo credentials (password: `password` for all)

| Email | Role |
|---|---|
| admin@example.com | admin |
| hr@example.com | hr |
| manager@example.com | manager |
| alice@example.com | employee |
| bob@example.com | employee |

---

## Setup — Production

These steps assume an Ubuntu VPS with Nginx (similar deployment to a Node.js app, unlike PHP-FPM setups where the web server handles PHP directly).

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd hr-system
   npm install --omit=dev
   ```

2. **Set up PostgreSQL** on the VPS and create a dedicated database and user.

3. **Configure `.env.local`** with production values:
   - `NEXTAUTH_URL` = your production domain (e.g. `https://hr.yourdomain.com`)
   - `NEXTAUTH_SECRET` = a strong, unique random string (do **not** reuse the dev secret)
   - `GEMINI_API_KEY` = your real Gemini API key

4. **Run migrations** (skip seed in production unless you want demo data):
   ```bash
   npx drizzle-kit migrate
   ```

5. **Build the app**
   ```bash
   npm run build
   ```

6. **Run with PM2** (keeps the process alive and restarts on crash/reboot):
   ```bash
   pm2 start npm --name "hr-system" -- start
   pm2 save
   pm2 startup
   ```

   > Unlike PHP-FPM setups, Next.js requires a persistent Node.js process. PM2 manages this and ensures the app restarts automatically.

7. **Configure Nginx** as a reverse proxy to port 3000, with SSL via Cloudflare or Certbot:
   ```nginx
   server {
       listen 80;
       server_name hr.yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

## Architecture Decisions

- **Working-days-only leave calculation** — `calculateLeaveDays()` in `src/lib/validations/leave.ts` iterates day-by-day and skips Saturdays (`getDay() === 6`) and Sundays (`getDay() === 0`), so a leave request spanning a weekend costs fewer days than calendar days would suggest.

- **Overlap validation** — Before inserting a new leave request, the server action queries for any existing `pending` or `approved` requests for the same employee whose date range overlaps the requested range. This prevents double-booking without any cron job or scheduled cleanup.

- **Self-referencing foreign key for org hierarchy** — `employees.managerId` references `employees.id` on the same table (using Drizzle's `AnyPgColumn` type to handle the circular reference). This single column powers the entire approval routing: managers see their `managerId`-matched direct reports; HR sees everyone except themselves; admins see all.

- **Hybrid payroll: auto statutory + manual overrides, draft → finalized** — `calculatePayslip()` always auto-computes EPF/SOCSO/EIS/PCB from `baseSalary`. HR can then add `bonuses` and `otherDeductions` on the draft before finalizing. Once `status = 'finalized'`, the row becomes read-only in the UI and `finalizedAt` is set — preventing retroactive edits to issued payslips.

- **AI two-step flow** — `parseCommand` (Server Action) calls Gemini with structured output to parse intent and fetch any required data (e.g. leave balance). Read-only actions (`check_leave_balance`, `check_employee_info`, `check_pending_approvals`) return their result immediately. The `request_leave` action returns a confirmation card; the user must explicitly confirm before `confirmLeaveRequest` runs the full Phase 3 validation (overlap, balance, working-days) and inserts the row. This prevents the AI from silently mutating data.

- **Auth in the Data Access Layer, not middleware** — `src/proxy.ts` (the Next.js middleware file) is present but is **not** the primary auth enforcement point. Per Next.js 16 security guidance, auth checks live in the DAL: every Server Action and Server Component calls `requireAuth()` or `requireRole()` from `src/lib/auth.ts` directly. This ensures auth is enforced even for direct Server Action invocations that bypass the middleware layer.
