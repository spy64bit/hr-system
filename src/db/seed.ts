import 'dotenv/config';
import { db } from './index';
import { employees } from './schema';
import bcrypt from 'bcryptjs';

// top of seed.ts, after imports
console.log('DB URL:', process.env.DATABASE_URL);

async function seed() {
    const passwordHash = await bcrypt.hash('password', 10);

    // Admin (no manager)
    const [admin] = await db.insert(employees).values({
        name: 'Admin',
        email: 'admin@example.com',
        passwordHash,
        role: 'admin',
        position: 'System Administrator',
        department: 'Management',
        baseSalary: '8000.00',
        joinedAt: '2023-01-01',
    }).returning();

    // HR (reports to admin)
    const [hr] = await db.insert(employees).values({
        name: 'Sarah HR',
        email: 'hr@example.com',
        passwordHash,
        role: 'hr',
        managerId: admin.id,
        position: 'HR Manager',
        department: 'Human Resources',
        baseSalary: '6000.00',
        joinedAt: '2023-02-01',
    }).returning();

    // Manager (reports to admin)
    const [manager] = await db.insert(employees).values({
        name: 'Mike Manager',
        email: 'manager@example.com',
        passwordHash,
        role: 'manager',
        managerId: admin.id,
        position: 'Engineering Manager',
        department: 'Engineering',
        baseSalary: '7000.00',
        joinedAt: '2023-03-01',
    }).returning();

    // Employees (report to manager)
    await db.insert(employees).values([
        {
            name: 'Alice Employee',
            email: 'alice@example.com',
            passwordHash,
            role: 'employee',
            managerId: manager.id,
            position: 'Software Engineer',
            department: 'Engineering',
            baseSalary: '5000.00',
            joinedAt: '2023-06-01',
        },
        {
            name: 'Bob Employee',
            email: 'bob@example.com',
            passwordHash,
            role: 'employee',
            managerId: manager.id,
            position: 'Software Engineer',
            department: 'Engineering',
            baseSalary: '4800.00',
            joinedAt: '2023-07-01',
        },
    ]);

    console.log('Seed complete.');
    console.log('Login: admin@example.com / hr@example.com / manager@example.com / alice@example.com / bob@example.com');
    console.log('Password (all): password');
}

seed()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });