"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Transaction, Category, generateId, CurrencyType, convertCurrency, defaultExpenseCategories, defaultIncomeCategories } from "@/lib/transactions";

const CUSTOM_CATEGORIES_KEY = "money-drain-custom-categories";

// Get storage key for specific account
const getStorageKey = (account: number) => `money-drain-transactions-account-${account}`;

interface CustomCategories {
    expense: Category[];
    income: Category[];
}

export function useTransactions(account: number = 1) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [customCategories, setCustomCategories] = useState<CustomCategories>({ expense: [], income: [] });
    const [isLoading, setIsLoading] = useState(true);

    // Load transactions for specific account
    useEffect(() => {
        setIsLoading(true);
        const storageKey = getStorageKey(account);
        const stored = localStorage.getItem(storageKey);

        if (stored) {
            try {
                setTransactions(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse stored transactions:", e);
                setTransactions([]);
            }
        } else {
            setTransactions([]);
        }

        const storedCategories = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
        if (storedCategories) {
            try {
                setCustomCategories(JSON.parse(storedCategories));
            } catch (e) {
                console.error("Failed to parse stored categories:", e);
            }
        }
        setIsLoading(false);
    }, [account]);

    // Save transactions to localStorage whenever they change
    useEffect(() => {
        if (!isLoading) {
            const storageKey = getStorageKey(account);
            localStorage.setItem(storageKey, JSON.stringify(transactions));
        }
    }, [transactions, isLoading, account]);

    // Save custom categories to localStorage
    useEffect(() => {
        if (!isLoading) {
            localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(customCategories));
        }
    }, [customCategories, isLoading]);

    // Get all categories for a type (default + custom) - memoized
    const getCategories = useCallback((type: "expense" | "income"): Category[] => {
        const defaults = type === "expense" ? defaultExpenseCategories : defaultIncomeCategories;
        return [...defaults, ...customCategories[type]];
    }, [customCategories]);

    // Add a custom category
    const addCustomCategory = useCallback((type: "expense" | "income", category: Omit<Category, "id">) => {
        const newCategory: Category = {
            ...category,
            id: `custom_${generateId()}`,
        };
        setCustomCategories((prev) => ({
            ...prev,
            [type]: [...prev[type], newCategory],
        }));
        return newCategory;
    }, []);

    // Delete a custom category
    const deleteCustomCategory = useCallback((type: "expense" | "income", id: string) => {
        setCustomCategories((prev) => ({
            ...prev,
            [type]: prev[type].filter((c) => c.id !== id),
        }));
    }, []);

    const addTransaction = useCallback((transaction: Omit<Transaction, "id">) => {
        const newTransaction: Transaction = {
            ...transaction,
            id: generateId(),
        };
        setTransactions((prev) => [newTransaction, ...prev]);
        return newTransaction;
    }, []);

    const deleteTransaction = useCallback((id: string) => {
        setTransactions((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
        setTransactions((prev) =>
            prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
        );
    }, []);

    // Convert all transaction amounts from one currency to another
    const convertAllTransactions = useCallback((fromCurrency: CurrencyType, toCurrency: CurrencyType) => {
        if (fromCurrency === toCurrency) return;

        setTransactions((prev) =>
            prev.map((t) => ({
                ...t,
                amount: convertCurrency(t.amount, fromCurrency, toCurrency),
            }))
        );
    }, []);

    // Memoized computed values
    const getTotalBalance = useMemo(() => {
        return transactions.reduce((acc, t) => {
            return t.type === "income" ? acc + t.amount : acc - t.amount;
        }, 0);
    }, [transactions]);

    const getTotalIncome = useMemo(() => {
        return transactions
            .filter((t) => t.type === "income")
            .reduce((acc, t) => acc + t.amount, 0);
    }, [transactions]);

    const getTotalExpenses = useMemo(() => {
        return transactions
            .filter((t) => t.type === "expense")
            .reduce((acc, t) => acc + t.amount, 0);
    }, [transactions]);

    const getExpensesByCategory = useMemo(() => {
        const expenses = transactions.filter((t) => t.type === "expense");
        const categoryTotals: Record<string, number> = {};

        expenses.forEach((t) => {
            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
        });

        return Object.entries(categoryTotals)
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount);
    }, [transactions]);

    // Clear all transactions
    const clearAllTransactions = useCallback(() => {
        setTransactions([]);
    }, []);

    return {
        transactions,
        isLoading,
        addTransaction,
        deleteTransaction,
        updateTransaction,
        convertAllTransactions,
        clearAllTransactions,
        getCategories,
        addCustomCategory,
        deleteCustomCategory,
        balance: getTotalBalance,
        income: getTotalIncome,
        expenses: getTotalExpenses,
        expensesByCategory: getExpensesByCategory,
    };
}
