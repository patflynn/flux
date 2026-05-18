import type { ExerciseCatalog } from './types';

// The Flux exercise catalog. Every exercise the app knows about lives here.
// Workout programs reference these entries by id; UI components read metadata
// (name, demo video, technique cues) from here. Add new exercises by inserting
// new catalog entries — keep ids in kebab-case, names unique.

export const EXERCISE_CATALOG: ExerciseCatalog = {
  'warmup-band-pull-aparts': {
    id: 'warmup-band-pull-aparts',
    name: 'Warmup: Band Pull-Aparts',
    demoVideoId: 'MnDpmNYUjbc',
    techniqueNote: 'Light band. Squeeze shoulder blades together at end range.',
    usesWeight: false,
  },
  'warmup-hip-circles': {
    id: 'warmup-hip-circles',
    name: 'Warmup: Hip Circles',
    demoVideoId: 'altA7815AGs',
    demoVideoStart: 9,
    techniqueNote: 'Controlled circles, both directions. Open up the hip capsule.',
    usesWeight: false,
  },
  'swedish-ladder-dead-hang': {
    id: 'swedish-ladder-dead-hang',
    name: 'Swedish Ladder Dead Hang',
    demoVideoId: 'iayQ-AeOpvE',
    demoVideoStart: 7,
    techniqueNote: 'Engage scaps, do not just hang loose.',
    usesWeight: false,
  },
  'kb-gorilla-rows': {
    id: 'kb-gorilla-rows',
    name: 'KB Gorilla Rows',
    demoVideoId: 'Z44y6AgV-TI',
    techniqueNote:
      'Keep lower back flat. Use the 10lb DB if KB is too heavy initially.',
    usesWeight: true,
    defaultStartingWeight: 20,
    defaultWeightIncrement: 5,
  },
  'kettlebell-swings': {
    id: 'kettlebell-swings',
    name: 'Kettlebell Swings',
    demoVideoId: '1cVT3ee9mgU',
    demoVideoStart: 9,
    techniqueNote: 'Hinge only. Squeeze glutes at top. No lower back rounding.',
    usesWeight: true,
    defaultStartingWeight: 25,
    defaultWeightIncrement: 5,
  },
  'trx-inverted-rows': {
    id: 'trx-inverted-rows',
    name: 'TRX Inverted Rows',
    demoVideoId: 'ypIQZWKMbkU',
    demoVideoStart: 13,
    techniqueNote:
      'Adjust strap length to change difficulty. Stop 1-2 reps before form breaks down.',
    usesWeight: false,
  },
  'warmup-worlds-greatest-stretch': {
    id: 'warmup-worlds-greatest-stretch',
    name: "Warmup: World's Greatest Stretch",
    demoVideoId: 'u3M3F8ScJsE',
    techniqueNote:
      'Lunge, rotate, reach. Opens hips, T-spine, and shoulders in one flow.',
    usesWeight: false,
  },
  'goblet-squats': {
    id: 'goblet-squats',
    name: 'Goblet Squats',
    demoVideoId: 'tToWat96Rhk',
    techniqueNote: 'Elbows inside knees at bottom.',
    usesWeight: true,
    defaultStartingWeight: 20,
    defaultWeightIncrement: 5,
  },
  'swedish-ladder-pushups': {
    id: 'swedish-ladder-pushups',
    name: 'Swedish Ladder Pushups',
    demoVideoId: 'GcSyCL4qpNI',
    techniqueNote: 'Slow eccentric (3 seconds down).',
    usesWeight: false,
  },
  'hanging-knee-raises': {
    id: 'hanging-knee-raises',
    name: 'Hanging Knee Raises',
    demoVideoId: 'l7OroezzX9k',
    techniqueNote: "Back against the ladder. Don't swing.",
    usesWeight: false,
  },
  'peloton-hiit-tabata': {
    id: 'peloton-hiit-tabata',
    name: 'Peloton HIIT Tabata',
    techniqueNote: "Select a 'Tabata' or 'HIIT' class from the library.",
    usesWeight: false,
  },
  '90-90-hip-switch': {
    id: '90-90-hip-switch',
    name: '90/90 Hip Switch',
    demoVideoId: 'bJII__gcUHA',
    techniqueNote: 'Loosen up the hips for squats.',
    usesWeight: false,
  },
  'cat-cow-spinal-flow': {
    id: 'cat-cow-spinal-flow',
    name: 'Cat/Cow Spinal Flow',
    demoVideoId: 'Xq3nUS-Y2q4',
    techniqueNote: 'Focus on segmental movement.',
    usesWeight: false,
  },
  'thread-the-needle': {
    id: 'thread-the-needle',
    name: 'Thread the Needle',
    demoVideoId: 'ljEdoRyuPpg',
    techniqueNote:
      'Thoracic rotation. Reach through, then open to ceiling. Keep hips stacked.',
    usesWeight: false,
  },
  'wall-slides': {
    id: 'wall-slides',
    name: 'Wall Slides',
    demoVideoId: 'gYVohh1dHHQ',
    techniqueNote:
      'Keep lower back and wrists flat against wall. Targets shoulder mobility and scapular control.',
    usesWeight: false,
  },
  'peloton-power-zone-endurance': {
    id: 'peloton-power-zone-endurance',
    name: 'Peloton Power Zone Endurance',
    techniqueNote: 'Zone 2/3 focus. Sweat but able to talk.',
    usesWeight: false,
  },
};
