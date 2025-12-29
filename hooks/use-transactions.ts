"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, Authenticated, Unauthenticated } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
    Category,
    CurrencyType,
    defaultExpenseCategories,
    defaultIncomeCategories,
    exchangeRates,
    convertCurrency,
} from "@/lib/transactions";

export interface Transaction {
    id: string;
    description: string;
    amount: number;
    type: "income" | "expense";
    category: string;
    date: string;
}

const CUSTOM_CATEGORIES_KEY = "money-drain-custom-categories";
const getStorageKey = (account: number) => `money-drain-transactions-account-${account}`;

interface CustomCategoriesLocal {
    expense: Category[];
    income: Category[];
}

export function useTransactions(account: number = 1) {
    const { isSignedIn } = useAuth();

    // === LOCAL STATE (always called) ===
    const [localTransactions, setLocalTransactions] = useState<Transaction[]>([]);
    const [localCustomCategories, setLocalCustomCategories] = useState<CustomCategoriesLocal>({ expense: [], income: [] });
    const [localIsLoading, setLocalIsLoading] = useState(true);

    // Load from localStorage
    useEffect(() => {
        if (isSignedIn) return; // Skip if signed in
        setLocalIsLoading(true);
        const storageKey = getStorageKey(account);
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            try { setLocalTransactions(JSON.parse(stored)); } catch { setLocalTransactions([]); }
        } else {
            setLocalTransactions([]);
        }
        const storedCategories = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
        if (storedCategories) {
            try { setLocalCustomCategories(JSON.parse(storedCategories)); } catch { /* ignore */ }
        }
        setLocalIsLoading(false);
    }, [account, isSignedIn]);

    // Save to localStorage
    useEffect(() => {
        if (isSignedIn || localIsLoading) return;
        localStorage.setItem(getStorageKey(account), JSON.stringify(localTransactions));
    }, [localTransactions, localIsLoading, account, isSignedIn]);

    useEffect(() => {
        if (isSignedIn || localIsLoading) return;
        localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(localCustomCategories));
    }, [localCustomCategories, localIsLoading, isSignedIn]);

    // === CONVEX STATE (always called, but skip query when not signed in) ===
    const transactionsData = useQuery(api.transactions.list, isSignedIn ? { account } : "skip");
    const customCategoriesData = useQuery(api.categories.list, isSignedIn ? {} : "skip");

    const createTransaction = useMutation(api.transactions.create);
    const updateTransactionMutation = useMutation(api.transactions.update);
    const removeTransaction = useMutation(api.transactions.remove);
    const clearTransactions = useMutation(api.transactions.clear);
    const convertTransactionsMutation = useMutation(api.transactions.convertAll);
    const createCategory = useMutation(api.categories.create);
    const removeCategory = useMutation(api.categories.remove);

    // === DERIVED DATA ===
    const transactions: Transaction[] = useMemo(() => {
        if (isSignedIn) {
            return (transactionsData || []).map((t: { id: string; description: string; amount: number; type: "income" | "expense"; category: string; date: string }) => ({
                id: t.id,
                description: t.description,
                amount: t.amount,
                type: t.type,
                category: t.category,
                date: t.date,
            }));
        }
        return localTransactions;
    }, [isSignedIn, transactionsData, localTransactions]);

    const customCategories = useMemo(() => {
        if (isSignedIn) {
            const expense: Category[] = [];
            const income: Category[] = [];
            (customCategoriesData || []).forEach((c: { id: string; type: "income" | "expense"; name: string; icon: string; color: string }) => {
                const category = { id: c.id, name: c.name, icon: c.icon, color: c.color };
                if (c.type === "expense") expense.push(category);
                else income.push(category);
            });
            return { expense, income };
        }
        return localCustomCategories;
    }, [isSignedIn, customCategoriesData, localCustomCategories]);

    const isLoading = isSignedIn
        ? transactionsData === undefined || customCategoriesData === undefined
        : localIsLoading;

    // === CALLBACKS ===
    const generateId = useCallback(() => Math.random().toString(36).substring(2, 9), []);

    const getCategories = useCallback(
        (type: "expense" | "income"): Category[] => {
            const defaults = type === "expense" ? defaultExpenseCategories : defaultIncomeCategories;
            return [...defaults, ...customCategories[type]];
        },
        [customCategories]
    );

    const addCustomCategory = useCallback(
        async (type: "expense" | "income", category: Omit<Category, "id">) => {
            if (isSignedIn) {
                const result = await createCategory({ type, name: category.name, icon: category.icon, color: category.color });
                return { id: result.id, ...category };
            } else {
                const newCategory: Category = { ...category, id: `custom_${generateId()}` };
                setLocalCustomCategories((prev) => ({ ...prev, [type]: [...prev[type], newCategory] }));
                return newCategory;
            }
        },
        [isSignedIn, createCategory, generateId]
    );

    const deleteCustomCategory = useCallback(
        async (type: "expense" | "income", id: string) => {
            if (isSignedIn) {
                await removeCategory({ id: id as Id<"customCategories"> });
            } else {
                setLocalCustomCategories((prev) => ({ ...prev, [type]: prev[type].filter((c) => c.id !== id) }));
            }
        },
        [isSignedIn, removeCategory]
    );

    const addTransaction = useCallback(
        async (transaction: Omit<Transaction, "id">) => {
            if (isSignedIn) {
                await createTransaction({
                    account,
                    description: transaction.description,
                    amount: transaction.amount,
                    type: transaction.type,
                    category: transaction.category,
                    date: transaction.date,
                });
            } else {
                const newTransaction: Transaction = { ...transaction, id: generateId() };
                setLocalTransactions((prev) => [newTransaction, ...prev]);
                return newTransaction;
            }
        },
        [isSignedIn, createTransaction, account, generateId]
    );

    const deleteTransaction = useCallback(
        async (id: string) => {
            if (isSignedIn) {
                await removeTransaction({ id: id as Id<"transactions"> });
            } else {
                setLocalTransactions((prev) => prev.filter((t) => t.id !== id));
            }
        },
        [isSignedIn, removeTransaction]
    );

    const updateTransaction = useCallback(
        async (id: string, updates: Partial<Transaction>) => {
            if (isSignedIn) {
                await updateTransactionMutation({
                    id: id as Id<"transactions">,
                    description: updates.description,
                    amount: updates.amount,
                    type: updates.type,
                    category: updates.category,
                });
            } else {
                setLocalTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
            }
        },
        [isSignedIn, updateTransactionMutation]
    );

    const convertAllTransactions = useCallback(
        async (fromCurrency: CurrencyType, toCurrency: CurrencyType) => {
            if (fromCurrency === toCurrency) return;
            if (isSignedIn) {
                await convertTransactionsMutation({
                    account,
                    fromRate: exchangeRates[fromCurrency],
                    toRate: exchangeRates[toCurrency],
                });
            } else {
                setLocalTransactions((prev) =>
                    prev.map((t) => ({ ...t, amount: convertCurrency(t.amount, fromCurrency, toCurrency) }))
                );
            }
        },
        [isSignedIn, convertTransactionsMutation, account]
    );

    const clearAllTransactions = useCallback(async () => {
        if (isSignedIn) {
            await clearTransactions({ account });
        } else {
            setLocalTransactions([]);
        }
    }, [isSignedIn, clearTransactions, account]);

    // === COMPUTED VALUES ===
    const balance = useMemo(() => {
        return transactions.reduce((acc, t) => (t.type === "income" ? acc + t.amount : acc - t.amount), 0);
    }, [transactions]);

    const income = useMemo(() => {
        return transactions.filter((t) => t.type === "income").reduce((acc, t) => acc + t.amount, 0);
    }, [transactions]);

    const expenses = useMemo(() => {
        return transactions.filter((t) => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);
    }, [transactions]);

    const expensesByCategory = useMemo(() => {
        const expenseItems = transactions.filter((t) => t.type === "expense");
        const categoryTotals: Record<string, number> = {};
        expenseItems.forEach((t) => {
            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
        });
        return Object.entries(categoryTotals)
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount);
    }, [transactions]);

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
        balance,
        income,
        expenses,
        expensesByCategory,
    };
}
