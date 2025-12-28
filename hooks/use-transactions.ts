"use client";

import { useState, useEffect } from "react";
import { Transaction, generateId, CurrencyType, convertCurrency } from "@/lib/transactions";

const STORAGE_KEY = "money-drain-transactions";

export function useTransactions() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load transactions from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                setTransactions(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse stored transactions:", e);
            }
        }
        setIsLoading(false);
    }, []);

    // Save transactions to localStorage whenever they change
    useEffect(() => {
        if (!isLoading) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
        }
    }, [transactions, isLoading]);

    const addTransaction = (transaction: Omit<Transaction, "id">) => {
        const newTransaction: Transaction = {
            ...transaction,
            id: generateId(),
        };
        setTransactions((prev) => [newTransaction, ...prev]);
        return newTransaction;
    };

    const deleteTransaction = (id: string) => {
        setTransactions((prev) => prev.filter((t) => t.id !== id));
    };

    const updateTransaction = (id: string, updates: Partial<Transaction>) => {
        setTransactions((prev) =>
            prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
        );
    };

    // Convert all transaction amounts from one currency to another
    const convertAllTransactions = (fromCurrency: CurrencyType, toCurrency: CurrencyType) => {
        if (fromCurrency === toCurrency) return;

        setTransactions((prev) =>
            prev.map((t) => ({
                ...t,
                amount: convertCurrency(t.amount, fromCurrency, toCurrency),
            }))
        );
    };

    const getTotalBalance = () => {
        return transactions.reduce((acc, t) => {
            return t.type === "income" ? acc + t.amount : acc - t.amount;
        }, 0);
    };

    const getTotalIncome = () => {
        return transactions
            .filter((t) => t.type === "income")
            .reduce((acc, t) => acc + t.amount, 0);
    };

    const getTotalExpenses = () => {
        return transactions
            .filter((t) => t.type === "expense")
            .reduce((acc, t) => acc + t.amount, 0);
    };

    const getRecentTransactions = (limit: number = 10) => {
        return [...transactions]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, limit);
    };

    const getExpensesByCategory = () => {
        const expenses = transactions.filter((t) => t.type === "expense");
        const categoryTotals: Record<string, number> = {};

        expenses.forEach((t) => {
            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
        });

        return Object.entries(categoryTotals)
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount);
    };

    return {
        transactions,
        isLoading,
        addTransaction,
        deleteTransaction,
        updateTransaction,
        convertAllTransactions,
        getTotalBalance,
        getTotalIncome,
        getTotalExpenses,
        getRecentTransactions,
        getExpensesByCategory,
    };
}
