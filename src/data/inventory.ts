// Per-user equipment inventory. The Workouts state.ts persists this in a
// 'inventory' IDB store under the key 'current'. Wrapped in a LocationsState
// so future work can add multi-location support (gym vs home vs travel) without
// another migration — PR-B only ever edits the active location.

import type { EquipmentKind } from './equipmentCatalog';

export interface InventoryItem {
  kind: EquipmentKind;
  // Discrete weights the user owns, in lbs. Empty array for kinds where
  // hasWeightSelection is false (TRX, pullup bar, bodyweight, etc.).
  ownedWeights: number[];
  note?: string;
}

export type Inventory = Partial<Record<EquipmentKind, InventoryItem>>;

export interface Location {
  id: string;
  name: string;
  inventory: Inventory;
}

export interface LocationsState {
  locations: Record<string, Location>;
  activeLocationId: string;
}

export const DEFAULT_LOCATIONS_STATE: LocationsState = {
  locations: { default: { id: 'default', name: 'Home', inventory: {} } },
  activeLocationId: 'default',
};

export function cloneDefaultLocationsState(): LocationsState {
  return {
    locations: {
      default: { id: 'default', name: 'Home', inventory: {} },
    },
    activeLocationId: 'default',
  };
}

// Convenience selector — read the inventory of the active location.
export function activeInventory(state: LocationsState): Inventory {
  return state.locations[state.activeLocationId]?.inventory ?? {};
}

// True when the user has populated inventory in any location. Used to
// gate constrained-picker behaviour — first-run users keep the old free
// input until they've configured something.
export function isInventoryConfigured(state: LocationsState): boolean {
  return Object.values(state.locations).some(
    (loc) => Object.keys(loc.inventory).length > 0,
  );
}
