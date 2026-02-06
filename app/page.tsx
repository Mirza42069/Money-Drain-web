"use client";

import { Suspense, useState, useMemo, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SignInButton, SignOutButton, useUser, useAuth, UserButton } from "@clerk/nextjs";
import dynamic from "next/dynamic";

// Lazy load PricingTable - only needed when user clicks premium filter (bundle-dynamic-imports)
const PricingTable = dynamic(
    () => import("@clerk/nextjs").then(mod => ({ default: mod.PricingTable })),
    { loading: () => <div className="h-64 animate-pulse motion-reduce:animate-none bg-muted rounded-lg" /> }
);
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
    IconSun,
    IconMoon,
    IconLock,
    IconCrown,
    IconChevronDown,
    IconSearch,
    IconBolt,
    IconX,
    IconSparkles,
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip } from "@/components/ui/tooltip";
import { useTransactions, Transaction } from "@/hooks/use-transactions";
import {
    Category,
    CurrencyType,
    FilterPeriod,
    formatCurrency,
    formatDate,
    filterTransactionsByPeriod,
    convertCurrency,
} from "@/lib/transactions";

const currencyOrder: CurrencyType[] = ["IDR", "JPY", "USD"];
const currencyLabels: Record<CurrencyType, string> = {
    IDR: "Rp",
    JPY: "¥",
    USD: "$",
};

// All period options organized by category
const dayPeriods: FilterPeriod[] = ["1d", "2d", "3d", "4d", "5d", "6d"];
const monthPeriods: FilterPeriod[] = ["1m", "2m", "3m", "4m", "5m", "6m"];
const yearPeriods: FilterPeriod[] = ["1y", "2y", "3y", "4y", "5y"];

const periodLabels: Record<FilterPeriod, string> = {
    "1d": "1 Day", "2d": "2 Days", "3d": "3 Days", "4d": "4 Days", "5d": "5 Days", "6d": "6 Days",
    "1m": "1 Month", "2m": "2 Months", "3m": "3 Months", "4m": "4 Months", "5m": "5 Months", "6m": "6 Months",
    "1y": "1 Year", "2y": "2 Years", "3y": "3 Years", "4y": "4 Years", "5y": "5 Years",
    all: "All Time",
};

// Short labels for button display
const periodShortLabels: Record<FilterPeriod, string> = {
    "1d": "1D", "2d": "2D", "3d": "3D", "4d": "4D", "5d": "5D", "6d": "6D",
    "1m": "1M", "2m": "2M", "3m": "3M", "4m": "4M", "5m": "5M", "6m": "6M",
    "1y": "1Y", "2y": "2Y", "3y": "3Y", "4y": "4Y", "5y": "5Y",
    all: "All",
};

// Premium-locked filter periods (all year options + all time)
const premiumFilters: FilterPeriod[] = [...yearPeriods, "all"];

// All periods for validation
const allPeriods: FilterPeriod[] = [...dayPeriods, ...monthPeriods, ...yearPeriods, "all"];

// Icon options for custom categories
const iconOptions = [
    "📌", "🎯", "💼", "📱", "🎮", "🎵", "📚", "✈️", "🏠", "🚀",
    "💎", "🎁", "🏋️", "🎨", "🍿", "☕", "🍺", "🎭", "🎪", "🎲",
    "🛒", "💊", "🎓", "👔", "👗", "👶", "🐕", "🌱", "⚡", "💡",
];

// Formatter for date labels
const dateLabelFormatter = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
});

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
        return dateLabelFormatter.format(date);
    }
};

const toDateInputValue = (dateString: string): string => {
    const date = new Date(dateString);
    const offsetMs = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
};

const toLocalIsoString = (dateInput: string): string | null => {
    if (!dateInput) return null;
    const [year, month, day] = dateInput.split("-").map(Number);
    if (!year || !month || !day) return null;
    const localDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    return localDate.toISOString();
};

const getTodayInputValue = (): string => toDateInputValue(new Date().toISOString());

function MoneyDrainPage() {
    const [mounted, setMounted] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
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
    } = useTransactions(selectedAccount);

    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [currency, setCurrency] = useState<CurrencyType>("IDR");
    const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("1d");
    const [pendingCurrency, setPendingCurrency] = useState<CurrencyType | null>(null);
    const [showConvertDialog, setShowConvertDialog] = useState(false);
    const [formData, setFormData] = useState({
        description: "",
        amount: "",
        type: "expense" as "income" | "expense",
        category: "other",
        date: getTodayInputValue(),
    });
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newCategoryIcon, setNewCategoryIcon] = useState("📌");
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [showPricingView, setShowPricingView] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const amountInputRef = useRef<HTMLInputElement | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [quickAddPresets, setQuickAddPresets] = useState<Array<{ id: string; description: string; amount: number; category: string; type: "income" | "expense" }>>([]);
    const [showWrapped, setShowWrapped] = useState(false);

    // Check for premium subscription access (check both plan and feature)
    const { has, isLoaded } = useAuth();
    const hasPremiumAccess = isLoaded && (has?.({ plan: "premium" }) || has?.({ feature: "1_year_and_all_filter" }));

    // Hydration-safe mounting state (js-cache-storage: batch localStorage reads)
    useEffect(() => {
        const timer = requestAnimationFrame(() => {
            // Batch all localStorage reads upfront
            const savedTheme = localStorage.getItem("money-drain-theme");
            const savedCurrency = localStorage.getItem("money-drain-currency") as CurrencyType;
            const savedPeriod = localStorage.getItem("money-drain-period") as FilterPeriod;
            const savedPresets = localStorage.getItem("money-drain-quick-presets");

            setMounted(true);

            // Apply theme
            const prefersDark = savedTheme !== "light";
            setIsDarkMode(prefersDark);
            if (prefersDark) {
                document.documentElement.classList.add("dark");
            } else {
                document.documentElement.classList.remove("dark");
            }

            // Apply preferences
            if (savedCurrency && currencyOrder.includes(savedCurrency)) {
                setCurrency(savedCurrency);
            }
            if (savedPeriod && allPeriods.includes(savedPeriod)) {
                setFilterPeriod(savedPeriod);
            }
            if (savedPresets) {
                try { setQuickAddPresets(JSON.parse(savedPresets)); } catch { /* ignore */ }
            }
        });
        return () => cancelAnimationFrame(timer);
    }, []);

    useEffect(() => {
        if (!isDirty) return;
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isDirty]);

    // Save quick add presets
    useEffect(() => {
        if (mounted && quickAddPresets.length > 0) {
            localStorage.setItem("money-drain-quick-presets", JSON.stringify(quickAddPresets));
        }
    }, [quickAddPresets, mounted]);

    // Keyboard handler for wrapped view
    useEffect(() => {
        if (!showWrapped) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setShowWrapped(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [showWrapped]);

    useEffect(() => {
        if (!mounted) return;
        const accountParam = searchParams.get("account");
        const periodParam = searchParams.get("period");
        const parsedAccount = accountParam ? Number.parseInt(accountParam, 10) : null;

        if (parsedAccount && [1, 2, 3].includes(parsedAccount)) {
            setSelectedAccount(parsedAccount as 1 | 2 | 3);
        }
        if (periodParam && allPeriods.includes(periodParam as FilterPeriod)) {
            setFilterPeriod(periodParam as FilterPeriod);
        }
    }, [mounted, searchParams]);

    useEffect(() => {
        if (!mounted) return;
        const nextAccount = String(selectedAccount);
        const currentAccount = searchParams.get("account");
        const currentPeriod = searchParams.get("period");

        if (currentAccount === nextAccount && currentPeriod === filterPeriod) return;
        const params = new URLSearchParams(searchParams.toString());
        params.set("account", nextAccount);
        params.set("period", filterPeriod);
        router.replace(`${pathname}?${params.toString()}`);
    }, [filterPeriod, mounted, pathname, router, searchParams, selectedAccount]);

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

    // Handle period selection from dropdown - with premium filter gating
    const handlePeriodSelect = (period: FilterPeriod) => {
        // Check if selected period is premium-locked
        if (premiumFilters.includes(period) && !hasPremiumAccess) {
            setShowPricingView(true);
            return;
        }

        setFilterPeriod(period);
    };

    // Handle closing pricing view - reset to 1D filter
    const handleClosePricingView = () => {
        setShowPricingView(false);
        setFilterPeriod("1d");
    };

    // Filter transactions by period and search query
    const filteredTransactions = useMemo(() => {
        let filtered = filterTransactionsByPeriod(transactions, filterPeriod);
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(t =>
                t.description.toLowerCase().includes(query) ||
                t.category.toLowerCase().includes(query)
            );
        }
        return filtered;
    }, [transactions, filterPeriod, searchQuery]);

    // Calculate all totals in a single pass (js-combine-iterations)
    const { balance, income, expenses, expensesByCategory, incomeByCategory } = useMemo(() => {
        let totalIncome = 0;
        let totalExpenses = 0;
        const expenseCategoryTotals: Record<string, number> = {};
        const incomeCategoryTotals: Record<string, number> = {};

        for (const t of filteredTransactions) {
            if (t.type === "income") {
                totalIncome += t.amount;
                incomeCategoryTotals[t.category] = (incomeCategoryTotals[t.category] || 0) + t.amount;
            } else {
                totalExpenses += t.amount;
                expenseCategoryTotals[t.category] = (expenseCategoryTotals[t.category] || 0) + t.amount;
            }
        }

        return {
            balance: totalIncome - totalExpenses,
            income: totalIncome,
            expenses: totalExpenses,
            expensesByCategory: Object.entries(expenseCategoryTotals)
                .map(([category, amount]) => ({ category, amount }))
                .sort((a, b) => b.amount - a.amount),
            incomeByCategory: Object.entries(incomeCategoryTotals)
                .map(([category, amount]) => ({ category, amount }))
                .sort((a, b) => b.amount - a.amount),
        };
    }, [filteredTransactions]);

    const recentTransactions = useMemo(() => {
        return [...filteredTransactions]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [filteredTransactions]);

    const [showAllTransactions, setShowAllTransactions] = useState(false);
    const [categoryViewFilter, setCategoryViewFilter] = useState<"all" | "expense" | "income">("all");
    const VISIBLE_TRANSACTIONS = 5;
    const displayedTransactions = showAllTransactions
        ? recentTransactions
        : recentTransactions.slice(0, VISIBLE_TRANSACTIONS);
    const hiddenCount = recentTransactions.length - VISIBLE_TRANSACTIONS;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.amount) {
            setFormError("Enter an amount.");
            amountInputRef.current?.focus();
            return;
        }
        setFormError(null);
        setIsSubmitting(true);

        // Auto-generate description if empty
        const description = formData.description.trim() ||
            (formData.type === "income" ? "Income" : getCategoryInfo(formData.category).name);

        // Parse amount: strip IDR thousands separator (.) before parsing
        const amountStr = currency === "IDR" ? formData.amount.replace(/\./g, "") : formData.amount;
        const amount = parseFloat(amountStr);

        try {
            if (editingId) {
                // Update existing transaction
                const isoDate = toLocalIsoString(formData.date);
                await updateTransaction(editingId, {
                    description,
                    amount,
                    type: formData.type,
                    category: formData.category,
                    date: isoDate ?? undefined,
                });
                setEditingId(null);
            } else {
                // Add new transaction
                await addTransaction({
                    description,
                    amount,
                    type: formData.type,
                    category: formData.category,
                    date: new Date().toISOString(),
                });
            }
        } finally {
            setIsSubmitting(false);
        }

        setFormData({
            description: "",
            amount: "",
            type: "expense",
            category: "other",
            date: getTodayInputValue(),
        });
        setShowAddForm(false);
        setIsDirty(false);
    };

    const startEdit = (transaction: Transaction) => {
        // Format amount for display based on currency
        let displayAmount: string;
        if (currency === "IDR") {
            // IDR: format with . as thousands separator
            displayAmount = transaction.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        } else if (currency === "USD") {
            // USD: show with 2 decimal places
            displayAmount = transaction.amount.toFixed(2);
        } else {
            // JPY: plain number
            displayAmount = transaction.amount.toString();
        }
        setFormData({
            description: transaction.description,
            amount: displayAmount,
            type: transaction.type,
            category: transaction.category,
            date: toDateInputValue(transaction.date),
        });
        setEditingId(transaction.id);
        setShowAddForm(true);
        setIsDirty(false);
    };

    const getCategoryInfo = (categoryId: string) => {
        const allCategories = [...getCategories("expense"), ...getCategories("income")];
        return (
            allCategories.find((c) => c.id === categoryId) ||
            { id: "other", name: "Other", icon: "📦", color: "oklch(0.55 0 0)" }
        );
    };

    // Quick add a preset
    const handleQuickAdd = async (preset: typeof quickAddPresets[0]) => {
        await addTransaction({
            description: preset.description,
            amount: preset.amount,
            type: preset.type,
            category: preset.category,
            date: new Date().toISOString(),
        });
    };

    // Save current form as quick add preset
    const saveAsPreset = () => {
        if (!formData.description || !formData.amount) return;
        // Parse amount: strip IDR thousands separator (.) before parsing
        const amountStr = currency === "IDR" ? formData.amount.replace(/\./g, "") : formData.amount;
        const newPreset = {
            id: Math.random().toString(36).substring(2, 9),
            description: formData.description,
            amount: parseFloat(amountStr),
            category: formData.category,
            type: formData.type,
        };
        setQuickAddPresets(prev => [...prev, newPreset]);
    };

    // Delete a quick add preset (rerender-functional-setstate)
    const deletePreset = (id: string) => {
        setQuickAddPresets(prev => {
            const next = prev.filter(p => p.id !== id);
            if (next.length === 0) {
                localStorage.removeItem("money-drain-quick-presets");
            }
            return next;
        });
    };

    const downloadFile = (content: string, mimeType: string, filename: string) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const getReportFilename = (extension: "csv" | "json") => {
        const date = new Date().toISOString().split("T")[0];
        return `money-drain-report-account${selectedAccount}-${filterPeriod}-${date}.${extension}`;
    };

    const exportReportAsCsv = () => {
        const headers = ["Date", "Description", "Category", "Type", "Amount"];
        const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
        const rows = filteredTransactions.map((t: Transaction) => [
            new Intl.DateTimeFormat(undefined).format(new Date(t.date)),
            t.description,
            t.category,
            t.type,
            t.amount.toString(),
        ]);
        const csv = [headers, ...rows]
            .map((row) => row.map((cell) => escapeCsv(String(cell))).join(","))
            .join("\n");

        downloadFile(csv, "text/csv;charset=utf-8;", getReportFilename("csv"));
    };

    const exportReportAsJson = () => {
        const reportData = {
            account: selectedAccount,
            period: filterPeriod,
            periodLabel: periodLabels[filterPeriod],
            currency,
            exportedAt: new Date().toISOString(),
            transactions: filteredTransactions,
        };

        downloadFile(JSON.stringify(reportData, null, 2), "application/json;charset=utf-8;", getReportFilename("json"));
    };

    // Wrapped stats
    const wrappedStats = useMemo(() => {
        if (filteredTransactions.length === 0) return null;

        const expenseTransactions = filteredTransactions.filter(t => t.type === "expense");

        // Biggest expense
        const biggestExpense = expenseTransactions.length > 0
            ? expenseTransactions.reduce((max, t) => t.amount > max.amount ? t : max, expenseTransactions[0])
            : null;

        // Most frequent category
        const categoryCount: Record<string, number> = {};
        expenseTransactions.forEach(t => {
            categoryCount[t.category] = (categoryCount[t.category] || 0) + 1;
        });
        const mostFrequentCategory = Object.entries(categoryCount).length > 0
            ? Object.entries(categoryCount).reduce((max, [cat, count]) => count > max[1] ? [cat, count] : max, ["", 0])
            : null;

        // Day of week analysis
        const dayTotals: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        expenseTransactions.forEach(t => {
            const day = new Date(t.date).getDay();
            dayTotals[day] += t.amount;
        });
        const biggestSpendingDay = Object.entries(dayTotals).reduce((max, [day, amount]) =>
            amount > max[1] ? [parseInt(day), amount] : max, [0, 0]
        );

        // Transaction count
        const totalTransactions = filteredTransactions.length;

        // Average transaction
        const avgExpense = expenseTransactions.length > 0
            ? expenses / expenseTransactions.length
            : 0;

        // Savings rate
        const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

        // Top 3 categories
        const top3Categories = expensesByCategory.slice(0, 3);

        return {
            biggestExpense,
            mostFrequentCategory: mostFrequentCategory ? {
                category: mostFrequentCategory[0] as string,
                count: mostFrequentCategory[1] as number
            } : null,
            biggestSpendingDay: {
                day: dayNames[biggestSpendingDay[0] as number],
                amount: biggestSpendingDay[1] as number
            },
            totalTransactions,
            avgExpense,
            savingsRate,
            top3Categories,
            totalExpenses: expenses,
            totalIncome: income,
            balance,
        };
    }, [filteredTransactions, expenses, income, balance, expensesByCategory]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse motion-reduce:animate-none text-muted-foreground text-sm">Loading…</div>
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

            {/* Monthly Report View - Minimal and digestible */}
            {showWrapped && wrappedStats && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-sm p-3 sm:p-5 animate-in fade-in duration-200 motion-reduce:animate-none">
                    <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto overscroll-contain border-border/80 shadow-lg">
                        <CardContent className="p-4 sm:p-6 space-y-5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Monthly Report</p>
                                    <h2 className="text-xl sm:text-2xl font-semibold text-balance">
                                        {periodLabels[filterPeriod]} overview
                                    </h2>
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                        {wrappedStats.totalTransactions} transactions in this period
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowWrapped(false)}
                                    aria-label="Close report"
                                    className="shrink-0"
                                >
                                    <IconX className="size-4" aria-hidden="true" />
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
                                <div className="rounded-xl border border-border/70 bg-card/70 p-3 sm:p-4 space-y-1">
                                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Income</p>
                                    <p className="text-sm sm:text-base font-semibold text-emerald-500 truncate" title={formatCurrency(wrappedStats.totalIncome, currency)}>
                                        {formatCurrency(wrappedStats.totalIncome, currency)}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-border/70 bg-card/70 p-3 sm:p-4 space-y-1">
                                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Expenses</p>
                                    <p className="text-sm sm:text-base font-semibold text-rose-500 truncate" title={formatCurrency(wrappedStats.totalExpenses, currency)}>
                                        {formatCurrency(wrappedStats.totalExpenses, currency)}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-border/70 bg-card/70 p-3 sm:p-4 space-y-1">
                                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Balance</p>
                                    <p className={`text-sm sm:text-base font-semibold truncate ${wrappedStats.balance >= 0 ? "text-primary" : "text-destructive"}`} title={formatCurrency(wrappedStats.balance, currency)}>
                                        {wrappedStats.balance >= 0 ? "+" : ""}{formatCurrency(wrappedStats.balance, currency)}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-border/70 bg-card/70 p-3 sm:p-4 space-y-1">
                                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Savings Rate</p>
                                    <p className="text-sm sm:text-base font-semibold tabular-nums">
                                        {wrappedStats.savingsRate.toFixed(0)}%
                                    </p>
                                    <p className={`text-[11px] ${wrappedStats.savingsRate >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                        {wrappedStats.savingsRate >= 0 ? "Within budget" : "Over budget"}
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
                                <section className="rounded-xl border border-border/70 bg-card/70 p-4 space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <h3 className="text-sm font-semibold">Top Categories</h3>
                                        <span className="text-[11px] text-muted-foreground">By expense share</span>
                                    </div>
                                    <div className="space-y-3">
                                        {wrappedStats.top3Categories.map(({ category, amount }, index) => {
                                            const catInfo = getCategoryInfo(category);
                                            const percentage = wrappedStats.totalExpenses > 0 ? (amount / wrappedStats.totalExpenses) * 100 : 0;

                                            return (
                                                <div key={category} className="space-y-1.5">
                                                    <div className="flex items-center justify-between gap-2 text-sm">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="inline-flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                                                                {index + 1}
                                                            </span>
                                                            <span className="text-base leading-none" aria-hidden="true">{catInfo.icon}</span>
                                                            <span className="truncate font-medium">{catInfo.name}</span>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className="font-medium tabular-nums">{formatCurrency(amount, currency)}</p>
                                                            <p className="text-[11px] text-muted-foreground">{percentage.toFixed(0)}%</p>
                                                        </div>
                                                    </div>
                                                    <div
                                                        className="h-1.5 rounded-full bg-muted overflow-hidden"
                                                        role="progressbar"
                                                        aria-valuenow={Math.round(percentage)}
                                                        aria-valuemin={0}
                                                        aria-valuemax={100}
                                                        aria-label={`${catInfo.name} spending share`}
                                                    >
                                                        <div
                                                            className="h-full rounded-full bg-foreground/70"
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {wrappedStats.top3Categories.length === 0 && (
                                            <p className="text-sm text-muted-foreground">No expense transactions in this period.</p>
                                        )}
                                    </div>
                                </section>

                                <section className="rounded-xl border border-border/70 bg-card/70 p-4 space-y-3">
                                    <h3 className="text-sm font-semibold">Highlights</h3>
                                    <dl className="space-y-2 text-sm">
                                        <div className="rounded-lg bg-muted/40 px-3 py-2 space-y-1">
                                            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Biggest Expense</dt>
                                            <dd className="font-medium">
                                                {wrappedStats.biggestExpense ? (
                                                    <>
                                                        <p className="truncate" title={wrappedStats.biggestExpense.description}>{wrappedStats.biggestExpense.description}</p>
                                                        <p className="text-rose-500">{formatCurrency(wrappedStats.biggestExpense.amount, currency)}</p>
                                                    </>
                                                ) : (
                                                    <p className="text-muted-foreground">No expense data</p>
                                                )}
                                            </dd>
                                        </div>

                                        <div className="rounded-lg bg-muted/40 px-3 py-2 space-y-1">
                                            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Most Frequent Category</dt>
                                            <dd className="font-medium">
                                                {wrappedStats.mostFrequentCategory ? (
                                                    <>
                                                        <p className="truncate" title={getCategoryInfo(wrappedStats.mostFrequentCategory.category).name}>
                                                            {getCategoryInfo(wrappedStats.mostFrequentCategory.category).icon} {getCategoryInfo(wrappedStats.mostFrequentCategory.category).name}
                                                        </p>
                                                        <p className="text-muted-foreground text-xs">{wrappedStats.mostFrequentCategory.count} entries</p>
                                                    </>
                                                ) : (
                                                    <p className="text-muted-foreground">No category trend yet</p>
                                                )}
                                            </dd>
                                        </div>

                                        <div className="rounded-lg bg-muted/40 px-3 py-2 space-y-1">
                                            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Top Spending Day</dt>
                                            <dd className="font-medium">
                                                {wrappedStats.biggestSpendingDay.amount > 0 ? (
                                                    <>
                                                        <p>{wrappedStats.biggestSpendingDay.day}</p>
                                                        <p className="text-muted-foreground text-xs">{formatCurrency(wrappedStats.biggestSpendingDay.amount, currency)}</p>
                                                    </>
                                                ) : (
                                                    <p className="text-muted-foreground">No day trend yet</p>
                                                )}
                                            </dd>
                                        </div>

                                        <div className="rounded-lg bg-muted/40 px-3 py-2 space-y-1">
                                            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Average Expense</dt>
                                            <dd className="font-medium">
                                                {wrappedStats.totalExpenses > 0
                                                    ? formatCurrency(wrappedStats.avgExpense, currency)
                                                    : <span className="text-muted-foreground">No expense data</span>}
                                            </dd>
                                        </div>
                                    </dl>
                                </section>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={exportReportAsCsv} aria-label="Export report as CSV">
                                        Export CSV
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={exportReportAsJson} aria-label="Export report as JSON">
                                        Export JSON
                                    </Button>
                                </div>
                                <Button variant="outline" className="min-w-32" onClick={() => setShowWrapped(false)}>
                                    Close report
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Premium Pricing View - Full Page */}
            {showPricingView ? (
                <div className="min-h-screen bg-background p-4">
                    <div className="max-w-2xl mx-auto">
                        <div className="text-center mb-6">
                            <div className="size-16 rounded-full bg-linear-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4">
                                <IconLock className="size-8 text-white" aria-hidden="true" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2 text-balance scroll-mt-24">Upgrade to Premium</h1>
                            <p className="text-muted-foreground">
                                Unlock the <strong>1 Year</strong> and <strong>All Time</strong> filters to view your complete financial history
                            </p>
                        </div>

                        <div className="mb-6">
                            <PricingTable />
                        </div>

                        <div className="text-center">
                            <Button
                                variant="ghost"
                                onClick={handleClosePricingView}
                                className="text-muted-foreground"
                            >
                                Maybe Later
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (

                <div className="min-h-screen bg-background p-3">
                    <div className="max-w-md mx-auto space-y-3">
                        {/* Top Bar - Currency, Account & Filter */}
                        <div className="flex items-center justify-between">
                            {/* Currency Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-1.5 font-semibold min-w-[70px]"
                                        >
                                        <IconCoin className="size-3.5" aria-hidden="true" />
                                        {currencyLabels[currency]}
                                        <IconChevronDown className="size-3 ml-0.5" aria-hidden="true" />
                                        </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    {currencyOrder.map((curr) => (
                                        <DropdownMenuItem
                                            key={curr}
                                            onClick={() => {
                                                if (curr !== currency) {
                                                    if (transactions.length > 0) {
                                                        setPendingCurrency(curr);
                                                        setShowConvertDialog(true);
                                                    } else {
                                                        setCurrency(curr);
                                                    }
                                                }
                                            }}
                                            className={`flex items-center gap-2 ${currency === curr ? 'bg-accent' : ''}`}
                                        >
                                            <span className="font-semibold w-6">{currencyLabels[curr]}</span>
                                            <span className="text-muted-foreground">{curr}</span>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

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

                            {/* Period Filter Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1.5 font-semibold min-w-[70px]"
                                    >
                                        <IconClock className="size-3.5" aria-hidden="true" />
                                        {periodShortLabels[filterPeriod]}
                                        <IconChevronDown className="size-3 ml-0.5" aria-hidden="true" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    {/* Days Submenu */}
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                            <span className="flex items-center gap-2">
                                                Days
                                                {dayPeriods.includes(filterPeriod) && (
                                                    <span className="text-[9px] px-1 py-0.5 rounded bg-primary/20 text-primary">Active</span>
                                                )}
                                            </span>
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent>
                                            {dayPeriods.map((period) => (
                                                <DropdownMenuItem
                                                    key={period}
                                                    onClick={() => handlePeriodSelect(period)}
                                                    className={filterPeriod === period ? 'bg-accent' : ''}
                                                >
                                                    {periodLabels[period]}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>

                                    {/* Months Submenu */}
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                            <span className="flex items-center gap-2">
                                                Months
                                                {monthPeriods.includes(filterPeriod) && (
                                                    <span className="text-[9px] px-1 py-0.5 rounded bg-primary/20 text-primary">Active</span>
                                                )}
                                            </span>
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent>
                                            {monthPeriods.map((period) => (
                                                <DropdownMenuItem
                                                    key={period}
                                                    onClick={() => handlePeriodSelect(period)}
                                                    className={filterPeriod === period ? 'bg-accent' : ''}
                                                >
                                                    {periodLabels[period]}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>

                                    <DropdownMenuSeparator />

                                    {/* Years Submenu (Premium) */}
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                            <span className="flex items-center gap-2">
                                                Years
                                                <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-linear-to-r from-amber-500/20 to-orange-500/20 text-amber-500 font-medium">
                                                    <IconCrown className="size-2.5" aria-hidden="true" />
                                                    Premium
                                                </span>
                                                {yearPeriods.includes(filterPeriod) && (
                                                    <span className="text-[9px] px-1 py-0.5 rounded bg-primary/20 text-primary">Active</span>
                                                )}
                                            </span>
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent>
                                            {yearPeriods.map((period) => {
                                                const isLocked = !hasPremiumAccess;
                                                return (
                                                    <DropdownMenuItem
                                                        key={period}
                                                        onClick={() => handlePeriodSelect(period)}
                                                        className={`flex items-center justify-between ${filterPeriod === period ? 'bg-accent' : ''}`}
                                                    >
                                                        {periodLabels[period]}
                                                        {isLocked && <IconLock className="size-3 text-amber-500" aria-hidden="true" />}
                                                    </DropdownMenuItem>
                                                );
                                            })}
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>

                                    <DropdownMenuSeparator />

                                    {/* All Time (Premium) */}
                                    <DropdownMenuItem
                                        onClick={() => handlePeriodSelect("all")}
                                        className={`flex items-center justify-between ${filterPeriod === "all" ? 'bg-accent' : ''}`}
                                    >
                                        <span className="flex items-center gap-2">
                                            All Time
                                            <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-linear-to-r from-amber-500/20 to-orange-500/20 text-amber-500 font-medium">
                                                <IconCrown className="size-2.5" aria-hidden="true" />
                                                Premium
                                            </span>
                                        </span>
                                        {!hasPremiumAccess && <IconLock className="size-3 text-amber-500" aria-hidden="true" />}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Stats - With Labels */}
                        <Card className="bg-card/60 overflow-hidden">
                            <div className="grid grid-cols-3 divide-x divide-border/50">
                                {/* Expense */}
                                <div className="p-3 flex flex-col items-center gap-1 cursor-default hover:bg-muted/30 transition-colors">
                                    <div className="size-8 rounded-md bg-rose-500/10 flex items-center justify-center">
                                        <IconTrendingDown className="size-4 text-rose-500" aria-hidden="true" />
                                    </div>
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Expense</p>
                                    <p className="text-sm font-bold tabular-nums text-rose-500">
                                        {formatCurrency(expenses, currency)}
                                    </p>
                                </div>

                                {/* Income */}
                                <div className="p-3 flex flex-col items-center gap-1 cursor-default hover:bg-muted/30 transition-colors">
                                    <div className="size-8 rounded-md bg-emerald-500/10 flex items-center justify-center">
                                        <IconTrendingUp className="size-4 text-emerald-500" aria-hidden="true" />
                                    </div>
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Income</p>
                                    <p className="text-sm font-bold tabular-nums text-emerald-500">
                                        {formatCurrency(income, currency)}
                                    </p>
                                </div>

                                {/* Bank (Balance) */}
                                <div className="p-3 flex flex-col items-center gap-1 cursor-default hover:bg-muted/30 transition-colors">
                                    <div className="size-8 rounded-md bg-primary/10 flex items-center justify-center">
                                        <IconBuildingBank className="size-4 text-primary" aria-hidden="true" />
                                    </div>
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Bank</p>
                                    <p className={`text-sm font-bold tabular-nums ${balance >= 0 ? "text-primary" : "text-destructive"}`}>
                                        {formatCurrency(balance, currency)}
                                    </p>
                                </div>
                            </div>
                        </Card>

                        {/* Add Button - Centered */}
                        <div className="flex justify-center gap-2">
                            <Tooltip content={showAddForm ? "Close" : "Add"}>
                                <Button
                                    size="lg"
                                    onClick={() => {
                                        setShowAddForm(!showAddForm);
                                        setShowQuickAdd(false);
                                        setIsDirty(false);
                                        setFormError(null);
                                    }}
                                    className="size-10 p-0"
                                    aria-label={showAddForm ? "Close add transaction" : "Add transaction"}
                                >
                                    <IconPlus className={`size-5 transition-transform duration-200 motion-reduce:transition-none motion-reduce:transform-none ${showAddForm ? "rotate-45" : ""}`} aria-hidden="true" />
                                </Button>
                            </Tooltip>
                            {quickAddPresets.length > 0 && (
                                <Tooltip content={showQuickAdd ? "Close Quick Add" : "Quick Add"}>
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        onClick={() => {
                                            setShowQuickAdd(!showQuickAdd);
                                            setShowAddForm(false);
                                        }}
                                        className="size-10 p-0"
                                        aria-label={showQuickAdd ? "Close quick add" : "Quick add"}
                                    >
                                        <IconBolt className={`size-5 transition-transform duration-200 motion-reduce:transition-none ${showQuickAdd ? "text-primary" : ""}`} aria-hidden="true" />
                                    </Button>
                                </Tooltip>
                            )}
                        </div>

                        {/* Quick Add Presets */}
                        {showQuickAdd && quickAddPresets.length > 0 && (
                            <Card className="border-primary/20 animate-in slide-in-from-top-2 duration-200 motion-reduce:animate-none motion-reduce:transition-none">
                                <CardContent className="p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                                            <IconBolt className="size-3" aria-hidden="true" />
                                            <span>Quick Add</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {quickAddPresets.map(preset => (
                                            <div key={preset.id} className="relative group">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleQuickAdd(preset)}
                                                    className="w-full justify-start text-left h-auto py-2 pr-8"
                                                >
                                                    <div className="flex flex-col items-start gap-0.5 min-w-0">
                                                        <span className="text-xs font-medium truncate w-full">{preset.description}</span>
                                                        <span className={`text-[10px] tabular-nums ${preset.type === "income" ? "text-emerald-500" : "text-rose-500"}`}>
                                                            {preset.type === "income" ? "+" : "-"}{formatCurrency(preset.amount, currency)}
                                                        </span>
                                                    </div>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => deletePreset(preset.id)}
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    aria-label={`Delete ${preset.description} preset`}
                                                >
                                                    <IconX className="size-3" aria-hidden="true" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Add Transaction Form */}
                        {showAddForm && (
                            <Card className="border-primary/20 animate-in slide-in-from-top-2 duration-200 motion-reduce:animate-none motion-reduce:transition-none">
                                <CardContent className="p-3">
                                    <form onSubmit={handleSubmit} className="space-y-3">
                                        {/* Type Toggle */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button
                                                type="button"
                                                variant={formData.type === "expense" ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => {
                                                    setFormData({ ...formData, type: "expense" });
                                                    setIsDirty(true);
                                                }}
                                            >
                                                <IconArrowDown data-icon="inline-start" className="size-3.5" aria-hidden="true" />
                                                Expense
                                            </Button>
                                            <Button
                                                type="button"
                                                variant={formData.type === "income" ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => {
                                                    setFormData({ ...formData, type: "income" });
                                                    setIsDirty(true);
                                                }}
                                            >
                                                <IconArrowUp data-icon="inline-start" className="size-3.5" aria-hidden="true" />
                                                Income
                                            </Button>
                                        </div>

                                        {/* Description & Amount */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input
                                                placeholder="Description… e.g. Coffee"
                                                name="description"
                                                aria-label="Description"
                                                autoComplete="off"
                                                value={formData.description}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, description: e.target.value });
                                                    setIsDirty(true);
                                                }}
                                            />
                                            <Input
                                                type="text"
                                                inputMode="decimal"
                                                placeholder={currency === "USD" ? "Amount… e.g. 12.50" : currency === "IDR" ? "Amount… e.g. 50.000" : "Amount… e.g. 50000"}
                                                name="amount"
                                                aria-label="Amount"
                                                autoComplete="off"
                                                ref={amountInputRef}
                                                value={formData.amount}
                                                onChange={(e) => {
                                                    // Strip non-digits
                                                    const digits = e.target.value.replace(/\D/g, "");
                                                    if (!digits) {
                                                        setFormData({ ...formData, amount: "" });
                                                        return;
                                                    }
                                                    if (currency === "IDR") {
                                                        // IDR: format with . as thousands separator
                                                        const num = digits.replace(/^0+/, "") || "0";
                                                        const formatted = num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                                                        setFormData({ ...formData, amount: formatted });
                                                    } else if (currency === "JPY") {
                                                        // JPY: whole numbers only, no separator
                                                        const cleaned = digits.replace(/^0+/, "") || "0";
                                                        setFormData({ ...formData, amount: cleaned });
                                                    } else {
                                                        // USD: cents-first formatting (auto decimal 2 places from right)
                                                        const cents = parseInt(digits, 10);
                                                        const formatted = (cents / 100).toFixed(2);
                                                        setFormData({ ...formData, amount: formatted });
                                                    }
                                                    setFormError(null);
                                                    setIsDirty(true);
                                                }}
                                            />
                                        </div>
                                        {formError && (
                                            <p className="text-xs text-destructive" role="status" aria-live="polite">
                                                {formError}
                                            </p>
                                        )}

                                        {/* Date (edit only) */}
                                        {editingId && (
                                            <Input
                                                type="date"
                                                value={formData.date}
                                                name="date"
                                                aria-label="Transaction date"
                                                autoComplete="off"
                                                onChange={(e) => {
                                                    setFormData({ ...formData, date: e.target.value });
                                                    setIsDirty(true);
                                                }}
                                            />
                                        )}

                                        {/* Category */}
                                        <div className="flex gap-2">
                                            <Select
                                                value={formData.category}
                                                onValueChange={(value) => {
                                                    if (value === "__add_new__") {
                                                        setShowAddCategory(true);
                                                    } else {
                                                        setFormData({ ...formData, category: value });
                                                        setIsDirty(true);
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className="flex-1" aria-label="Category" name="category">
                                                    <SelectValue placeholder="Category… e.g. Food" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {getCategories(formData.type).map((category: Category) => (
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
                                                        setIsDirty(true);
                                                    }}
                                                    className="px-2 text-muted-foreground hover:text-destructive hover:border-destructive"
                                                    aria-label="Delete custom category"
                                                >
                                                    <IconTrash className="size-4" aria-hidden="true" />
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
                                                            className={`size-7 flex items-center justify-center rounded-md text-sm transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${newCategoryIcon === icon ? "bg-primary/20 ring-1 ring-primary" : ""}`}
                                                            aria-label={`Select ${icon} icon`}
                                                        >
                                                            {icon}
                                                        </button>
                                                    ))}
                                                </div>
                                                <Input
                                                    placeholder="Category name… e.g. Gym"
                                                    name="category-name"
                                                    aria-label="Category name"
                                                    autoComplete="off"
                                                    value={newCategoryName}
                                                    onChange={(e) => {
                                                        setNewCategoryName(e.target.value);
                                                        setIsDirty(true);
                                                    }}
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
                                                            setIsDirty(false);
                                                        }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        className="flex-1"
                                                        onClick={async () => {
                                                            if (newCategoryName.trim()) {
                                                                const cat = await addCustomCategory(formData.type, {
                                                                    name: newCategoryName.trim(),
                                                                    icon: newCategoryIcon || "📌",
                                                                    color: "oklch(0.55 0.15 200)",
                                                                });
                                                                setFormData({ ...formData, category: cat.id });
                                                                setShowAddCategory(false);
                                                                setNewCategoryName("");
                                                                setNewCategoryIcon("📌");
                                                                setIsDirty(true);
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
                                            <div className="space-y-2">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Button type="button" variant="outline" size="sm" onClick={() => { setShowAddForm(false); setEditingId(null); setIsDirty(false); setFormError(null); }}>
                                                        Cancel
                                                    </Button>
                                                    <Button type="submit" size="sm" disabled={isSubmitting}>
                                                        {isSubmitting ? "Saving…" : (editingId ? "Save" : "Add")}
                                                    </Button>
                                                </div>
                                                {!editingId && formData.description && formData.amount && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={saveAsPreset}
                                                        className="w-full text-xs text-muted-foreground"
                                                    >
                                                        <IconBolt className="size-3 mr-1" aria-hidden="true" />
                                                        Save as Quick Add
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </form>
                                </CardContent>
                            </Card>
                        )}

                        {/* Categories - Expenses & Income */}
                        {(expensesByCategory.length > 0 || incomeByCategory.length > 0) && (
                            <Card className="bg-card/60">
                                <CardContent className="p-3 space-y-3">
                                    {/* Header with toggle buttons */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                                            <span>📊</span>
                                            <span>Categories</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant={categoryViewFilter === "all" ? "default" : "ghost"}
                                                size="sm"
                                                onClick={() => setCategoryViewFilter("all")}
                                                className="h-6 px-2 text-[10px]"
                                            >
                                                All
                                            </Button>
                                            <Button
                                                variant={categoryViewFilter === "expense" ? "default" : "ghost"}
                                                size="sm"
                                                onClick={() => setCategoryViewFilter("expense")}
                                                className={`h-6 px-2 text-[10px] ${categoryViewFilter === "expense" ? "bg-rose-500 hover:bg-rose-600" : "text-rose-500 hover:text-rose-600"}`}
                                                aria-label="Show expenses"
                                            >
                                                <IconTrendingDown className="size-3" aria-hidden="true" />
                                            </Button>
                                            <Button
                                                variant={categoryViewFilter === "income" ? "default" : "ghost"}
                                                size="sm"
                                                onClick={() => setCategoryViewFilter("income")}
                                                className={`h-6 px-2 text-[10px] ${categoryViewFilter === "income" ? "bg-emerald-500 hover:bg-emerald-600" : "text-emerald-500 hover:text-emerald-600"}`}
                                                aria-label="Show income"
                                            >
                                                <IconTrendingUp className="size-3" aria-hidden="true" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Expense Categories */}
                                    {(categoryViewFilter === "all" || categoryViewFilter === "expense") && expensesByCategory.length > 0 && (
                                        <div className="space-y-2">
                                            {categoryViewFilter === "all" && (
                                                <div className="flex items-center gap-2 text-[10px] font-medium text-rose-500 uppercase tracking-wide">
                                                    <IconTrendingDown className="size-3" aria-hidden="true" />
                                                    <span>Expenses</span>
                                                </div>
                                            )}
                                            <div className="space-y-2">
                                                {expensesByCategory.slice(0, categoryViewFilter === "expense" ? 6 : 3).map(({ category, amount }) => {
                                                    const categoryInfo = getCategoryInfo(category);
                                                    const percentage = expenses > 0 ? (amount / expenses) * 100 : 0;

                                                    return (
                                                        <div key={category} className="space-y-1">
                                                            <div className="flex items-center justify-between text-xs">
                                                                <span className="flex items-center gap-1.5">
                                                                    <span>{categoryInfo.icon}</span>
                                                                    <span className="font-medium truncate">{categoryInfo.name}</span>
                                                                </span>
                                                                <span className="text-rose-500 tabular-nums text-[11px]">
                                                                    {formatCurrency(amount, currency)}
                                                                </span>
                                                            </div>
                                                            <div className="h-1 bg-muted rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full origin-left rounded-full bg-rose-500 transition-transform duration-300 motion-reduce:transition-none"
                                                                    style={{ transform: `scaleX(${percentage / 100})` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Income Categories */}
                                    {(categoryViewFilter === "all" || categoryViewFilter === "income") && incomeByCategory.length > 0 && (
                                        <div className="space-y-2">
                                            {categoryViewFilter === "all" && (
                                                <div className="flex items-center gap-2 text-[10px] font-medium text-emerald-500 uppercase tracking-wide">
                                                    <IconTrendingUp className="size-3" aria-hidden="true" />
                                                    <span>Income</span>
                                                </div>
                                            )}
                                            <div className="space-y-2">
                                                {incomeByCategory.slice(0, categoryViewFilter === "income" ? 6 : 3).map(({ category, amount }) => {
                                                    const categoryInfo = getCategoryInfo(category);
                                                    const percentage = income > 0 ? (amount / income) * 100 : 0;

                                                    return (
                                                        <div key={category} className="space-y-1">
                                                            <div className="flex items-center justify-between text-xs">
                                                                <span className="flex items-center gap-1.5">
                                                                    <span>{categoryInfo.icon}</span>
                                                                    <span className="font-medium truncate">{categoryInfo.name}</span>
                                                                </span>
                                                                <span className="text-emerald-500 tabular-nums text-[11px]">
                                                                    {formatCurrency(amount, currency)}
                                                                </span>
                                                            </div>
                                                            <div className="h-1 bg-muted rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full origin-left rounded-full bg-emerald-500 transition-transform duration-300 motion-reduce:transition-none"
                                                                    style={{ transform: `scaleX(${percentage / 100})` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Empty state for filtered view */}
                                    {categoryViewFilter === "expense" && expensesByCategory.length === 0 && (
                                        <p className="text-xs text-muted-foreground text-center py-2">No expenses in this period</p>
                                    )}
                                    {categoryViewFilter === "income" && incomeByCategory.length === 0 && (
                                        <p className="text-xs text-muted-foreground text-center py-2">No income in this period</p>
                                    )}
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
                                                aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                                            >
                                                {isDarkMode
                                                    ? <IconSun className="size-3" aria-hidden="true" />
                                                    : <IconMoon className="size-3" aria-hidden="true" />}
                                            </Button>
                                        </Tooltip>

                                        {/* Monthly Wrapped Button */}
                                        {filteredTransactions.length > 0 && (
                                            <Tooltip content="Monthly Report">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setShowWrapped(true)}
                                                    className="h-6 px-2 text-muted-foreground hover:text-foreground"
                                                    aria-label="View Monthly Report"
                                                >
                                                    <IconSparkles className="size-3" aria-hidden="true" />
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
                                                        aria-label="Clear all transactions"
                                                    >
                                                        <IconTrash className="size-3" aria-hidden="true" />
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

                                {/* Search Bar */}
                                <div className="relative mb-2">
                                    <IconSearch className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" aria-hidden="true" />
                                    <Input
                                        type="search"
                                        placeholder="Search transactions…"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-7 h-8 text-xs"
                                        name="search"
                                        aria-label="Search transactions"
                                        autoComplete="off"
                                    />
                                    {searchQuery && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSearchQuery("")}
                                            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                                            aria-label="Clear search"
                                        >
                                            <IconX className="size-3" aria-hidden="true" />
                                        </Button>
                                    )}
                                </div>

                                {recentTransactions.length === 0 ? (
                                    <div className="text-center py-6">
                                            <div className="size-10 rounded-full bg-muted mx-auto mb-2 flex items-center justify-center">
                                            <IconWallet className="size-4 text-muted-foreground" aria-hidden="true" />
                                            </div>
                                        <p className="text-xs text-muted-foreground">No transactions</p>
                                    </div>
                                ) : (
                                    <div
                                        className="space-y-0.5"
                                        style={
                                            recentTransactions.length > 50
                                                ? { contentVisibility: "auto", containIntrinsicSize: "1px 800px" }
                                                : undefined
                                        }
                                    >
                                        {displayedTransactions.map((transaction, index) => {
                                            const dateLabel = getDateLabel(transaction.date);
                                            const prevTransaction = index > 0 ? displayedTransactions[index - 1] : null;
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
                                        {/* Show more button */}
                                        {!showAllTransactions && hiddenCount > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setShowAllTransactions(true)}
                                                className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground"
                                            >
                                                +{hiddenCount} more transaction{hiddenCount > 1 ? 's' : ''}
                                            </Button>
                                        )}
                                        {/* Show less button */}
                                        {showAllTransactions && recentTransactions.length > VISIBLE_TRANSACTIONS && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setShowAllTransactions(false)}
                                                className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground"
                                            >
                                                Show less
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Auth Button */}
                        <AuthButton />
                    </div>
                </div>
            )}
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
                    aria-label="Edit transaction"
                >
                    <IconEdit className="size-3" aria-hidden="true" />
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon-xs"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            aria-label="Delete transaction"
                        >
                            <IconTrash className="size-3" aria-hidden="true" />
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

function AuthButton() {
    const { isSignedIn, user } = useUser();

    if (isSignedIn) {
        return (
            <Card className="bg-card/60">
                <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <UserButton />
                            <div className="text-xs">
                                <p className="font-medium">{user?.firstName || "User"}</p>
                                <p className="text-muted-foreground text-[10px]">{user?.emailAddresses?.[0]?.emailAddress}</p>
                            </div>
                        </div>
                        <SignOutButton>
                            <Button variant="outline" size="sm">
                                Sign Out
                            </Button>
                        </SignOutButton>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-card/60">
            <CardContent className="p-3">
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Sign in to sync your data</p>
                    <SignInButton mode="modal">
                        <Button variant="default" size="sm">
                            Sign In
                        </Button>
                    </SignInButton>
                </div>
            </CardContent>
        </Card>
    );
}

export default function MoneyDrain() {
    return (
        <Suspense
            fallback={(
                <div className="min-h-screen flex items-center justify-center">
                    <div className="animate-pulse motion-reduce:animate-none text-muted-foreground text-sm">Loading…</div>
                </div>
            )}
        >
            <MoneyDrainPage />
        </Suspense>
    );
}
