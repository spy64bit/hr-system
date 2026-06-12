"use client";

import { useState, useTransition, useEffect } from "react";
import { updatePayslipAdjustments, finalizePayslip } from "@/lib/actions/payroll";

type Props = {
    id: number;
    employeeName: string;
    baseSalary: string;
    epfEmployee: string;
    socsoEmployee: string;
    eisEmployee: string;
    pcb: string;
    bonuses: string;
    otherDeductions: string;
    netSalary: string;
};

function fmt(v: string | number): string {
    return parseFloat(String(v)).toFixed(2);
}

const inputClass =
    "w-24 rounded border border-gray-300 bg-white px-2 py-1 text-right text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50";

export default function DraftPayslipRow({
    id,
    employeeName,
    baseSalary,
    epfEmployee,
    socsoEmployee,
    eisEmployee,
    pcb,
    bonuses: propBonuses,
    otherDeductions: propOtherDeductions,
    netSalary,
}: Props) {
    const [bonuses, setBonuses] = useState(propBonuses);
    const [otherDeductions, setOtherDeductions] = useState(propOtherDeductions);
    const [saveMsg, setSaveMsg] = useState<{ type: "error" | "success"; text: string } | null>(
        null,
    );
    const [finalizeMsg, setFinalizeMsg] = useState<string | null>(null);

    const [isSavePending, startSave] = useTransition();
    const [isFinalizePending, startFinalize] = useTransition();

    // Sync inputs when server re-renders with new data after revalidatePath
    useEffect(() => {
        setBonuses(propBonuses);
        setOtherDeductions(propOtherDeductions);
        setSaveMsg(null);
    }, [propBonuses, propOtherDeductions]);

    const busy = isSavePending || isFinalizePending;

    const handleSave = () => {
        setSaveMsg(null);
        const b = Math.max(0, parseFloat(bonuses) || 0);
        const d = Math.max(0, parseFloat(otherDeductions) || 0);
        startSave(async () => {
            const result = await updatePayslipAdjustments(id, b, d);
            if (result?.error) {
                setSaveMsg({ type: "error", text: result.error });
            } else {
                setSaveMsg({ type: "success", text: "Saved" });
            }
        });
    };

    const handleFinalize = () => {
        if (!confirm("Finalize this payslip? This cannot be undone.")) return;
        setFinalizeMsg(null);
        startFinalize(async () => {
            const result = await finalizePayslip(id);
            if (result?.error) {
                setFinalizeMsg(result.error);
            }
            // On success revalidatePath causes the server to re-render this row as finalized
        });
    };

    return (
        <tr className="border-b border-gray-100 bg-yellow-50/40">
            <td className="px-4 py-2.5 text-sm text-gray-900 whitespace-nowrap">{employeeName}</td>
            <td className="px-4 py-2.5 text-sm text-right tabular-nums text-gray-700">
                {fmt(baseSalary)}
            </td>
            <td className="px-4 py-2.5 text-sm text-right tabular-nums text-gray-700">
                {fmt(epfEmployee)}
            </td>
            <td className="px-4 py-2.5 text-sm text-right tabular-nums text-gray-700">
                {fmt(socsoEmployee)}
            </td>
            <td className="px-4 py-2.5 text-sm text-right tabular-nums text-gray-700">
                {fmt(eisEmployee)}
            </td>
            <td className="px-4 py-2.5 text-sm text-right tabular-nums text-gray-700">{fmt(pcb)}</td>
            <td className="px-4 py-2.5 text-sm text-right tabular-nums text-gray-700">
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={bonuses}
                    onChange={(e) => setBonuses(e.target.value)}
                    disabled={busy}
                    className={inputClass}
                    aria-label="Bonuses"
                />
            </td>
            <td className="px-4 py-2.5 text-sm text-right tabular-nums text-gray-700">
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={otherDeductions}
                    onChange={(e) => setOtherDeductions(e.target.value)}
                    disabled={busy}
                    className={inputClass}
                    aria-label="Other deductions"
                />
            </td>
            <td className="px-4 py-2.5 text-sm text-right tabular-nums font-medium text-gray-900">
                {fmt(netSalary)}
            </td>
            <td className="px-4 py-2.5">
                <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                    Draft
                </span>
            </td>
            <td className="px-4 py-2.5">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSave}
                            disabled={busy}
                            className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors"
                        >
                            {isSavePending ? "Saving…" : "Save"}
                        </button>
                        <span className="text-gray-200 select-none">|</span>
                        <button
                            onClick={handleFinalize}
                            disabled={busy}
                            className="text-xs font-medium text-green-700 hover:text-green-900 disabled:opacity-50 transition-colors"
                        >
                            {isFinalizePending ? "Finalizing…" : "Finalize"}
                        </button>
                    </div>
                    {saveMsg && (
                        <p
                            className={`text-xs ${saveMsg.type === "error" ? "text-red-600" : "text-green-600"}`}
                        >
                            {saveMsg.text}
                        </p>
                    )}
                    {finalizeMsg && <p className="text-xs text-red-600">{finalizeMsg}</p>}
                </div>
            </td>
        </tr>
    );
}
