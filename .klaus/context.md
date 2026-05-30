# Repository context

## Purpose

Flux is a wellness PWA that ships as a web app and a single Android APK with three launcher aliases (Workouts, Meditate, Check-in). The Workouts surface is implemented in this repo; Meditate and Check-in are placeholder tabs whose primary apps live elsewhere (per `CLAUDE.md`: `vibe` for meditation, `gunk-dev/balance` for check-ins). An optional LLM provider can generate workout programs from the user's equipment inventory.

## Tech stack

- TypeScript 5.7 with Preact 10.25 (no React, no router, no state library, no UI kit). See `package.json`.
- Vite 5.4 build (`vite.config.ts`), Tailwind CSS 3.4 (`tailwind.config.js`, `postcss.config.js`).
- Capacitor 6.2 for the Android shell: `@capacitor/{core,cli,android,app,haptics}` (`package.json`, `capacitor.config.ts`).
- Persistence: hand-rolled IndexedDB wrapper at `src/db/idb.ts` (no Dexie). The Workouts DB is `flux-db`, currently at `DB_VERSION = 3` (`src/tabs/Workouts/state.ts`).
- Playwright 1.57 for e2e tests (`playwright.config.ts`, `tests/`).
- Node 20 + nix flakes for environment management (`flake.nix`). `.envrc` auto-loads the default dev shell with direnv.
- Android shell uses JDK 17, Gradle, and Android SDK platform 34 / build-tools 34.0.0 (`flake.nix` `devShells.android`).

## Entry points

- `index.html` — Vite HTML entry, loads `src/main.tsx`.
- `src/main.tsx` — Preact bootstrap; resolves the active tab from the Android `window.AppEntry` bridge or `window.__entry`, then mounts `<App>`. Also exposes `window.flux_test_configureLLM` for Playwright.
- `src/App.tsx` — Tab shell rendering Workouts / Meditate / Check-in / Settings; listens for `app-entry-changed` events dispatched by `MainActivity.onNewIntent`.
- `src/tabs/Workouts/index.tsx` — Main Workouts UI (program rendering, logging, AI generation entry, import/export).
- `src/llm/index.ts` — `generate()` / `configureProvider()` / `useLLM()` — the single LLM seam. Defaults to a `not-configured` provider that throws.
- `scripts/validate-catalog.ts` — `tsx` script that validates `src/data/exerciseCatalog.ts` against `equipmentCatalog.ts`; invoked by `npm run validate-catalog` and the `Catalog Validation` CI job.
- `scripts/local-install.sh` — Build + `cap sync` + `assembleDebug` + `adb install -r` for local Android installs.
- `bin/flux-install` — direnv-exposed wrapper that runs `scripts/local-install.sh` inside the `.#android` nix shell.
- `capacitor.config.ts` — `appId: dev.gunk.flux`, `webDir: dist`.

## Layout

- `src/` — application source.
  - `src/tabs/` — one component per primary tab (`Workouts/`, `Meditate.tsx`, `Checkin.tsx`, `Settings.tsx`).
  - `src/tabs/Workouts/` — `index.tsx`, `state.ts` (IDB-backed state/log/program/inventory stores), `types.ts`, `components/` (`ExerciseCard`, `GenerateAIModal`, `Timer`, `VideoModal`), `logic/` (`progression`, `resolveExercise`, `equipmentResolve`, `exportImport`, `timer`).
  - `src/data/` — static catalogs and types: `exerciseCatalog.ts`, `equipmentCatalog.ts`, `inventory.ts`, `types.ts`.
  - `src/db/` — `idb.ts` (IndexedDB wrapper), `programSchema.ts` (program shape used for LLM-generated programs and import validation).
  - `src/llm/` — `index.ts` (provider interface), `programGen.ts`, `programGenCore.ts`.
- `tests/` — Playwright specs (`smoke`, `workouts`, `generate-ai-ui`, `import`, `import-export`, `inventory`, `programGen`, `programSchema`) plus `tests/fixtures/` JSON program payloads.
- `android/` — Capacitor-generated Android project (Gradle).
- `scripts/` — `local-install.sh`, `validate-catalog.ts`.
- `bin/` — `flux-install` wrapper consumed via direnv.
- `prompts/` — `generate-phase.md`, the LLM prompt template for program generation.
- `docs/` — `DESIGN.md`, `VISION.md`, `ROADMAP.md`, `UMBRELLA-PLAN.md` (product intent / multi-app plan).
- `.github/workflows/` — `test.yml` (nix-lint, zizmor, build, build-android, catalog-validation, e2e), `preview.yml`, `staging.yml`.
- `flake.nix`, `flake.lock`, `.envrc` — nix environment.
- `PLAN.md`, `README.md`, `CLAUDE.md` — top-level docs.

## Build, test, run

All commands run inside `nix develop` (mandatory per `CLAUDE.md`).

- Install deps: `nix develop --command npm ci`
- Dev server (Vite on `:3030`): `nix develop --command npm run dev`
- Production build (to `dist/`): `nix develop --command npm run build` (runs `tsc -b && vite build`).
- Typecheck only: `nix develop --command npm run typecheck`
- Preview production build: `nix develop --command npm run preview`
- Validate exercise catalog: `nix develop --command npm run validate-catalog`
- E2E tests (separate shell with Playwright browsers): `nix develop .#test --command npx playwright test` (or `npm test`). `playwright.config.ts` boots its own `vite preview` web server on `:3030`.
- Android debug build (multi-GB unfree SDK; first run is slow): `nix develop .#android --command bash -c "npm ci && npm run build && npx cap sync android && (cd android && ./gradlew assembleDebug)"`. APK lands at `android/app/build/outputs/apk/debug/app-debug.apk`.
- Local Android install on a connected device: `nix develop .#android --command ./scripts/local-install.sh` (or `flux-install` if direnv is allowed).

## Conventions

- All LLM calls go through `src/llm/index.ts` (`generate()` / `useLLM()`); feature code never instantiates a provider directly. The comment at the top of `src/llm/index.ts` makes this explicit.
- IndexedDB access goes through the small wrapper in `src/db/idb.ts`; per-tab DBs (e.g. `flux-db` for Workouts) declare their schema in their own `state.ts` via `openDb(...)`. Bump `DB_VERSION` and add the store to the `stores` array to migrate — the `onupgradeneeded` handler in `openDb` creates any missing stores.
- The exercise catalog is the source of truth for exercises; CI (`Catalog Validation` job) enforces it via `scripts/validate-catalog.ts`. IDs must match `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`.
- No router and no global state library — tab routing lives in `src/App.tsx` (`useState<TabKey>`), state is colocated in tab modules with IDB persistence.
- Per `CLAUDE.md`: never reference Claude/AI in commits or PRs; never push to `main` directly; never merge PRs (the user merges); always use nix shells, not bare `npm install`.

## Gotchas

- Two separate Android toolchains: the `.#android` nix shell (local) and `setup-java` + `setup-android` in `.github/workflows/test.yml` (CI). They are intentionally decoupled — changes that work locally may need CI-side updates and vice versa (`README.md`).
- `adb install -r` fails with a signature mismatch when a CI-built debug APK is already installed (different debug keystore). Recovery is `adb uninstall dev.gunk.flux` followed by re-install, which wipes IndexedDB data; `scripts/local-install.sh` prints this hint on failure. Export via Settings → Data → Export first.
- `flake.nix` pins `npmDepsHash` for the production build. After changing `package-lock.json`, refresh it with `prefetch-npm-deps package-lock.json` (note in `flake.nix`).
- `package.json` `build` runs `tsc -b` before Vite, so type errors break the build (not just `npm run typecheck`).
- The Workouts IDB schema is at version 3 (`src/tabs/Workouts/state.ts`); bumping it requires adding the new store to the `stores` array passed to `openDb`, since the upgrade path only creates missing stores.
- `playwright.config.ts` runs `npm run build && vite preview` itself; you don't need to start a server manually before `npx playwright test`.

## External dependencies

- No backend services at runtime. The web app is fully static and ships from `dist/`. State lives in the browser's IndexedDB.
- Optional LLM providers (configured by the user via Settings) are the only runtime external dependency — the default provider is `not-configured` and throws (`src/llm/index.ts`). Comments in that file reference planned `local`, `byok-anthropic`, `byok-openai`, and `byok-google` providers.
- Android packaging depends on Google's Android SDK / build-tools (platform 34, build-tools 34.0.0) and AGP-fetched AndroidX deps at first build.
