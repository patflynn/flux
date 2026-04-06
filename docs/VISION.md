# Flux: Architectural Vision

## Overview

Flux is a mobile-first PWA for AI-driven, personalized fitness programming. The architecture separates into three pillars: the App (platform + UX), the Data (user state + sync), and AI Integration (program generation + adaptation).

## Pillar 1: The App (UX + Exercise Knowledge)

The app is the **platform** — it knows about fitness, not about any specific user. It owns:

- **Exercise Inventory** — a static catalog of exercises with stable IDs, YouTube videos (user-curated), coaching cues, equipment tags, muscle groups, movement patterns. This is the exercise encyclopedia.
- **Data Schemas** — the contract for what a valid program, user profile, and workout log look like. Any program (AI-generated or hand-crafted) must conform to these schemas.
- **The UX** — the 'Human' design system, program overview and phase navigation, schedule visibility, session/exercise timing, history views, weight display with AI-recommended values.
- **Onboarding Flow** — a PWA init session that collects user parameters: goals, age, equipment, injuries, time constraints, experience level. This drives program generation.
- **Training Principles** — platform-level rules (injury prevention, mobility in every phase, form over load, longevity mindset) that constrain all programs. These are not user preferences — they are app-level invariants.

## Pillar 2: The Data (User State + Sync)

Everything personal to a user lives here, separate from the app:

- **User Profile** — the parameters collected during onboarding (goal, constraints, equipment, injury history).
- **Active Program** — the AI-generated, user-approved program structure (phases, schedules, exercise selections with personalized sets/reps/weights). References exercises by ID from the app's catalog.
- **Workout Log** — execution data: weights used, difficulty feedback, notes, failed sets, timestamps, session duration.
- **Sync Layer** — localStorage for offline-first, with opt-in cloud sync. The app works without network; sync is additive.

## Pillar 3: The AI Integration (Generate → Execute → Adapt)

AI is a service the app orchestrates, not a feature bolted on. It drives a continuous loop:

```
Onboard → Generate Program → User Reviews → Execute → Track → Analyze → Adapt
   ↑                                                                        |
   └────────────────────────────────────────────────────────────────────────┘
```

- **Program Generation** — user profile + exercise catalog + training principles → AI produces a program conforming to the app's schema. Can run via GHA workflow or in-app API call.
- **Weight Intelligence** — AI recommends weights based on execution history, difficulty feedback, and progression rules. The user should not have to guess.
- **Program Review & Adaptation** — after each phase (or on-demand), execution data feeds back to AI: 'User struggled with X, progressed fast on Y, reported shoulder pain on Z.' AI proposes program adjustments. User reviews and approves.

## Separation of Concerns

| What | Where | Example |
|------|-------|---------|
| Exercise 'KB Gorilla Rows' with video, cues | `data/exercises.json` (app) | `{ "id": "kb-gorilla-rows", "video_id": "Z44y6AgV-TI", ... }` |
| Schemas for all data types | `data/schemas/*.json` (app) | JSON Schemas for exercises, programs, profiles, workout logs |
| Training principles | `data/principles.json` (app) | Injury prevention rules, mobility requirements |
| User profile (age, goals, injuries) | `user/profile.json` (user data) | Personal parameters |
| Personalized program | `user/program.json` (user data) | AI-generated, user-approved |
| Execution log | localStorage + cloud (user data) | Day-by-day workout history |
| 'Increase weight to 30lbs next week' | AI recommendation → user approves | Adaptation cycle |
