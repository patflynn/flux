# Flux

Umbrella app for Workouts, Meditate, and Check-in. Ships as a web PWA at
[flux.gunk.dev](https://flux.gunk.dev) and as a single Android APK with three
launcher icons (one per tab).

See `docs/UMBRELLA-PLAN.md` for the plan and `docs/VISION.md` / `docs/DESIGN.md`
for product intent.

## Stack

- Vite + Preact + TypeScript + Tailwind CSS
- Capacitor for the native Android shell (`@capacitor/{core,cli,android,app,haptics}`)
- Playwright for e2e tests
- No router, no state library, no UI component library

## Development

All commands run inside `nix develop` (nix is mandatory per `CLAUDE.md`):

```bash
nix develop --command npm ci          # install deps
nix develop --command npm run dev     # Vite dev server on :3030
nix develop --command npm run build   # production build to dist/
```

E2E tests use a separate shell that ships Playwright browsers:

```bash
nix develop .#test --command npx playwright test
```

## Android

```bash
nix develop --command npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

The Android build requires a host-installed Android SDK + JDK; it is not run
in CI yet.

## Project layout

```
├── index.html              # Vite entry
├── src/
│   ├── main.tsx            # Preact entry; reads window.AppEntry bridge
│   ├── App.tsx             # Tab shell
│   ├── tabs/               # Workouts, Meditate, Checkin, Settings
│   ├── llm/                # Provider-agnostic generate() interface
│   └── db/                 # Per-tab IndexedDB stores (added in feature PRs)
├── android/                # Capacitor-scaffolded Android project
├── tests/smoke.spec.ts     # Playwright smoke test
└── capacitor.config.ts
```
