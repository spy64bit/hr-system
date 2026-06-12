"use client";

export default function PrintButton() {
    return (
        <button
            onClick={() => window.print()}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors print:hidden"
        >
            Print / Save as PDF
        </button>
    );
}
