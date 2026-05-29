// Normalized equipment catalog. Exercises reference these ids; the per-user
// inventory (added in PR-B) also keys off this list. Keep it small and
// kebab-case; add new kinds here before referencing them anywhere else.

export type EquipmentKind =
  | 'kettlebell'
  | 'dumbbell'
  | 'barbell'
  | 'bench'
  | 'pullup-bar'
  | 'swedish-ladder'
  | 'trx'
  | 'resistance-band'
  | 'peloton-bike'
  | 'bodyweight'         // sentinel: requires nothing
  | 'cardio-equipment';  // sentinel: generic cardio machine

export interface EquipmentItem {
  id: EquipmentKind;
  name: string;
  category: 'free-weight' | 'fixed' | 'cardio' | 'accessory' | 'sentinel';
  // True when the user selects a load from this item (KB/DB/barbell). False for
  // pull-up bars, TRX, peloton, bodyweight — these don't have a 'pick a weight'
  // affordance even though the user may add a vest etc.
  hasWeightSelection: boolean;
}

export type EquipmentCatalog = Record<EquipmentKind, EquipmentItem>;

export const EQUIPMENT_CATALOG: EquipmentCatalog = {
  kettlebell: {
    id: 'kettlebell',
    name: 'Kettlebell',
    category: 'free-weight',
    hasWeightSelection: true,
  },
  dumbbell: {
    id: 'dumbbell',
    name: 'Dumbbell',
    category: 'free-weight',
    hasWeightSelection: true,
  },
  barbell: {
    id: 'barbell',
    name: 'Barbell',
    category: 'free-weight',
    hasWeightSelection: true,
  },
  bench: {
    id: 'bench',
    name: 'Bench',
    category: 'fixed',
    hasWeightSelection: false,
  },
  'pullup-bar': {
    id: 'pullup-bar',
    name: 'Pull-up Bar',
    category: 'fixed',
    hasWeightSelection: false,
  },
  'swedish-ladder': {
    id: 'swedish-ladder',
    name: 'Swedish Ladder',
    category: 'fixed',
    hasWeightSelection: false,
  },
  trx: {
    id: 'trx',
    name: 'TRX',
    category: 'accessory',
    hasWeightSelection: false,
  },
  'resistance-band': {
    id: 'resistance-band',
    name: 'Resistance Band',
    category: 'accessory',
    hasWeightSelection: false,
  },
  'peloton-bike': {
    id: 'peloton-bike',
    name: 'Peloton Bike',
    category: 'cardio',
    hasWeightSelection: false,
  },
  'cardio-equipment': {
    id: 'cardio-equipment',
    name: 'Cardio Equipment',
    category: 'cardio',
    hasWeightSelection: false,
  },
  bodyweight: {
    id: 'bodyweight',
    name: 'Bodyweight',
    category: 'sentinel',
    hasWeightSelection: false,
  },
};
