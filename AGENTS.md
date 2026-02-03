# Money-Drain-web Agent Guide

Guidelines for agentic coding in this repo. Keep changes aligned with existing patterns.

## 1) Project Snapshot
- Framework: Next.js 16.1 (App Router)
- Language: TypeScript 5+ (strict)
- React: 19.x
- Styling: Tailwind CSS 4, shadcn/ui, tw-animate-css
- UI primitives: components in `components/ui` using `cn()` and `cva`
- Icons: @tabler/icons-react
- Backend: Convex
- Auth: Clerk
- Package manager: Bun (preferred)
- Lint: ESLint 9 with Next core-web-vitals + TypeScript config

## 2) Build / Lint / Test Commands

### Install
```bash
bun install
```

### Dev server
```bash
bun run dev
```

### Production build (also runs TS checks)
```bash
bun run build
```

### Start (production)
```bash
bun run start
```

### Lint
```bash
bun run lint
```

### Convex
```bash
# Local dev server + sync
bunx convex dev

# Regenerate Convex types after schema/function changes
bunx convex codegen

# Deploy Convex backend
bunx convex deploy
```

### Tests
No test runner configured in `package.json`.
- Single test: N/A
- If you add a runner, update this section (examples):
  - Vitest/Jest: `bun run test -- <pattern>`
  - Playwright: `bunx playwright test -g "<name>"`

## 3) Code Style & Conventions

### Imports
- Prefer absolute imports with the `@` alias.
- Import order:
  1) React / Next.js
  2) Third-party libraries
  3) Internal components (`@/components/...`)
  4) Internal hooks/utils (`@/hooks/...`, `@/lib/...`)
  5) Types
- Use `import type` when only importing types.

### Components & Hooks
- Functional components only.
- Pages: `export default function PageName()`.
- Local components: `export function Name()` or `function Name()` + named export.
- Client components must include `"use client"` at the top.
- Hooks start with `use*` and are never conditional.
- Keep render bodies cheap; memoize derived lists with `useMemo`.
- Use `useCallback` for handlers used in dependency arrays.

### Types
- Avoid `any`; use explicit unions and interfaces.
- Props are defined near the component (`interface` or `type`).
- Convex IDs use `Id<"table">` from `convex/_generated/dataModel`.
- Prefer `Readonly<{ ... }>` for layout props where appropriate.

### Naming
- Folders: kebab-case.
- Filenames: lower case or kebab-case.
- Components: PascalCase.
- Variables: camelCase.
- Constants: UPPER_SNAKE_CASE only when truly constant.

### Formatting
- No formatter configured; match the style of the file you edit.
- Keep lines readable; avoid deeply nested ternaries.
- Prefer early returns and small helpers.

### Styling (Tailwind)
- Use Tailwind utilities; avoid new CSS unless needed.
- Prefer design tokens from `app/globals.css` (e.g., `bg-background`).
- Use `cn()` from `lib/utils` for conditional classes.
- Use `cva` for variant-driven components in `components/ui`.
- Prefer `focus-visible` utilities for focus states.

### Accessibility
- Icon-only buttons must have `aria-label`.
- Inputs/selects must have a `label` or `aria-label` and `name`.
- Decorative icons should be `aria-hidden="true"`.
- Use semantic elements (`button`, `a`, `label`, `main`).

### Dates & Numbers
- Use `Intl.DateTimeFormat` and `Intl.NumberFormat`.
- Cache formatters when used frequently (see `lib/transactions.ts`).
- Avoid heavy formatting inside tight render loops.

### State & Performance
- Keep client-only state in client components.
- Guard localStorage usage with client-only checks.
- Use `useMemo` to avoid re-filtering large arrays per render.

### Error Handling
- For async mutations, `try/catch` and surface user-friendly errors.
- Log detailed errors only in dev (production removes console logs).

### Convex
- Schema lives in `convex/schema.ts`.
- Functions in `convex/*.ts` using `query` / `mutation`.
- Always validate auth with `ctx.auth.getUserIdentity()`.
- Validate inputs and check user ownership before writes.
- Run `bunx convex codegen` after schema/function changes.

### Clerk
- Use Clerk hooks/components (`useAuth`, `useUser`, `<UserButton />`).
- Guard Convex queries/mutations when signed out (`"skip"`).

### Environment
- `NEXT_PUBLIC_CONVEX_URL` is required for Convex client setup.

## 4) File Structure
- `app/` Next.js pages/layouts
- `components/ui/` reusable UI primitives
- `components/` feature components
- `convex/` backend functions + schema
- `hooks/` custom React hooks
- `lib/` utilities and helpers
- `public/` static assets

## 5) Agent Safety Rules
- Read relevant files before editing.
- Do not revert unrelated user changes.
- Keep `bun.lock` updated when dependencies change.
- Avoid destructive git commands; do not commit unless asked.
- Prefer small, targeted edits over sweeping refactors.
