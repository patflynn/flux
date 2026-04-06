# Flux: Design Document

## Data Architecture

### Exercise Catalog (App-Owned)

The app maintains a canonical exercise catalog. Each exercise has a stable ID and rich metadata:

```json
{
  "id": "kb-gorilla-rows",
  "name": "KB Gorilla Rows",
  "muscle_groups": ["back", "biceps"],
  "movement_pattern": "pull",
  "equipment": ["kettlebells"],
  "bilateral": false,
  "video_id": "Z44y6AgV-TI",
  "video_start": 0,
  "coaching_cues": "Keep lower back flat. Use the 10lb DB if KB is too heavy initially.",
  "default_sets": 3,
  "default_reps": "12/side",
  "default_rest": "90s",
  "uses_weight": true,
  "tags": ["posterior-chain", "unilateral"]
}
```

Exercises are referenced by ID in programs. The catalog is the source of truth for video links, coaching cues, and metadata. Users can curate video selections through the app.

### User Profile (User Data)

Collected during onboarding and updatable anytime:

```json
{
  "name": "The Engineer",
  "goal": "Ripped at 47",
  "age": 47,
  "start_date": "2026-02-09",
  "injury_history": ["neck_shoulder", "lower_back"],
  "equipment": ["kettlebells", "swedish_ladder", "pullup_bar", "peloton", "trx"],
  "time_available": "60min",
  "days_per_week": 5,
  "experience_level": "intermediate"
}
```

### Program Structure (User Data, AI-Generated)

Programs reference exercises by catalog ID and add user-specific overrides:

```json
{
  "version": "1.0.0",
  "generated_by": "claude-sonnet-4-5-20250514",
  "generated_at": "2026-02-09T00:00:00Z",
  "phases": [
    {
      "id": "p1",
      "name": "Phase 1: Structural Integrity",
      "duration_weeks": 12,
      "rationale": "Building the chassis. Focus on tendon strength and back safety.",
      "schedule_pattern": ["A", "B", "A", "B", "C", "Rest", "Rest"],
      "deload": { "weeks": [4, 8], "set_reduction": 1, "weight_reduction_pct": 20 },
      "workouts": {
        "A": {
          "name": "Posterior Chain & Pull",
          "focus": "Back Health & Biceps",
          "exercises": [
            { "exercise_id": "band-pull-aparts", "sets": 2, "reps": "15", "rest": "0s", "warmup": true },
            { "exercise_id": "kb-gorilla-rows", "sets": 3, "reps": "12/side", "rest": "90s", "starting_weight": 20, "weight_increment": 5 }
          ]
        }
      }
    }
  ]
}
```

### Workout Log (User Data, Execution)

```json
{
  "entries": [
    {
      "day": 15,
      "date": "2026-02-24",
      "phase_id": "p1",
      "workout_type": "A",
      "session_duration_min": 52,
      "exercises": [
        {
          "exercise_id": "kb-gorilla-rows",
          "sets_completed": 3,
          "weight": 25,
          "difficulty": "hard",
          "notes": "Felt strong today",
          "failed_set": null,
          "failed_rep": null
        }
      ]
    }
  ]
}
```

### Training Principles (App-Owned)

Platform-level rules that constrain all programs, stored in `data/principles.json`:

- Injury prevention protocols (warm-up requirements, contraindicated movements per injury type)
- Mobility work in every phase
- Form over load — progression gated on difficulty feedback
- Longevity mindset — sustainable volume and intensity

These are app invariants, not user preferences. AI-generated programs must respect all active principles.

## AI Integration Design

### Generation Pipeline

1. User completes onboarding (profile data collected)
2. App assembles a generation prompt: profile + exercise catalog + training principles + target schema
3. AI generates a program conforming to the schema
4. App validates the program against the schema
5. User reviews the program (phase overview, exercise selections)
6. User approves → program saved as user data

### Adaptation Loop

After each phase (or triggered by user):

1. App summarizes execution data: compliance rate, weight progression, difficulty trends, user notes, time patterns
2. Summary + current program + exercise catalog → AI proposes adaptations
3. Adaptations presented as a diff: 'Add exercise X, increase Y volume, replace Z due to shoulder feedback'
4. User reviews and approves changes
5. Updated program saved

### Weight Intelligence

Rather than making the user pick weights:

1. For new exercises: AI recommends starting weight based on profile (age, experience, injury history)
2. For returning exercises: algorithm uses last weight + difficulty feedback + progression rules
3. User sees a recommended weight with easy +/- adjustment
4. Difficulty feedback ('easy', 'good', 'hard', 'failed') drives future recommendations

## UX Design Direction: 'The Human'

Philosophy: Wellness-first. Supportive, calm, and breathable. Avoid aggressive gym tropes.

- **Shapes**: High corner radii (24px+ squircles). No sharp corners.
- **Hierarchy**: Whitespace and typographic scale over heavy borders or bright colors.
- **Typography**: High-contrast serif for exercise names (journal feel), geometric sans-serif for data and UI.
- **Haptics**: Success = rapid double-pulse. Selection = soft tick. Alert = sharp triple-pulse.
- **Breathing UI**: Rest timers use soft, breathing background glows to encourage rhythmic breathing.
- **Active State**: High-focus with large hero metrics (reps/weight), minimal distraction, single large 'Complete Set' action.
- **Rest State**: Centered countdown timer, pre-filled log sheet for next set, 'Up Next' preview card.
