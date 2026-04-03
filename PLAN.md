# Flux - Project Plan

**Goal:** Build a static, mobile-first PWA to track a 12-month bodybuilding transformation.

**Stack:** Vanilla HTML/JS/CSS (for NixOS static hosting)

---

## Architecture Principles

1. **Separation of Concerns:** Workout programs live in `data/program.json`, UI/logic in `app.js`
2. **State via localStorage:** Track current Global Day (1-365) and exercise log history
3. **Mobile-First:** Design for phone use in a basement gym
4. **Dark Mode Aesthetic:** Cyberpunk/Terminal style with high contrast

---

## Program Philosophy

These principles are **mandatory** for all workout programs in this app:

### 1. Injury Prevention First
- Every exercise selection must prioritize joint health and safe movement patterns
- Exercises should be chosen for their low injury risk while maintaining effectiveness
- Form and technique take precedence over load or volume
- Programs must account for user's injury history (e.g., back issues, shoulder pain)

### 2. Mobility & Flexibility as Foundation
- Every phase must include dedicated mobility work (not optional)
- Dynamic warmups before strength work, static stretching post-workout
- Hip, shoulder, and thoracic spine mobility are non-negotiable components
- Active recovery days should focus on mobility and movement quality

### 3. Progressive, Not Aggressive
- Tendon and ligament adaptation takes longer than muscle—program accordingly
- Build structural integrity before chasing heavy loads
- Include deload weeks and recovery protocols
- Listen to the body: pain is a signal, not an obstacle to push through

### 4. Longevity Over Short-Term Gains
- This is a 47-year-old training to be fit for life, not a 22-year-old peaking for a competition
- Sustainable habits beat aggressive periodization
- Recovery quality matters as much as training stimulus

---

## File Structure

```
Build/
├── index.html          # Main app shell
├── style.css           # Dark mode styling
├── app.js              # Core logic & state management
├── data/
│   └── program.json    # Workout program data (exists)
├── prompts/
│   └── phases.md       # AI prompts for generating phases (exists)
└── PLAN.md             # This file
```

---

## Tasks

### Phase 1: Initial Setup
- [x] Create project structure
- [x] Define JSON schema in `program.json`
- [x] Create `index.html` (app shell, PWA manifest link)
- [x] Create `style.css` (dark/cyberpunk theme)
- [x] Create `app.js` (load JSON, render workout, state management)

### Phase 2: Core Features
- [x] Display current day's workout based on Global Day
- [x] "Complete & Advance" button to progress and log
- [x] localStorage persistence for day counter and weights
- [x] Collapsible YouTube embed for form check videos

### Phase 3: Testing & CI
- [x] Validation script (JSON schema, file structure, syntax checks)
- [x] Playwright E2E tests (load, navigate, state persistence)
- [x] GitHub Actions workflows (test on PR, deploy preview)
- [x] Nix flake for reproducible dev environment

### Phase 4: PWA Features
- [ ] Add `manifest.json` for installability
- [ ] Add service worker for offline support
- [ ] App icons

### Phase 5: Polish
- [ ] Exercise weight logging with history
- [ ] Progress visualization
- [ ] Phase transition handling

---

## JSON Schema (Implemented)

```json
{
  "meta": { "user", "goal", "startDate", "version" },
  "phases": [
    {
      "id": "p1",
      "name": "Phase 1: Structural Integrity",
      "duration_weeks": 12,
      "schedule_pattern": ["A", "B", "A", "B", "C", "Rest", "Rest"],
      "workouts": {
        "A": {
          "name": "Posterior Chain & Pull",
          "focus": "Back Health & Biceps",
          "exercises": [
            {
              "name": "Exercise Name",
              "sets": 3,
              "reps": "12",
              "rest": "90s",
              "video_id": "youtube_id",
              "note": "Coaching cue"
            }
          ]
        }
      }
    }
  ]
}
```

---

## Progress Log

### 2026-02-08
- Project initialized
- `program.json` created with Phase 1 workouts (3 workout types: A, B, C)
- Phase prompts documented in `prompts/phases.md`
- Created this PLAN.md
- Created `index.html` with mobile-first app shell
- Created `style.css` with cyberpunk/terminal dark theme
- Created `app.js` with:
  - Program data loading from JSON
  - localStorage state management (global day, exercise log)
  - Dynamic workout rendering based on schedule pattern
  - Weight tracking with "last used" placeholders
  - YouTube video modal for form checks
  - Complete & Advance functionality
- Added testing infrastructure:
  - `tests/validate.js` - JSON schema and syntax validation
  - `tests/e2e.spec.js` - Playwright browser tests
  - `flake.nix` - Nix dev environment with Node, serve, Playwright
  - `.github/workflows/test.yml` - CI for validation and E2E tests
  - `.github/workflows/preview.yml` - PR preview deployments
  - `.github/workflows/pages.yml` - Production GitHub Pages deploy
