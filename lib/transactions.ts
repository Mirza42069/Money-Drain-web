"use client";

export interface Transaction {
    id: string;
    description: string;
    amount: number;
    type: "income" | "expense";
    category: string;
    date: string;
}

export interface Category {
    id: string;
    name: string;
    icon: string;
    color: string;
}

export type CurrencyType = "USD" | "IDR" | "JPY";

export interface CurrencyInfo {
    code: CurrencyType;
    symbol: string;
    name: string;
    locale: string;
}

export const currencies: Record<CurrencyType, CurrencyInfo> = {
    USD: { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" },
    IDR: { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah", locale: "id-ID" },
    JPY: { code: "JPY", symbol: "¥", name: "Japanese Yen", locale: "ja-JP" },
};

// Exchange rates (base: USD) - approximate rates
export const exchangeRates: Record<CurrencyType, number> = {
    USD: 1,
    IDR: 15800, // 1 USD = ~15,800 IDR
    JPY: 150,   // 1 USD = ~150 JPY
};

// Convert amount between currencies
export function convertCurrency(
    amount: number,
    fromCurrency: CurrencyType,
    toCurrency: CurrencyType
): number {
    if (fromCurrency === toCurrency) return amount;

    // Convert to USD first, then to target currency
    const amountInUSD = amount / exchangeRates[fromCurrency];
    const convertedAmount = amountInUSD * exchangeRates[toCurrency];

    // Round appropriately
    if (toCurrency === "JPY" || toCurrency === "IDR") {
        return Math.round(convertedAmount);
    }
    return Math.round(convertedAmount * 100) / 100;
}

export const defaultCategories: Category[] = [
    { id: "food", name: "Food & Dining", icon: "🍕", color: "oklch(0.7 0.18 60)" },
    { id: "transport", name: "Transport", icon: "🚗", color: "oklch(0.55 0.2 200)" },
    { id: "shopping", name: "Shopping", icon: "🛍️", color: "oklch(0.65 0.2 280)" },
    { id: "entertainment", name: "Entertainment", icon: "🎬", color: "oklch(0.6 0.22 330)" },
    { id: "bills", name: "Bills & Utilities", icon: "💡", color: "oklch(0.65 0.24 25)" },
    { id: "health", name: "Health", icon: "💊", color: "oklch(0.65 0.24 145)" },
    { id: "salary", name: "Salary", icon: "💰", color: "oklch(0.65 0.24 145)" },
    { id: "other", name: "Other", icon: "📦", color: "oklch(0.55 0 0)" },
];

export function formatCurrency(amount: number, currency: CurrencyType = "USD"): string {
    const currencyInfo = currencies[currency];

    // For JPY don't show decimals
    const options: Intl.NumberFormatOptions = {
        style: "currency",
        currency: currencyInfo.code,
        minimumFractionDigits: currency === "JPY" ? 0 : 0,
        maximumFractionDigits: currency === "JPY" ? 0 : 2,
    };

    return new Intl.NumberFormat(currencyInfo.locale, options).format(amount);
}

export function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
}

export function generateId(): string {
    return Math.random().toString(36).substring(2, 9);
}

export type FilterPeriod = "day" | "month" | "6months" | "year" | "all";

export function filterTransactionsByPeriod(
    transactions: Transaction[],
    period: FilterPeriod
): Transaction[] {
    if (period === "all") return transactions;

    const now = new Date();
    const startDate = new Date();

    switch (period) {
        case "day":
            startDate.setHours(0, 0, 0, 0);
            break;
        case "month":
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
            break;
        case "6months":
            startDate.setMonth(startDate.getMonth() - 6);
            startDate.setHours(0, 0, 0, 0);
            break;
        case "year":
            startDate.setFullYear(startDate.getFullYear() - 1);
            startDate.setHours(0, 0, 0, 0);
            break;
    }

    return transactions.filter((t) => new Date(t.date) >= startDate);
}
