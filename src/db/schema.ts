import { pgTable, serial, text, integer, numeric, date, timestamp, pgEnum, AnyPgColumn } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['admin', 'hr', 'manager', 'employee']);
export const leaveStatusEnum = pgEnum('leave_status', ['pending', 'approved', 'rejected']);
export const leaveTypeEnum = pgEnum('leave_type', ['annual', 'sick', 'unpaid', 'emergency']);
export const payslipStatusEnum = pgEnum('payslip_status', ['draft', 'finalized']);

export const employees = pgTable('employees', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: roleEnum('role').notNull().default('employee'),
    managerId: integer('manager_id').references((): AnyPgColumn => employees.id),
    position: text('position').notNull(),
    department: text('department').notNull(),
    baseSalary: numeric('base_salary', { precision: 10, scale: 2 }).notNull(),
    annualLeaveBalance: integer('annual_leave_balance').notNull().default(14),
    joinedAt: date('joined_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const leaveRequests = pgTable('leave_requests', {
    id: serial('id').primaryKey(),
    employeeId: integer('employee_id').notNull().references(() => employees.id),
    type: leaveTypeEnum('type').notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    days: integer('days').notNull(),
    reason: text('reason'),
    status: leaveStatusEnum('status').notNull().default('pending'),
    approvedBy: integer('approved_by').references(() => employees.id),
    approvedAt: timestamp('approved_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const payslips = pgTable('payslips', {
    id: serial('id').primaryKey(),
    employeeId: integer('employee_id').notNull().references(() => employees.id),
    month: integer('month').notNull(),
    year: integer('year').notNull(),
    baseSalary: numeric('base_salary', { precision: 10, scale: 2 }).notNull(),
    epfEmployee: numeric('epf_employee', { precision: 10, scale: 2 }).notNull().default('0'),
    socsoEmployee: numeric('socso_employee', { precision: 10, scale: 2 }).notNull().default('0'),
    eisEmployee: numeric('eis_employee', { precision: 10, scale: 2 }).notNull().default('0'),
    pcb: numeric('pcb', { precision: 10, scale: 2 }).notNull().default('0'),
    bonuses: numeric('bonuses', { precision: 10, scale: 2 }).notNull().default('0'),
    otherDeductions: numeric('other_deductions', { precision: 10, scale: 2 }).notNull().default('0'),
    netSalary: numeric('net_salary', { precision: 10, scale: 2 }).notNull(),
    status: payslipStatusEnum('status').notNull().default('draft'),
    generatedAt: timestamp('generated_at').notNull().defaultNow(),
    finalizedAt: timestamp('finalized_at'),
});