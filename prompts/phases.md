# Core Principles (MUST be included in all phase prompts)

**CRITICAL: Include these constraints in every program generation request:**

```
MANDATORY REQUIREMENTS:
1. INJURY PREVENTION: Every exercise must be selected for joint-safe movement patterns.
   Prioritize exercises with low injury risk. The user has a history of neck/shoulder pain
   and lower back sensitivity—choose variations that protect these areas.

2. MOBILITY IN EVERY PHASE: Each phase must include dedicated mobility work:
   - At least one workout type per week focused on mobility/flexibility
   - Hip, shoulder, and thoracic spine mobility are required components
   - Active recovery days must include mobility flows

3. FORM OVER LOAD: Coaching cues in exercise notes should emphasize technique.
   Include tempo prescriptions where relevant. Never sacrifice form for progression.

4. VIDEO QUALITY: All video_id references should link to tutorials that emphasize
   proper form and injury prevention, preferably from physical therapists or
   corrective exercise specialists (e.g., Prehab Guys, Fitness 4 Back Pain).

5. LONGEVITY MINDSET: This is a 47-year-old training for sustainable fitness,
   not short-term gains. Program for decades of health, not months of aesthetics.

6. ONE EXERCISE PER ENTRY: Never combine multiple movements in a single exercise
   entry (e.g., "Pullups & Dips" is invalid). Each movement gets its own entry
   with its own sets, reps, and video link. This enables proper tracking.
```

---

# Phase 1: The Foundation (Months 1-3)
"Act as a strength coach specializing in sarcopenia prevention and aesthetics for men over 45. Create a 12-week 'Recomposition' program for a male, 47, with mild back history.
Equipment: Kettlebells, Swedish Ladder, Pull-up Bar, Peloton.
Goal: Fix posture, build core stability, and establish neuromuscular connection.
Format: Output valid JSON matching the 'Flux' schema.
Schedule: 3 days Strength (Full Body), 2 days Conditioning (Peloton/Carries). Focus on tempo and form over heavy weight."

# Phase 2: Hypertrophy & Shape (Months 4-7)
"Update the program for the 'Hypertrophy' phase. The user has now added Adjustable Dumbbells (5-50lbs), a Bench, and TRX.
Goal: Sarcoplasmic hypertrophy (muscle size) and 'V-taper' development (Back/Shoulders).
Constraint: The user has mild ADD; vary the accessory movements every 4 weeks to maintain engagement.
Format: JSON.
Schedule: 4-day Upper/Lower split. Include supersets to increase density."

# Phase 3: The "Reveal" & Cut (Months 8-12)
"Update the program for the final 'Cutting' phase.
Goal: Maximize caloric burn while maintaining muscle mass to get 'ripped' (10-12% body fat).
Technique: Use 'Peripheral Heart Action' (alternating upper/lower exercises) to keep heart rate high.
Format: JSON.
Schedule: 3 days Full Body Metabolic Resistance Training + 2 days High-Intensity Intervals on Peloton."

