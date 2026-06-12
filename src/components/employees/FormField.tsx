type FormFieldProps = {
    label: string;
    name: string;
    error?: string[];
    children: React.ReactNode;
    required?: boolean;
};

export function FormField({ label, name, error, children, required }: FormFieldProps) {
    return (
        <div>
            <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {children}
            {error?.[0] && (
                <p className="mt-1 text-xs text-red-600">{error[0]}</p>
            )}
        </div>
    );
}

export const inputClass =
    "block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500";

export const selectClass =
    "block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500";
