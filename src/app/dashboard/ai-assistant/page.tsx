import { requireAuth } from "@/lib/auth";
import AIChatInterface from "@/components/ai-assistant/AIChatInterface";

export default async function AIAssistantPage() {
    await requireAuth();

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="shrink-0 px-8 py-6 border-b border-gray-200 bg-white">
                <h1 className="text-2xl font-semibold text-gray-900">
                    AI Assistant
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    Ask about leave balances, employee info, pending approvals,
                    or request leave in plain English.
                </p>
            </div>
            <AIChatInterface />
        </div>
    );
}
