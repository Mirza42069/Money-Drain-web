# Money-Drain-web Agent Guidelines

This document provides essential information for AI agents working on the Money-Drain-web codebase.

## 1. Project Overview

- **Framework**: Next.js 16.1 (App Router)
- **Language**: TypeScript 5+
- **Styling**: Tailwind CSS 4, Shadcn UI, Radix UI
- **Backend**: Convex
- **Auth**: Clerk
- **Package Manager**: Bun (preferred) or npm

## 2. Build, Lint, and Test Commands

### Development
Start the development server:
```bash
bun run dev
# or
npm run dev
```

### Build
Build the application for production:
```bash
bun run build
# or
npm run build
```

### Linting
Run the linter (ESLint 9):
```bash
bun run lint
# or
npm run lint
```

### Testing
*Note: No test runner (Jest/Vitest) is currently configured in `package.json`.*

If you need to add tests, prefer **Vitest** for compatibility with modern tooling.
To run tests (if configured):
```bash
bun run test
```

## 3. Code Style & Conventions

### 3.1 Imports
- Use **absolute imports** with the `@` alias.
- Group imports in the following order:
  1.  React / Next.js built-ins
  2.  Third-party libraries (Convex, Clerk, etc.)
  3.  Internal components (`@/components/...`)
  4.  Internal utilities/hooks (`@/lib/...`, `@/hooks/...`)
  5.  Types/Interfaces

**Example:**
```typescript
import { useState } from "react";
import { useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "../convex/_generated/api";
```

### 3.2 Components
- Use **functional components**.
- Prefer `export default function ComponentName` for pages and major components.
- Use `export function ComponentName` for smaller, co-located components.
- Use strict TypeScript types for props.

**Example:**
```tsx
interface TransactionItemProps {
  amount: number;
  label: string;
}

export function TransactionItem({ amount, label }: TransactionItemProps) {
  return (
    <div className="flex justify-between p-4 border rounded">
      <span>{label}</span>
      <span className="font-bold">${amount}</span>
    </div>
  );
}
```

### 3.3 Styling (Tailwind CSS)
- Use **Tailwind CSS** for all styling.
- Use the `cn()` utility (from `@/lib/utils`) to merge classes, especially for conditional styling or props.
- Follow **mobile-first** responsive design (e.g., `w-full md:w-1/2`).
- Use CSS variables defined in `app/globals.css` (e.g., `bg-background`, `text-foreground`) for theming support.

**Example:**
```tsx
<div className={cn(
  "p-4 rounded-lg bg-card text-card-foreground",
  isActive && "border-primary border-2"
)}>
  Content
</div>
```

### 3.4 Convex (Backend)
- Define schemas in `convex/schema.ts`.
- Create queries/mutations in separate files within `convex/` (e.g., `convex/transactions.ts`).
- Use `query` and `mutation` helpers from `convex/server`.
- In React components, use `useQuery` and `useMutation` hooks from `convex/react`.

**Example (Convex Function):**
```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transactions")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();
  },
});
```

### 3.5 Authentication (Clerk)
- Use Clerk components (`<SignIn />`, `<UserButton />`) for auth UI.
- Use `useAuth()` or `useUser()` hooks to access user state in client components.
- Secure Convex functions using `ctx.auth.getUserIdentity()`.

### 3.6 Error Handling
- Use `try/catch` blocks for async operations, especially mutations.
- Display user-friendly error messages using toast notifications (Shadcn `toast` or `sonner`).
- Log technical errors to the console in development.

## 4. File Structure

- `app/` - Next.js App Router pages and layouts.
- `components/ui/` - Reusable UI components (buttons, inputs, etc.).
- `components/` - Feature-specific components.
- `convex/` - Backend API functions and database schema.
- `lib/` - Utility functions (e.g., `utils.ts`).
- `hooks/` - Custom React hooks.

## 5. Rules for Agents

1.  **Read First**: Always read relevant files (`package.json`, `convex/schema.ts`, existing components) before editing.
2.  **No Any**: Avoid `any` type; strictly type all props and return values.
3.  **Clean Code**: Remove unused imports and variables.
4.  **Conventions**: Match the existing coding style (spacing, naming, patterns).
5.  **Safety**: Verify that changes do not break existing build or lint checks. Since there are no tests, be extra careful with logic changes.
