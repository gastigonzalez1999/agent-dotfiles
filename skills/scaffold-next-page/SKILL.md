---
name: scaffold-next-page
description: Generate a complete Next.js page with its feature folder: Zustand store, API client, page component, and sub-components. Use when the user asks to create a new page, route, or frontend feature.
---

# Scaffold Next.js Page

Generate a full Next.js page and its feature folder. Ask for the route/feature name if not provided.

## What to generate

For feature `<feature>` at route `/<route>`:

```
app/(dashboard)/<route>/
└── page.tsx                          # Server component entry, metadata export

features/<feature>/
├── index.ts                          # Barrel export
├── components/
│   ├── <Feature>Page.tsx             # Main client component ("use client")
│   ├── <Feature>Table.tsx            # Data table using shadcn DataTable
│   └── <Feature>Form.tsx             # Create/edit form using react-hook-form
├── stores/
│   └── use-<feature>-store.ts        # Zustand store (typed, no `any`)
├── api/
│   └── <feature>-api.ts             # API client functions (fetch wrappers)
└── types/
    └── <feature>.types.ts            # Local TypeScript interfaces
```

## Conventions to follow

- Pages in `app/` are Server Components by default; add `"use client"` only at the boundary
- Zustand stores: use `create<State>()()` with explicit type parameter
- API client: all functions async, return typed data, throw on non-ok response
- Forms: use `react-hook-form` + `zodResolver` + shadcn `Form` components
- Tables: use shadcn `DataTable` with `ColumnDef<T>[]`
- Import path aliases: `@/features/...`, `@/components/ui/...`, `@/lib/...`
- Use `NEXT_PUBLIC_API_URL` env var for API base URL

## Steps

1. Read `app/layout.tsx` and an existing feature folder for conventions
2. Generate all files in parallel (Write tool)
3. Run `tsc --noEmit` inside `apps/web` to verify types
