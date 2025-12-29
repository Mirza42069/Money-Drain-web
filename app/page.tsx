"use client";

import { useState, useMemo, useEffect } from "react";
import {
    IconPlus,
    IconTrendingUp,
    IconTrendingDown,
    IconWallet,
    IconTrash,
    IconEdit,
    IconArrowUp,
    IconArrowDown,
    IconClock,
    IconCoin,
    IconBuildingBank,
    IconDownload,
    IconSun,
    IconMoon,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { useTransactions } from "@/hooks/use-transactions";
import {
    Transaction,
    CurrencyType,
    FilterPeriod,
    formatCurrency,
    formatDate,
    filterTransactionsByPeriod,
    convertCurrency,
    exchangeRates,
} from "@/lib/transactions";

const currencyOrder: CurrencyType[] = ["IDR", "JPY", "USD"];
const currencyLabels: Record<CurrencyType, string> = {
    IDR: "Rp",
    JPY: "¥",
    USD: "$",
};

const periodOrder: FilterPeriod[] = ["all", "day", "month", "6months", "year"];
const periodLabels: Record<FilterPeriod, string> = {
    all: "All",
    day: "1D",
    month: "1M",
    "6months": "6M",
    year: "1Y",
};

// Icon options for custom categories
const iconOptions = [
    "📌", "🎯", "💼", "📱", "🎮", "🎵", "📚", "✈️", "🏠", "🚀",
    "💎", "🎁", "🏋️", "🎨", "🍿", "☕", "🍺", "🎭", "🎪", "🎲",
    "🛒", "💊", "🎓", "👔", "👗", "👶", "🐕", "🌱", "⚡", "💡",
];

// Helper to get date label for grouping transactions
const getDateLabel = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const transactionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (transactionDate.getTime() === today.getTime()) {
        return "Today";
    } else if (transactionDate.getTime() === yesterday.getTime()) {
        return "Yesterday";
    } else {
        return date.toLocaleDateString("en-US", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    }
};

export default function MoneyDrain() {
    const [mounted, setMounted] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<1 | 2 | 3>(1);

    const {
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
        balance: totalBalance,
        income: totalIncome,
        expenses: totalExpenses,
        expensesByCategory: allExpensesByCategory,
    } = useTransactions(selectedAccount);

    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [currency, setCurrency] = useState<CurrencyType>("IDR");
    const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("all");
    const [pendingCurrency, setPendingCurrency] = useState<CurrencyType | null>(null);
    const [showConvertDialog, setShowConvertDialog] = useState(false);
    const [formData, setFormData] = useState({
        description: "",
        amount: "",
        type: "expense" as "income" | "expense",
        category: "other",
    });
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newCategoryIcon, setNewCategoryIcon] = useState("📌");
    const [isDarkMode, setIsDarkMode] = useState(true);

    // Fix hydration and load theme - only render dynamic content after mount
    useEffect(() => {
        setMounted(true);
        // Load saved theme preference (default to dark)
        const savedTheme = localStorage.getItem("money-drain-theme");
        const prefersDark = savedTheme !== "light";
        setIsDarkMode(prefersDark);
        if (prefersDark) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, []);


    // Load saved preferences from localStorage (only on client)
    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedCurrency = localStorage.getItem("money-drain-currency") as CurrencyType;
            const savedPeriod = localStorage.getItem("money-drain-period") as FilterPeriod;
            if (savedCurrency && currencyOrder.includes(savedCurrency)) {
                setCurrency(savedCurrency);
            }
            if (savedPeriod && periodOrder.includes(savedPeriod)) {
                setFilterPeriod(savedPeriod);
            }
        }
    }, []);

    // Save preferences to localStorage
    useEffect(() => {
        if (mounted) {
            localStorage.setItem("money-drain-currency", currency);
        }
    }, [currency, mounted]);

    useEffect(() => {
        if (mounted) {
            localStorage.setItem("money-drain-period", filterPeriod);
        }
    }, [filterPeriod, mounted]);

    // Cycle currency - shows conversion dialog if there are transactions
    const cycleCurrency = () => {
        const currentIndex = currencyOrder.indexOf(currency);
        const nextIndex = (currentIndex + 1) % currencyOrder.length;
        const newCurrency = currencyOrder[nextIndex];

        if (transactions.length > 0) {
            setPendingCurrency(newCurrency);
            setShowConvertDialog(true);
        } else {
            setCurrency(newCurrency);
        }
    };

    // Handle currency conversion dialog response
    const handleConvertResponse = (convert: boolean) => {
        if (pendingCurrency) {
            if (convert) {
                convertAllTransactions(currency, pendingCurrency);
            }
            setCurrency(pendingCurrency);
        }
        setPendingCurrency(null);
        setShowConvertDialog(false);
    };

    // Cycle period
    const cyclePeriod = () => {
        const currentIndex = periodOrder.indexOf(filterPeriod);
        const nextIndex = (currentIndex + 1) % periodOrder.length;
        setFilterPeriod(periodOrder[nextIndex]);
    };

    // Filter transactions by period
    const filteredTransactions = useMemo(() => {
        return filterTransactionsByPeriod(transactions, filterPeriod);
    }, [transactions, filterPeriod]);

    // Calculate totals based on filtered transactions
    const balance = useMemo(() => {
        return filteredTransactions.reduce((acc, t) => {
            return t.type === "income" ? acc + t.amount : acc - t.amount;
        }, 0);
    }, [filteredTransactions]);

    const income = useMemo(() => {
        return filteredTransactions
            .filter((t) => t.type === "income")
            .reduce((acc, t) => acc + t.amount, 0);
    }, [filteredTransactions]);

    const expenses = useMemo(() => {
        return filteredTransactions
            .filter((t) => t.type === "expense")
            .reduce((acc, t) => acc + t.amount, 0);
    }, [filteredTransactions]);

    const expensesByCategory = useMemo(() => {
        const expenseItems = filteredTransactions.filter((t) => t.type === "expense");
        const categoryTotals: Record<string, number> = {};

        expenseItems.forEach((t) => {
            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
        });

        return Object.entries(categoryTotals)
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount);
    }, [filteredTransactions]);

    const recentTransactions = useMemo(() => {
        return [...filteredTransactions]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 10);
    }, [filteredTransactions]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.amount) return;

        // Auto-generate description if empty
        const description = formData.description.trim() ||
            (formData.type === "income" ? "Income" : getCategoryInfo(formData.category).name);

        if (editingId) {
            // Update existing transaction
            updateTransaction(editingId, {
                description,
                amount: parseFloat(formData.amount),
                type: formData.type,
                category: formData.category,
            });
            setEditingId(null);
        } else {
            // Add new transaction
            addTransaction({
                description,
                amount: parseFloat(formData.amount),
                type: formData.type,
                category: formData.category,
                date: new Date().toISOString(),
            });
        }

        setFormData({
            description: "",
            amount: "",
            type: "expense",
            category: "other",
        });
        setShowAddForm(false);
    };

    const startEdit = (transaction: Transaction) => {
        setFormData({
            description: transaction.description,
            amount: transaction.amount.toString(),
            type: transaction.type,
            category: transaction.category,
        });
        setEditingId(transaction.id);
        setShowAddForm(true);
    };

    const getCategoryInfo = (categoryId: string, type: "expense" | "income" = "expense") => {
        const categories = getCategories(type);
        const allCategories = [...getCategories("expense"), ...getCategories("income")];
        return (
            allCategories.find((c) => c.id === categoryId) ||
            { id: "other", name: "Other", icon: "📦", color: "oklch(0.55 0 0)" }
        );
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
            </div>
        );
    }

    return (
        <>
            {/* Currency Conversion Dialog */}
            <AlertDialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
                <AlertDialogContent size="sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Convert Currency?</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                            <span className="block">
                                Change from {currencyLabels[currency]} to {pendingCurrency ? currencyLabels[pendingCurrency] : ""}?
                            </span>
                            {pendingCurrency && (
                                <span className="block text-xs text-muted-foreground">
                                    Rate: {formatCurrency(1, currency)} = {formatCurrency(convertCurrency(1, currency, pendingCurrency), pendingCurrency)}
                                </span>
                            )}
                            <span className="block text-xs font-medium">
                                Convert all transaction values?
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => handleConvertResponse(false)}>
                            No, just display
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleConvertResponse(true)}>
                            Yes, convert
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="min-h-screen bg-background p-3">
                <div className="max-w-md mx-auto space-y-3">
                    {/* Top Bar - Currency, Account & Filter */}
                    <div className="flex items-center justify-between">
                        {/* Currency Cycle Button */}
                        <Tooltip content={`Currency: ${currency}`}>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={cycleCurrency}
                                className="gap-1.5 font-semibold min-w-[60px]"
                            >
                                <IconCoin className="size-3.5" />
                                {currencyLabels[currency]}
                            </Button>
                        </Tooltip>

                        {/* Account Storage Buttons */}
                        <div className="flex items-center gap-1">
                            {[1, 2, 3].map((num) => (
                                <Tooltip key={num} content={`Account ${num}`}>
                                    <Button
                                        variant={selectedAccount === num ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setSelectedAccount(num as 1 | 2 | 3)}
                                        className="size-8 p-0 font-bold"
                                    >
                                        {num}
                                    </Button>
                                </Tooltip>
                            ))}
                        </div>

                        {/* Period Cycle Button */}
                        <Tooltip content={`Filter: ${periodLabels[filterPeriod]}`}>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={cyclePeriod}
                                className="gap-1.5 font-semibold min-w-[60px]"
                            >
                                <IconClock className="size-3.5" />
                                {periodLabels[filterPeriod]}
                            </Button>
                        </Tooltip>
                    </div>

                    {/* Stats - With Labels */}
                    <Card className="bg-card/60 overflow-hidden">
                        <div className="grid grid-cols-3 divide-x divide-border/50">
                            {/* Expense */}
                            <div className="p-3 flex flex-col items-center gap-1 cursor-default hover:bg-muted/30 transition-colors">
                                <div className="size-8 rounded-md bg-rose-500/10 flex items-center justify-center">
                                    <IconTrendingDown className="size-4 text-rose-500" />
                                </div>
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Expense</p>
                                <p className="text-sm font-bold tabular-nums text-rose-500">
                                    {formatCurrency(expenses, currency)}
                                </p>
                            </div>

                            {/* Income */}
                            <div className="p-3 flex flex-col items-center gap-1 cursor-default hover:bg-muted/30 transition-colors">
                                <div className="size-8 rounded-md bg-emerald-500/10 flex items-center justify-center">
                                    <IconTrendingUp className="size-4 text-emerald-500" />
                                </div>
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Income</p>
                                <p className="text-sm font-bold tabular-nums text-emerald-500">
                                    {formatCurrency(income, currency)}
                                </p>
                            </div>

                            {/* Bank (Balance) */}
                            <div className="p-3 flex flex-col items-center gap-1 cursor-default hover:bg-muted/30 transition-colors">
                                <div className="size-8 rounded-md bg-primary/10 flex items-center justify-center">
                                    <IconBuildingBank className="size-4 text-primary" />
                                </div>
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Bank</p>
                                <p className={`text-sm font-bold tabular-nums ${balance >= 0 ? "text-primary" : "text-destructive"}`}>
                                    {formatCurrency(balance, currency)}
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Add Button - Centered */}
                    <div className="flex justify-center">
                        <Tooltip content={showAddForm ? "Close" : "Add"}>
                            <Button
                                size="lg"
                                onClick={() => setShowAddForm(!showAddForm)}
                                className="size-10 p-0"
                            >
                                <IconPlus className={`size-5 transition-transform duration-200 ${showAddForm ? "rotate-45" : ""}`} />
                            </Button>
                        </Tooltip>
                    </div>

                    {/* Add Transaction Form */}
                    {showAddForm && (
                        <Card className="border-primary/20 animate-in slide-in-from-top-2 duration-200">
                            <CardContent className="p-3">
                                <form onSubmit={handleSubmit} className="space-y-3">
                                    {/* Type Toggle */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            type="button"
                                            variant={formData.type === "expense" ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setFormData({ ...formData, type: "expense" })}
                                        >
                                            <IconArrowDown data-icon="inline-start" className="size-3.5" />
                                            Expense
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={formData.type === "income" ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setFormData({ ...formData, type: "income" })}
                                        >
                                            <IconArrowUp data-icon="inline-start" className="size-3.5" />
                                            Income
                                        </Button>
                                    </div>

                                    {/* Description & Amount */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            placeholder="Description"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        />
                                        <Input
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="Amount"
                                            value={formData.amount ? Number(formData.amount).toLocaleString() : ""}
                                            onChange={(e) => {
                                                // Remove all non-digit characters except decimal point
                                                const raw = e.target.value.replace(/[^0-9.]/g, "");
                                                // Ensure only one decimal point
                                                const parts = raw.split(".");
                                                const cleaned = parts.length > 2
                                                    ? parts[0] + "." + parts.slice(1).join("")
                                                    : raw;
                                                setFormData({ ...formData, amount: cleaned });
                                            }}
                                        />
                                    </div>

                                    {/* Category */}
                                    <div className="flex gap-2">
                                        <Select
                                            value={formData.category}
                                            onValueChange={(value) => {
                                                if (value === "__add_new__") {
                                                    setShowAddCategory(true);
                                                } else {
                                                    setFormData({ ...formData, category: value });
                                                }
                                            }}
                                        >
                                            <SelectTrigger className="flex-1">
                                                <SelectValue placeholder="Category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {getCategories(formData.type).map((category) => (
                                                    <SelectItem key={category.id} value={category.id}>
                                                        <span className="flex items-center gap-2">
                                                            <span>{category.icon}</span>
                                                            <span>{category.name}</span>
                                                            {category.id.startsWith("custom_") && (
                                                                <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground">custom</span>
                                                            )}
                                                        </span>
                                                    </SelectItem>
                                                ))}
                                                <SelectItem value="__add_new__">
                                                    <span className="flex items-center gap-2 text-primary">
                                                        <span>➕</span>
                                                        <span>Add Custom Category</span>
                                                    </span>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {/* Delete custom category button */}
                                        {formData.category.startsWith("custom_") && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    deleteCustomCategory(formData.type, formData.category);
                                                    setFormData({ ...formData, category: "other" });
                                                }}
                                                className="px-2 text-muted-foreground hover:text-destructive hover:border-destructive"
                                            >
                                                <IconTrash className="size-4" />
                                            </Button>
                                        )}
                                    </div>

                                    {/* Add Custom Category Form */}
                                    {showAddCategory && (
                                        <div className="p-2 bg-muted/50 rounded-md space-y-2">
                                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Pick an icon</p>
                                            <div className="grid grid-cols-10 gap-1">
                                                {iconOptions.map((icon) => (
                                                    <button
                                                        key={icon}
                                                        type="button"
                                                        onClick={() => setNewCategoryIcon(icon)}
                                                        className={`size-7 flex items-center justify-center rounded-md text-sm transition-colors hover:bg-muted ${newCategoryIcon === icon ? "bg-primary/20 ring-1 ring-primary" : ""}`}
                                                    >
                                                        {icon}
                                                    </button>
                                                ))}
                                            </div>
                                            <Input
                                                placeholder="Category name"
                                                value={newCategoryName}
                                                onChange={(e) => setNewCategoryName(e.target.value)}
                                                className="w-full"
                                            />
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => {
                                                        setShowAddCategory(false);
                                                        setNewCategoryName("");
                                                        setNewCategoryIcon("📌");
                                                    }}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => {
                                                        if (newCategoryName.trim()) {
                                                            const cat = addCustomCategory(formData.type, {
                                                                name: newCategoryName.trim(),
                                                                icon: newCategoryIcon || "📌",
                                                                color: "oklch(0.55 0.15 200)",
                                                            });
                                                            setFormData({ ...formData, category: cat.id });
                                                            setShowAddCategory(false);
                                                            setNewCategoryName("");
                                                            setNewCategoryIcon("📌");
                                                        }
                                                    }}
                                                >
                                                    Add
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions - Only show when not adding custom category */}
                                    {!showAddCategory && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button type="button" variant="outline" size="sm" onClick={() => { setShowAddForm(false); setEditingId(null); }}>
                                                Cancel
                                            </Button>
                                            <Button type="submit" size="sm">
                                                {editingId ? "Save" : "Add"}
                                            </Button>
                                        </div>
                                    )}
                                </form>
                            </CardContent>
                        </Card>
                    )}

                    {/* Spending by Category */}
                    {expensesByCategory.length > 0 && (
                        <Card className="bg-card/60">
                            <CardContent className="p-3 space-y-2">
                                <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                                    <span>📊</span>
                                    <span>Categories</span>
                                </div>
                                <div className="space-y-2">
                                    {expensesByCategory.slice(0, 4).map(({ category, amount }) => {
                                        const categoryInfo = getCategoryInfo(category);
                                        const percentage = expenses > 0 ? (amount / expenses) * 100 : 0;

                                        return (
                                            <div key={category} className="space-y-1">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="flex items-center gap-1.5">
                                                        <span>{categoryInfo.icon}</span>
                                                        <span className="font-medium truncate">{categoryInfo.name}</span>
                                                    </span>
                                                    <span className="text-muted-foreground tabular-nums text-[11px]">
                                                        {formatCurrency(amount, currency)}
                                                    </span>
                                                </div>
                                                <div className="h-1 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-300"
                                                        style={{
                                                            width: `${percentage}%`,
                                                            backgroundColor: categoryInfo.color,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Recent Transactions */}
                    <Card className="bg-card/60">
                        <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                                    <span>📋</span>
                                    <span>Recent</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {/* Theme Toggle */}
                                    <Tooltip content={isDarkMode ? "Light Mode" : "Dark Mode"} side="left">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                const newDarkMode = !isDarkMode;
                                                setIsDarkMode(newDarkMode);
                                                if (newDarkMode) {
                                                    document.documentElement.classList.add("dark");
                                                    localStorage.setItem("money-drain-theme", "dark");
                                                } else {
                                                    document.documentElement.classList.remove("dark");
                                                    localStorage.setItem("money-drain-theme", "light");
                                                }
                                            }}
                                            className="h-6 px-2 text-muted-foreground hover:text-foreground"
                                        >
                                            {isDarkMode
                                                ? <IconSun className="size-3" />
                                                : <IconMoon className="size-3" />}
                                        </Button>
                                    </Tooltip>

                                    {/* Export Button */}
                                    {transactions.length > 0 && (
                                        <Tooltip content="Export CSV">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    const headers = ["Date", "Description", "Category", "Type", "Amount"];
                                                    const rows = transactions.map(t => [
                                                        new Date(t.date).toLocaleDateString(),
                                                        t.description,
                                                        t.category,
                                                        t.type,
                                                        t.amount.toString()
                                                    ]);
                                                    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
                                                    const blob = new Blob([csv], { type: "text/csv" });
                                                    const url = URL.createObjectURL(blob);
                                                    const a = document.createElement("a");
                                                    a.href = url;
                                                    a.download = `money-drain-account${selectedAccount}-${new Date().toISOString().split("T")[0]}.csv`;
                                                    a.click();
                                                    URL.revokeObjectURL(url);
                                                }}
                                                className="h-6 px-2 text-muted-foreground hover:text-foreground"
                                            >
                                                <IconDownload className="size-3" />
                                            </Button>
                                        </Tooltip>
                                    )}

                                    {/* Clear All */}
                                    {recentTransactions.length > 0 && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-2 text-muted-foreground hover:text-destructive"
                                                >
                                                    <IconTrash className="size-3" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent size="sm">
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Clear All Transactions?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        <span className="block">This will permanently delete all {transactions.length} transaction(s) in Account {selectedAccount}.</span>
                                                        <span className="block mt-2 font-medium text-destructive">⚠️ This action cannot be undone!</span>
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction variant="destructive" onClick={clearAllTransactions}>
                                                        Yes, Clear All
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </div>
                            </div>
                            {recentTransactions.length === 0 ? (
                                <div className="text-center py-6">
                                    <div className="size-10 rounded-full bg-muted mx-auto mb-2 flex items-center justify-center">
                                        <IconWallet className="size-4 text-muted-foreground" />
                                    </div>
                                    <p className="text-xs text-muted-foreground">No transactions</p>
                                </div>
                            ) : (
                                <div className="space-y-0.5">
                                    {recentTransactions.map((transaction, index) => {
                                        const dateLabel = getDateLabel(transaction.date);
                                        const prevTransaction = index > 0 ? recentTransactions[index - 1] : null;
                                        const prevDateLabel = prevTransaction ? getDateLabel(prevTransaction.date) : null;
                                        const showDateSpacer = dateLabel !== prevDateLabel;

                                        return (
                                            <div key={transaction.id}>
                                                {showDateSpacer && (
                                                    <div className="py-2 first:pt-0">
                                                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                                                            {dateLabel}
                                                        </p>
                                                    </div>
                                                )}
                                                <TransactionItem
                                                    transaction={transaction}
                                                    categoryInfo={getCategoryInfo(transaction.category)}
                                                    currency={currency}
                                                    onEdit={() => startEdit(transaction)}
                                                    onDelete={() => deleteTransaction(transaction.id)}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

function TransactionItem({
    transaction,
    categoryInfo,
    currency,
    onEdit,
    onDelete,
}: {
    transaction: Transaction;
    categoryInfo: { icon: string; name: string; color: string };
    currency: CurrencyType;
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <div className="group flex items-center gap-2 py-2 px-1.5 -mx-1.5 rounded-md hover:bg-muted/50 transition-colors">
            <div
                className="size-7 rounded-md flex items-center justify-center text-xs shrink-0"
                style={{ backgroundColor: `${categoryInfo.color}15` }}
            >
                {transaction.type === "income" ? "💰" : categoryInfo.icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{transaction.description}</p>
                <p className="text-[10px] text-muted-foreground">{formatDate(transaction.date)}</p>
            </div>
            <div className="flex items-center gap-1">
                <p className={`text-xs font-semibold tabular-nums ${transaction.type === "income" ? "text-emerald-500" : "text-rose-500"}`}>
                    {transaction.type === "income" ? "+" : "-"}
                    {formatCurrency(transaction.amount, currency)}
                </p>
                <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={onEdit}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                >
                    <IconEdit className="size-3" />
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon-xs"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        >
                            <IconTrash className="size-3" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent size="sm">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Delete &quot;{transaction.description}&quot;?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>No</AlertDialogCancel>
                            <AlertDialogAction variant="destructive" onClick={onDelete}>
                                Yes
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}