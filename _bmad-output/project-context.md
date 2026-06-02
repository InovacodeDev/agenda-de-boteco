---
project_name: 'Agenda de Boteco'
user_name: 'titorm'
date: '2026-06-01'
sections_completed: ['technology_stack', 'critical_rules']
---

# Project Context for AI Agents

> Migration of a React Native app into a Turborepo monorepo. Consumer app (iOS +
> Android + Web) lives in `apps/mobile` (Expo). A separate web-only admin lives in
> `apps/admin`. Shared logic lives in `packages/core`. Keep this file lean — it is
> loaded by every implementation workflow.

## Technology Stack & Versions

> Pin exact versions from the lockfile / `apps/mobile/package.json`. Names below are
> the source of truth; versions are not.

- **Monorepo:** Turborepo + pnpm workspaces. Run tasks through `turbo`, not ad hoc per package.
- **apps/mobile:** Expo (Expo Router) targeting **iOS, Android and Web**. Styling with **Nativewind**.
- **apps/admin:** separate **web-only** app (Vite + React + shadcn/ui). Shares **no RN UI** with mobile.
- **packages/core:** shared TypeScript — generated Supabase types, query layer (pure TS), Zod schemas.
- **Backend:** Supabase (Postgres + Auth + Storage + PostGIS). **Separate Supabase projects per env** (dev/staging/prod) — never DB branches of one project.
- **Data layer:** TanStack Query + `supabase-js`. No Redux unless a concrete need justifies it.
- **Language:** TypeScript `strict` in every workspace. No `any`.

## Critical Implementation Rules

**React Native (`apps/mobile/`):**

- **BEFORE creating, editing, or refactoring ANY file under `apps/mobile/`, invoke the `/react-native-best-practices` skill and follow its guidance.** This is mandatory on every touch to that workspace.
- Use `.native.tsx` / `.web.tsx` file extensions for platform-divergent code (maps, navigation shell, geolocation, push). Don't fake structural differences with runtime `if` branches.
- Nativewind responsive prefixes (`sm:` / `md:` / `lg:`) only apply on web. **Never drive native layout off them** — use `useWindowDimensions` / a breakpoint hook or platform-split layout components.
- Long lists use `FlashList`, not `FlatList`.

**Web target (Expo web in `apps/mobile`):**

- Use `web.output: "static"` (SSG) — the SEO-stable mode. **Do NOT use `output: "server"` (SSR) or RSC**: still alpha/experimental, not for production.
- Write web data fetching with the `loader` + `generateStaticParams` API so a later switch to server output is cheap. Keep SSG fresh via a Supabase webhook → deploy hook on event publish/update.
- Per-route metadata via `expo-router/head` `<Head>`; inject JSON-LD `schema.org/Event` on event pages; generate a sitemap.
- URLs are slug-based and SEO-friendly (e.g. `/eventos/{cidade}/{slug}`), never UUIDs. Native deep links mirror these URLs.

**Supabase:**

- The Supabase client MUST be **platform-aware** via a single `createClient` factory branching on `Platform.OS`: native = secure storage adapter + `detectSessionInUrl: false` + deep-link session; web = browser storage + `detectSessionInUrl: true`.
- Generated types are the **single source of truth**, regenerated in CI and versioned in `packages/core`. Never hand-edit them.
- Validate external boundaries (RPC responses, form input) with **Zod** — types guarantee shape at compile time, Zod at runtime.
- **RLS is the real security boundary** (the admin app is convenience only): public read limited to `published` events; writes restricted to owner/admin roles; `favorites` scoped to `auth.uid()`.
- Proximity ("nearby") queries use **PostGIS via an RPC** (`ST_DWithin`), never client-side distance filtering.

**Monorepo / cross-cutting:**

- Only `packages/core` is shared between apps. `apps/admin` is web-pure and shares no RN UI with `apps/mobile`.
- `apps/mobile` must never regress: any restructuring keeps functional parity with the original app.
- **Mandatory Service & Utility Testing:** A unit test must always be created for any new or modified `services` and `utils`. Direct edits in the code are not allowed without corresponding unit tests verifying their exact contract as the absolute source of truth. Any optimization or change must strictly maintain behavioral regression protection. For example: if a method receives a string and returns a number, regardless of what changes are made inside the method, it must keep returning a number, and specifically the exact same return value as before the changes.