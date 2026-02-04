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
  IDR: {
    code: "IDR",
    symbol: "Rp",
    name: "Indonesian Rupiah",
    locale: "id-ID",
  },
  JPY: { code: "JPY", symbol: "¥", name: "Japanese Yen", locale: "ja-JP" },
};

// Exchange rates (base: USD) - approximate rates
export const exchangeRates: Record<CurrencyType, number> = {
  USD: 1,
  IDR: 15800, // 1 USD = ~15,800 IDR
  JPY: 150, // 1 USD = ~150 JPY
};

// Convert amount between currencies
export function convertCurrency(
  amount: number,
  fromCurrency: CurrencyType,
  toCurrency: CurrencyType,
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

export const defaultExpenseCategories: Category[] = [
  {
    id: "food",
    name: "Food & Dining",
    icon: "🍕",
    color: "oklch(0.7 0.18 60)",
  },
  {
    id: "transport",
    name: "Transport",
    icon: "🚗",
    color: "oklch(0.55 0.2 200)",
  },
  {
    id: "shopping",
    name: "Shopping",
    icon: "🛍️",
    color: "oklch(0.65 0.2 280)",
  },
  {
    id: "entertainment",
    name: "Entertainment",
    icon: "🎬",
    color: "oklch(0.6 0.22 330)",
  },
  {
    id: "bills",
    name: "Bills & Utilities",
    icon: "💡",
    color: "oklch(0.65 0.24 25)",
  },
  { id: "health", name: "Health", icon: "💊", color: "oklch(0.65 0.17 160)" },
  { id: "other", name: "Other", icon: "📦", color: "oklch(0.55 0 0)" },
];

export const defaultIncomeCategories: Category[] = [
  { id: "salary", name: "Salary", icon: "💰", color: "oklch(0.65 0.17 160)" },
  {
    id: "freelance",
    name: "Freelance",
    icon: "💻",
    color: "oklch(0.55 0.2 200)",
  },
  {
    id: "investment",
    name: "Investment",
    icon: "📈",
    color: "oklch(0.65 0.2 280)",
  },
  { id: "gift", name: "Gift", icon: "🎁", color: "oklch(0.6 0.22 330)" },
  { id: "refund", name: "Refund", icon: "🔄", color: "oklch(0.7 0.18 60)" },
  { id: "other_income", name: "Other", icon: "💵", color: "oklch(0.55 0 0)" },
];

// Combined for backward compatibility
export const defaultCategories: Category[] = [
  ...defaultExpenseCategories,
  ...defaultIncomeCategories,
];

// Cache formatters per currency (js-cache-function-results)
const currencyFormatters = new Map<CurrencyType, Intl.NumberFormat>();

function getCurrencyFormatter(currency: CurrencyType): Intl.NumberFormat {
  let formatter = currencyFormatters.get(currency);
  if (!formatter) {
    const currencyInfo = currencies[currency];
    formatter = new Intl.NumberFormat(currencyInfo.locale, {
      style: "currency",
      currency: currencyInfo.code,
      minimumFractionDigits: currency === "JPY" ? 0 : 0,
      maximumFractionDigits: currency === "JPY" ? 0 : 2,
    });
    currencyFormatters.set(currency, formatter);
  }
  return formatter;
}

export function formatCurrency(
  amount: number,
  currency: CurrencyType = "USD",
): string {
  return getCurrencyFormatter(currency).format(amount);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Filter periods: days (1-6), months (1-6), years (1-5), all
export type FilterPeriod =
  | "1d"
  | "2d"
  | "3d"
  | "4d"
  | "5d"
  | "6d"
  | "1m"
  | "2m"
  | "3m"
  | "4m"
  | "5m"
  | "6m"
  | "1y"
  | "2y"
  | "3y"
  | "4y"
  | "5y"
  | "all";

export function filterTransactionsByPeriod(
  transactions: Transaction[],
  period: FilterPeriod,
): Transaction[] {
  if (period === "all") return transactions;

  const now = new Date();

  // Parse period type and value
  const periodType = period.slice(-1); // 'd', 'm', or 'y'
  const periodValue = parseInt(period.slice(0, -1), 10);

  switch (periodType) {
    case "d": {
      // Days: last X days (including today)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (periodValue - 1));
      startDate.setHours(0, 0, 0, 0);
      return transactions.filter((t) => new Date(t.date) >= startDate);
    }
    case "m": {
      // Months: show transactions from the actual calendar months
      // 1M = current month, 2M = current + last month, etc.
      const startMonth = now.getMonth() - (periodValue - 1);
      const startYear = now.getFullYear() + Math.floor(startMonth / 12);
      const normalizedStartMonth = ((startMonth % 12) + 12) % 12;
      const startDate = new Date(
        startYear,
        normalizedStartMonth,
        1,
        0,
        0,
        0,
        0,
      );

      return transactions.filter((t) => {
        const txDate = new Date(t.date);
        return txDate >= startDate;
      });
    }
    case "y": {
      // Years: show transactions from the actual calendar years
      // 1Y = current year, 2Y = current + last year, etc.
      const startYear = now.getFullYear() - (periodValue - 1);
      const startDate = new Date(startYear, 0, 1, 0, 0, 0, 0); // Jan 1st of start year

      return transactions.filter((t) => {
        const txDate = new Date(t.date);
        return txDate >= startDate;
      });
    }
    default:
      return transactions;
  }
}
