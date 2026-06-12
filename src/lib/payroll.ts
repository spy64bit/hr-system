// NOTE: These calculations are simplified for portfolio purposes
// and do not reflect legally accurate Malaysian statutory deductions.

export function calculatePayslip(
    baseSalary: number,
    bonuses = 0,
    otherDeductions = 0,
): {
    epfEmployee: number;
    socsoEmployee: number;
    eisEmployee: number;
    pcb: number;
    netSalary: number;
} {
    // EPF: 11% of baseSalary
    const epfEmployee = round2(baseSalary * 0.11);

    // SOCSO: 0.5% of baseSalary, capped at RM 19.75
    const socsoEmployee = Math.min(round2(baseSalary * 0.005), 19.75);

    // EIS: 0.2% of baseSalary, capped at RM 9.90
    const eisEmployee = Math.min(round2(baseSalary * 0.002), 9.9);

    // PCB (Potongan Cukai Berjadual / Income Tax)
    let pcb: number;
    if (baseSalary <= 3000) {
        pcb = 0;
    } else if (baseSalary <= 5000) {
        pcb = round2((baseSalary - 3000) * 0.05);
    } else {
        pcb = round2(100 + (baseSalary - 5000) * 0.1);
    }

    const netSalary = round2(
        baseSalary + bonuses - epfEmployee - socsoEmployee - eisEmployee - pcb - otherDeductions,
    );

    return { epfEmployee, socsoEmployee, eisEmployee, pcb, netSalary };
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}
