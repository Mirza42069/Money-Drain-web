# Money-Drain-web Agent Guide

Guidelines for agentic coding in this repo. Keep changes aligned with existing patterns.

## 1) Project Overview
- Framework: Next.js 16.1 (App Router)
- Language: TypeScript 5+
- Styling: Tailwind CSS 4, Shadcn UI, Radix UI
- Backend: Convex
- Auth: Clerk
- Package manager: Bun (preferred)

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
- If Vitest is added later: `bun run test -- <pattern>`

## 3) Cursor / Copilot Rules
- No `.cursor/rules`, `.cursorrules`, or `.github/copilot-instructions.md` found.

## 4) Code Style & Conventions

### Imports
- Prefer absolute imports with `@` alias.
- Order groups:
  1) React / Next.js
  2) Third-party libraries
  3) Internal components (`@/components/...`)
  4) Internal hooks/utils (`@/hooks/...`, `@/lib/...`)
  5) Types

### Components & Hooks
- Functional components only.
- Pages: `export default function PageName()`.
- Local components: `export function Name()`.
- Hooks always start with `use*` and are never conditional.
- Keep render bodies cheap; use `useMemo` for derived lists.

### Types
- Avoid `any`; use explicit types or generics.
- Props defined via `interface` or `type` near component.
- Keep Convex and Clerk types explicit (`Id<"table">`, etc.).

### Naming
- Files: kebab-case for folders, lower/`kebab-case` for filenames.
- Components: PascalCase.
- Variables: camelCase; constants in UPPER_SNAKE_CASE if truly constant.

### Formatting
- Follow existing formatting (no formatter configured).
- Keep lines readable; avoid deeply nested ternaries.
- Prefer early returns and small helpers.

### Styling (Tailwind)
- Use Tailwind utility classes; avoid new CSS unless needed.
- Use CSS variables from `app/globals.css` (e.g., `bg-background`).
- Use `cn()` for conditional class merging.
- Use `focus-visible` utilities for focus states.

### Accessibility
- Icon-only buttons must have `aria-label`.
- Inputs/selects must have label or `aria-label` and `name`.
- Decorative icons should be `aria-hidden="true"`.
- Use semantic elements (`button`, `a`, `label`, `main`).

### Dates & Numbers
- Use `Intl.DateTimeFormat` and `Intl.NumberFormat` (no hardcoded locales).
- Avoid formatting in render loops if expensive; memoize if needed.

### Error Handling
- For async mutations: try/catch and surface user-friendly errors.
- Log detailed errors in dev only.
- Convex: always validate auth with `ctx.auth.getUserIdentity()`.

### State & URL Sync
- If UI state is user-facing (filters, tabs), prefer sync with query params.
- Avoid hydration mismatches; wrap `useSearchParams` in `Suspense`.

### Convex
- Schema in `convex/schema.ts`.
- Functions in `convex/*.ts` using `query` / `mutation`.
- Run `bunx convex codegen` after schema/function changes.

### Clerk
- Use Clerk hooks/components (`useAuth`, `useUser`, `<UserButton />`).
- Keep signed-out flows safe (guard Convex calls).

## 5) File Structure
- `app/` Next.js pages/layouts
- `components/ui/` reusable UI primitives
- `components/` feature components
- `convex/` backend functions + schema
- `hooks/` custom React hooks
- `lib/` utilities and helpers
- `public/` static assets

## 6) Agent Safety Rules
- Read relevant files before editing.
- Do not revert unrelated user changes.
- Keep `bun.lock` updated when dependencies change.
- Avoid destructive git commands; do not commit unless asked.
