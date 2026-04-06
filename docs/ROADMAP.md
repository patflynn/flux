# Flux: Implementation Roadmap

## Phase 1: Foundation Refactor

Separate the app from user data. Everything else builds on this.

### 1.1 Define Data Schemas
- Create JSON schemas for: exercise catalog, user profile, program, workout log, training principles
- Validation script updated to use schemas
- Schema-first: define the contract before populating data
- Related: #4

### 1.2 Extract Exercise Catalog
- Create `data/exercises.json` with stable IDs for all current exercises
- Each entry: id, name, muscle groups, equipment, video, coaching cues, defaults
- Validate against schema from 1.1
- Related: #11

### 1.3 Define Training Principles
- Create `data/principles.json` with platform-level training rules
- Injury prevention, mobility requirements, form-over-load constraints
- Validate against schema from 1.1

### 1.4 Separate User Data from App
- Split current `data/program.json` into:
  - App data: exercise catalog + schemas (checked into repo)
  - User data: profile + program (gitignored `user/` directory)
- App loads both and merges at runtime
- Seed `user/` with current program data for backward compatibility

### 1.5 Update App Logic
- `app.js` loads exercise catalog + user program separately
- Exercise details resolved by ID at render time
- Update tests (validate.js, e2e) for new structure

## Phase 2: Data Layer

Build robust data persistence and portability.

### 2.1 Export/Import
- Export workout log + profile + program as JSON bundle
- Import with merge-or-replace strategy
- Related: #21

### 2.2 Enhanced Logging
- Track session duration and exercise time
- Structured log format per the design doc
- Related: #17, #35

### 2.3 Cloud Sync
- Opt-in sync for cross-device use
- Offline-first: localStorage is primary, cloud is backup
- Related: #13, #24

## Phase 3: Onboarding & AI Generation

The app drives personalized program creation.

### 3.1 Onboarding Flow
- PWA init session collects user parameters
- Profile stored as structured user data
- Related: #10, #4

### 3.2 AI Program Generation
- Generation pipeline: profile + catalog + principles + schema → AI → validated program
- User reviews generated program before activation
- Related: #4

### 3.3 Weight Intelligence
- AI-recommended starting weights based on profile
- Progression algorithm using execution history + difficulty feedback
- User sees recommendation with easy override
- Related: #12

## Phase 4: UX Overhaul

Apply the 'Human' design system.

### 4.1 Design System Implementation
- New color palette, typography, shape language
- Adaptive workout states (active vs rest)
- Haptic feedback integration
- Related: #39

### 4.2 Program Overview
- Phase navigation and progress visualization
- Schedule visibility (upcoming workouts)
- Phase rationale display
- Related: #48, #19

### 4.3 History & Progress
- Calendar/list view of past workouts
- Per-exercise weight progression charts
- Related: #23

## Phase 5: Adaptation Loop

Close the AI feedback cycle.

### 5.1 Execution Analysis
- Summarize compliance, progression, difficulty trends from log data
- Surface insights to user

### 5.2 Program Adaptation
- Feed execution summary to AI for program updates
- Present adaptations as reviewable diffs
- User approves before changes apply

## Issue Mapping

| Issue | Phase | Description |
|-------|-------|-------------|
| #4 | 3.1, 3.2 | Parameterize for tailored programs |
| #7 | 1.1 | User-curated exercise videos |
| #10 | 3.1 | PWA onboarding session |
| #11 | 1.1 | Exercise-to-video catalog |
| #12 | 3.3 | Automatic weight selection |
| #13 | 2.3 | Cloud sync |
| #17 | 2.2 | Historical data tracking |
| #19 | 4.2 | Schedule visibility |
| #21 | 2.1 | Export/import |
| #23 | 4.3 | History view |
| #24 | 2.3 | Cloud sync/backup |
| #35 | 2.2 | Time tracking |
| #39 | 4.1 | UI beautification |
| #48 | 4.2 | Program overview |
