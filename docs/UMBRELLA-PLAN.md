# Flux: Umbrella App Plan

## Goal

Unify three personal-wellness apps — **vibe** (Android meditation timer), **flux** (fitness PWA, this repo), **balance** (React PWA for wellness probes) — into a single app shipped as:

- Capacitor-wrapped native Android (one APK, multiple launcher icons).
- Web version at the existing `flux.gunk.dev` deployment.

The name 'Flux' is retained as the umbrella. Userbase is 1 (the author), so brand-continuity, Play Store migration, and existing-user concerns are explicitly non-issues.

## Why now

The three apps overlap thematically (meditation, workouts, wellness check-ins are one mental model). Unifying them enables future cross-feature integration (e.g. workouts feeding wellness metrics; meditation sessions logged into a daily probe). For now we ship them as three loosely-coupled tabs and let real usage tell us where unification adds value.

## Stack (tight by guardrail — 'minimize dependencies')

- **Vite + Preact + TypeScript + Tailwind CSS**.
  - Preact over React: ~37KB runtime savings, API-compatible for ~95% of code, same mental model.
  - Vite for bundling, dev server with HMR, TypeScript pipeline.
  - Tailwind for utility CSS; hand-rolled components, no UI library.
- **Capacitor** for the native Android shell: `@capacitor/{core,android,cli}` + plugins as needs surface (`@capacitor/haptics`, `@capacitor/filesystem`, `@capacitor/share`, `@capacitor/app`, etc.).
- **No router** at the three-tabs stage. Tab state + conditional render.
- **No state library**. Preact `useState` / `useReducer` + Context per tab.
- **No UI component library** (no MUI, no shadcn, no Radix). Tailwind primitives + hand-rolled components.
- **No LLM SDKs**. `fetch()` directly to each provider's HTTP API.
- **Per-tab IndexedDB stores** (`vibe-db`, `flux-db`, `balance-db`). Shared data layer is a Phase 2 question — don't pre-design it.

## Repo strategy

Rewrite **in this repo** (`gunk-dev/flux`). The old vanilla-JS fitness PWA is replaced by the new shell + a Workouts tab that ports the existing logic. Git history of the fitness PWA evolution becomes part of the unified app's history. Old vibe (`patflynn/vibe`) and balance (`patflynn/balance` / `gunk-dev/balance`) repos get archived after parity ships in their respective tabs.

Program-philosophy content from this repo's existing `PLAN.md` (injury prevention, mobility-first, progressive-not-aggressive, longevity-over-short-term-gains) is **load-bearing for the Workouts tab** and survives intact.

## Android multi-launcher trick

Ship three `<activity-alias>` entries in `AndroidManifest.xml` pointing at a single `MainActivity`, each with its own `android:icon`, `android:label`, and `MAIN`/`LAUNCHER` intent-filter. The launcher shows three separate icons; under the hood it's one APK / one process / shared storage.

`MainActivity` (extends Capacitor's `BridgeActivity`) reads the launching intent in `onCreate`, extracts a per-alias `meta-data` value indicating which tab launched, and injects `window.__entry = 'vibe' | 'flux' | 'balance'` before the WebView loads the bundle. The Preact shell reads that and selects the initial tab.

Set `launchMode="singleTask"` and implement `onNewIntent` so that tapping a launcher icon while the app is already foregrounded re-routes the WebView to the correct tab.

iOS, if ever targeted, would get a single icon — this is an Android-only affordance.

## LLM integration (load-bearing architectural constraint)

The app will use LLMs for workout-plan generation, plan adaptation from results, photo-to-equipment-inventory, and likely future features. The integration must support a provider hierarchy:

1. **Local LLM** — preferred when available and 'high quality enough' for the task. WebGPU / WebLLM in the browser; potentially llama.cpp via Capacitor Android plugin in the future.
2. **User-supplied API key (BYOK)** — Anthropic / OpenAI / Google. User pastes key in settings, stored in IndexedDB.
3. **Paid tier (future)** — app routes through a developer-controlled backend that holds a master API key, billed per-subscriber. Deferred until everything else works.

### Architecture

- One `src/llm/` module exposing a single `generate({prompt, schema?, stream?, capabilities?})` interface.
- Provider implementations behind that interface: `local`, `byok-anthropic`, `byok-openai`, `byok-google`, future `paid`.
- Feature modules **never** call providers directly. Always through `generate()`.
- A `useLLM()` hook in components returns `{ generate, available, configure }`. Features check `available` and show a 'configure in settings' prompt rather than failing.
- **No provider SDKs**. Each cloud provider is a `fetch()` POST to their JSON API.
- Streaming end-to-end via SSE responses, surfaced as an async iterator from `generate({stream: true})`.
- Structured output: `schema` arg in `generate()` maps to each provider's native mechanism — Anthropic tool use, OpenAI structured outputs, Google JSON mode, local-model grammar constraints with retry-on-parse-failure.

### Settings tab

Since LLM config is cross-tab, the Settings tab lives at the shell level (not inside any feature tab). Hosts: LLM provider selection, BYOK key input, local-model download/management (future), backup/restore for the data layer.

### Reality check (2026)

Default-to-local is the right design but **BYOK will dominate real usage for 1-2 more years**. WebGPU on Android is patchy; the models that fit on-device practically (1-3B params) are not reliable for workout-plan generation or photo-to-inventory. Local vision is rougher still. The graceful-degradation logic handles this correctly, but don't over-invest in local-first UX before the device + model landscape catches up.

### Benchmarking (deferred but enabled by this architecture)

Same `generate()` interface lets a benchmark harness swap backends and capture latency / token-count / parse-failure-rate per prompt suite. For a userbase-of-1 app, 'I tried it and liked it' is a legitimate evaluation method. Formalize via LLM-as-judge rubric later if needed.

## Build order (proposed)

- **PR 1 (scaffolding)**: replace the vanilla-JS app with Vite + Preact + TS + Tailwind. Wire Capacitor: `npx cap add android`, MainActivity reading per-alias intent and routing to the initial tab, three `<activity-alias>` entries with placeholder icons. Three empty tabs (Workouts, Meditate, Check-in). Settings tab with placeholder. `src/llm/` stub exposing the interface with a single 'not configured' default provider. `npm run dev` works on web; `npx cap run android` builds the APK. Existing fly.io/Caddy deploy still serves the new static build.
- **PR 2 (port fitness)**: move the existing program/workout/log logic into the Workouts tab. Preserve program-philosophy constraints from `PLAN.md`. Preserve current import/export to file.
- **PR 3 (port vibe)**: implement the meditation timer in the Meditate tab — duration picker (5/10/15/20/25/30/40min), bell sounds, vibration via `@capacitor/haptics`, wake-lock during session, minimal UI. Reimplement from scratch.
- **PR 4 (port balance)**: implement the 12-metric tap-to-record flow in the Check-in tab. IndexedDB for offline-first persistence. Customizable metrics.
- **PR 5+ (LLM features)**: workout plan generation, plan adaptation from logged results, photo-to-equipment-inventory.

## Open questions (deferred)

- **Cross-feature integration**: do workouts feed wellness metrics? does meditation log into the daily probe? Start with three independent tabs and let actual usage signal whether unification adds value.
- **Shared data layer**: tied to the above. Per-tab IndexedDB stores are fine until cross-tab integration is real.
- **iOS support**: not in scope. The multi-launcher trick doesn't translate.
- **Local-LLM Capacitor plugin**: native llama.cpp / MLC LLM integration is a future option behind the `local` provider abstraction.

## What is NOT in scope for this plan

- Anything beyond the three apps named above.
- Multi-user / multi-account / sync between devices (userbase is 1).
- Play Store distribution flow (vibe's existing GH-release-APK pattern can be adapted).
- Backend services (the future paid LLM tier is the only contemplated backend, and it's deferred).
