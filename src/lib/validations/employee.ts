import { z } from "zod";

const managerIdField = z.preprocess(
    (val) => (val === "" || val == null ? null : Number(val)),
    z.number().int().positive("Invalid manager").nullable()
);

export const createEmployeeSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email format"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.enum(["admin", "hr", "manager", "employee"]),
    managerId: managerIdField,
    position: z.string().min(1, "Position is required"),
    department: z.string().min(1, "Department is required"),
    baseSalary: z.coerce.number().positive("Salary must be positive"),
    annualLeaveBalance: z.coerce.number().int().min(0, "Min 0").max(365, "Max 365"),
    joinedAt: z.string().min(1, "Join date is required"),
});

export const updateEmployeeSchema = createEmployeeSchema.omit({ password: true });

export const selfUpdateSchema = z.object({
    name: z.string().min(1, "Name is required"),
});

export const resetPasswordSchema = z.object({
    password: z.string().min(8, "Password must be at least 8 characters"),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
