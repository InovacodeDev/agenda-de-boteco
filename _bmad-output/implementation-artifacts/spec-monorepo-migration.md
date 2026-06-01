---
title: 'Monorepo Migration'
type: 'refactor'
created: '2026-06-01'
status: 'done'
baseline_commit: 'd66c3d21f4df294b5848f56a7cd97cf6604eac94'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The current setup is a single, isolated Expo React Native project. As the product expands, we need a web admin interface and a shared typescript core package containing Supabase types, query layers, and schemas, all orchestrated together under a unified monorepo system.

**Approach:** Transition the codebase to a `pnpm` workspaces monorepo using Turborepo. Move the existing Expo application to `apps/mobile/`, scaffold a new React + Vite web dashboard at `apps/admin/`, and create a shared typescript library at `packages/core/`. Define root commands for centralized building, linting, and typechecking.

## Boundaries & Constraints

**Always:**
- Use `pnpm` as the package manager.
- Maintain full functional paridade for `apps/mobile/` without rewriting its core features, styling, or navigation.
- Configure strict TypeScript across all workspaces.
- In `packages/core`, implement platform-aware entrypoints for Supabase client configuration so that native-only modules like `expo-secure-store` or `react-native-url-polyfill/auto` are only imported in the native environment, while standard web APIs are used for the web application.

**Ask First:**
- If any existing configuration in the Expo app needs breaking changes or upgrade of primary versions to build inside the monorepo context.

**Never:**
- Do not rewrite any product logic, features, screens, or database schemas.
- Do not use TailwindCSS or dynamic styling additions for `apps/admin/` beyond basic styling or standard UI elements during scaffold.
- Do not add arbitrary comments to new files.

</frozen-after-approval>

## Code Map

- `package.json` -- Root package.json managing workspace tasks and devDependencies (Turborepo).
- `pnpm-workspace.yaml` -- Monorepo workspace configuration.
- `turbo.json` -- Turborepo task pipeline configuration.
- `apps/mobile/` -- Migrated location of the Expo application.
- `apps/admin/` -- Minimal scaffold for the React + Vite admin dashboard.
- `packages/core/` -- Shared TypeScript library (Supabase client/types/queries/Zod).
- `_bmad-output/project-context.md` -- Project-wide rules and guidelines.
- `AGENTS.md` -- Agent instructions entrypoint referencing the project context.

## Tasks & Acceptance

**Execution:**

- [x] `_bmad-output/project-context.md` -- [NEW] -- Create the project-context markdown file with the critical rule to invoke `/react-native-best-practices` before working inside `apps/mobile/`.
- [x] `AGENTS.md` -- [MODIFY] -- Reference `_bmad-output/project-context.md` clearly in AGENTS.md so that the context rules are loaded.
- [x] `pnpm-workspace.yaml` -- [NEW] -- Create workspace config pointing to `apps/*` and `packages/*`.
- [x] `turbo.json` -- [NEW] -- Configure Turborepo pipelines for `build`, `lint`, and `typecheck`.
- [x] `tsconfig.json` (root) -- [NEW/MODIFY] -- Standardize base tsconfig configuration.
- [x] `package.json` (root) -- [MODIFY] -- Repurpose as the monorepo orchestrator with workspace scripts and `turbo` devDependencies.
- [x] `apps/mobile/` -- [NEW/MOVE] -- Move the existing Expo project to `apps/mobile/`, modify its `package.json` name to `"mobile"`, adjust tsconfig/metro config paths relative to its new directory.
- [x] `apps/admin/` -- [NEW] -- Scaffold a minimal React + Vite dashboard utilizing strict typescript that successfully builds.
- [x] `packages/core/` -- [NEW] -- Scaffold a shared typescript package with Supabase platform-aware client skeleton, dummy schemas/types, and a setup script for supabase code-generation.

**Acceptance Criteria:**
- Given the root directory, when running `pnpm install`, all workspaces resolve dependencies correctly without peer dependency conflicts.
- Given the monorepo root, when running `pnpm build` (or via `turbo build`), all workspaces (apps/mobile, apps/admin, packages/core) build successfully.
- Given the monorepo root, when running `pnpm lint` and `pnpm typecheck`, all workspaces pass validation without errors.
- Given `apps/mobile/`, when running `pnpm expo start`, it initializes and functions exactly as the original app did prior to migration.
- Given `_bmad-output/project-context.md`, it successfully lists the `/react-native-best-practices` rules under critical rules.
- Given `AGENTS.md`, it successfully points to `_bmad-output/project-context.md`.

## Verification

**Commands:**
- `pnpm install` -- expected: successful package installation and workspace linking.
- `pnpm run build` -- expected: `turbo run build` completes successfully.
- `pnpm run typecheck` -- expected: `turbo run typecheck` completes successfully across all workspaces.
