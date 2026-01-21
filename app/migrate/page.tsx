"use client";

import { useMutation } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { useState } from "react";

// Data from phone export
const phoneTransactions = [
    { date: "2025-12-31", description: "Income", category: "salary", type: "income" as const, amount: 3000000 },
    { date: "2025-12-31", description: "utang", category: "other", type: "expense" as const, amount: 900000 },
    { date: "2026-01-01", description: "gosend", category: "transport", type: "expense" as const, amount: 20000 },
    { date: "2026-01-02", description: "3d print", category: "shopping", type: "expense" as const, amount: 26000 },
    { date: "2026-01-04", description: "Food & Dining", category: "food", type: "expense" as const, amount: 30000 },
    { date: "2026-01-04", description: "Emas", category: "other", type: "expense" as const, amount: 250000 },
    { date: "2026-01-04", description: "Food & Dining", category: "food", type: "expense" as const, amount: 8500 },
    { date: "2026-01-05", description: "Transport", category: "transport", type: "expense" as const, amount: 83500 },
    { date: "2026-01-05", description: "Transport", category: "transport", type: "expense" as const, amount: 86000 },
    { date: "2026-01-06", description: "Transport", category: "transport", type: "expense" as const, amount: 14000 },
    { date: "2026-01-10", description: "Print", category: "other", type: "expense" as const, amount: 82500 },
    { date: "2026-01-11", description: "Kartu tol", category: "bills", type: "expense" as const, amount: 101000 },
    { date: "2026-01-11", description: "Transport", category: "transport", type: "expense" as const, amount: 157000 },
    { date: "2026-01-11", description: "Transport", category: "transport", type: "expense" as const, amount: 178000 },
    { date: "2026-01-11", description: "Print", category: "other", type: "expense" as const, amount: 6500 },
    { date: "2026-01-11", description: "Food & Dining", category: "food", type: "expense" as const, amount: 50000 },
    { date: "2026-01-11", description: "Food & Dining", category: "food", type: "expense" as const, amount: 62200 },
    { date: "2026-01-11", description: "gosend", category: "transport", type: "expense" as const, amount: 10500 },
    { date: "2026-01-12", description: "Transport", category: "transport", type: "expense" as const, amount: 6500 },
    { date: "2026-01-12", description: "Food & Dining", category: "food", type: "expense" as const, amount: 5000 },
    { date: "2026-01-12", description: "Food & Dining", category: "food", type: "expense" as const, amount: 11000 },
    { date: "2026-01-12", description: "Print", category: "other", type: "expense" as const, amount: 44500 },
    { date: "2026-01-12", description: "Entertainment", category: "entertainment", type: "expense" as const, amount: 70000 },
    { date: "2026-01-12", description: "Food & Dining", category: "food", type: "expense" as const, amount: 55600 },
    { date: "2026-01-13", description: "Food & Dining", category: "food", type: "expense" as const, amount: 58900 },
    { date: "2026-01-13", description: "Food & Dining", category: "food", type: "expense" as const, amount: 41000 },
    { date: "2026-01-13", description: "Food & Dining", category: "food", type: "expense" as const, amount: 57400 },
    { date: "2026-01-13", description: "Other", category: "transport", type: "expense" as const, amount: 10500 },
    { date: "2026-01-14", description: "Transport", category: "transport", type: "expense" as const, amount: 6500 },
    { date: "2026-01-14", description: "Food & Dining", category: "food", type: "expense" as const, amount: 51000 },
    { date: "2026-01-15", description: "Food & Dining", category: "food", type: "expense" as const, amount: 56000 },
    { date: "2026-01-15", description: "Transport", category: "transport", type: "expense" as const, amount: 67500 },
    { date: "2026-01-15", description: "Transport", category: "transport", type: "expense" as const, amount: 21000 },
    { date: "2026-01-15", description: "Transport", category: "transport", type: "expense" as const, amount: 134000 },
    { date: "2026-01-15", description: "Income", category: "freelance", type: "income" as const, amount: 300000 },
    { date: "2026-01-17", description: "Food & Dining", category: "food", type: "expense" as const, amount: 58200 },
    { date: "2026-01-19", description: "Emas", category: "other", type: "expense" as const, amount: 200000 },
    { date: "2026-01-20", description: "Other", category: "other", type: "expense" as const, amount: 32500 },
];

export default function MigratePage() {
    const { userId, isSignedIn, isLoaded } = useAuth();
    const importTransactions = useMutation(api.migration.importTransactions);
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    const handleMigrate = async () => {
        if (!userId) {
            setMessage("Not authenticated");
            return;
        }

        setStatus("loading");
        setMessage("Importing transactions...");

        try {
            const result = await importTransactions({
                userId,
                account: 1,
                transactions: phoneTransactions,
            });
            setStatus("success");
            setMessage(`Successfully imported ${result.imported} transactions!`);
        } catch (error) {
            setStatus("error");
            setMessage(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    };

    if (!isLoaded) {
        return <div className="p-8">Loading...</div>;
    }

    if (!isSignedIn) {
        return <div className="p-8">Please sign in first to migrate data.</div>;
    }

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Data Migration</h1>
            <p className="mb-4">
                This will import {phoneTransactions.length} transactions from your phone export to your cloud account.
            </p>
            <p className="mb-4 text-sm text-gray-500">User ID: {userId}</p>
            
            <button
                onClick={handleMigrate}
                disabled={status === "loading"}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
                {status === "loading" ? "Importing..." : "Import Data"}
            </button>

            {message && (
                <div className={`mt-4 p-4 rounded ${
                    status === "success" ? "bg-green-100 text-green-800" :
                    status === "error" ? "bg-red-100 text-red-800" :
                    "bg-blue-100 text-blue-800"
                }`}>
                    {message}
                </div>
            )}

            <div className="mt-8">
                <h2 className="text-lg font-semibold mb-2">Preview ({phoneTransactions.length} transactions)</h2>
                <div className="max-h-96 overflow-y-auto border rounded">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-100 sticky top-0">
                            <tr>
                                <th className="p-2 text-left">Date</th>
                                <th className="p-2 text-left">Description</th>
                                <th className="p-2 text-left">Category</th>
                                <th className="p-2 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {phoneTransactions.map((tx, i) => (
                                <tr key={i} className={tx.type === "income" ? "text-green-600" : ""}>
                                    <td className="p-2">{tx.date}</td>
                                    <td className="p-2">{tx.description}</td>
                                    <td className="p-2">{tx.category}</td>
                                    <td className="p-2 text-right">
                                        {tx.type === "income" ? "+" : "-"}{tx.amount.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
