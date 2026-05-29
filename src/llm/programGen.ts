// Program-generation orchestrator. The single entry point feature code uses
// to ask the LLM for a new workout phase.
//
// Pipeline:
//   inventory + user request
//     → buildFilteredCatalog (drop unsupported exercises, annotate weights)
//     → render the runtime prompt template (prompts/generate-phase.md)
//     → generate() via the active LLM provider
//     → JSON.parse + validateProgram (errors throw, warnings flow back)
//
// The provider stack is still stubbed in src/llm/index.ts — generateProgram
// throws "LLM not configured" until the user configures a provider.

import { EXERCISE_CATALOG } from '../data/exerciseCatalog';
import type { Exercise } from '../data/types';
import type { Inventory } from '../data/inventory';
import {
  allowedWeightsForExercise,
  isExerciseSupportedByInventory,
} from '../tabs/Workouts/logic/equipmentResolve';
import type { EquipmentKind } from '../data/equipmentCatalog';
import { validateProgramSchema, type Finding } from '../db/programSchema';
import type { Program } from '../tabs/Workouts/types';
import { generate } from './index';

import promptTemplate from '../../prompts/generate-phase.md?raw';

export interface FilteredExercise {
  id: string;
  name: string;
  muscleGroups: string[];
  equipmentRequired: EquipmentKind[];
  // Resolved against inventory. null = bodyweight / no weight. [] never
  // appears here because unsupported exercises are dropped upstream.
  allowedWeights: number[] | null;
  techniqueNote?: string;
  demoVideoId?: string;
}

export interface FilteredCatalog {
  exercises: FilteredExercise[];
  totalCatalogSize: number;
  supportedCount: number;
}

export function buildFilteredCatalog(inv: Inventory): FilteredCatalog {
  const entries = Object.values(EXERCISE_CATALOG);
  const exercises: FilteredExercise[] = [];

  for (const ex of entries) {
    if (!isExerciseSupportedByInventory(ex, inv)) continue;
    const allowedWeights = ex.usesWeight
      ? allowedWeightsForExercise(ex, inv)
      : null;
    exercises.push(buildFilteredEntry(ex, allowedWeights));
  }

  return {
    exercises,
    totalCatalogSize: entries.length,
    supportedCount: exercises.length,
  };
}

function buildFilteredEntry(
  ex: Exercise,
  allowedWeights: number[] | null,
): FilteredExercise {
  const out: FilteredExercise = {
    id: ex.id,
    name: ex.name,
    muscleGroups: ex.muscleGroups,
    equipmentRequired: ex.equipmentRequired,
    allowedWeights,
  };
  if (ex.techniqueNote !== undefined) out.techniqueNote = ex.techniqueNote;
  if (ex.demoVideoId !== undefined) out.demoVideoId = ex.demoVideoId;
  return out;
}

export interface ProgramGenerationResult {
  program: Program;
  warnings: Finding[];
  filteredCatalog: FilteredCatalog;
}

export interface GenerateProgramOptions {
  inventory: Inventory;
  userRequest: string;
  previousProgram?: Program;
}

// The schema reference embedded in the prompt. Mirrors the manual template
// in prompts/generate-phase.md so coaches who want to inspect the exact
// shape can do so without reading code.
const PROGRAM_SCHEMA = {
  type: 'object',
  required: ['meta', 'phases'],
  properties: {
    meta: {
      type: 'object',
      required: ['startDate', 'version', 'principles', 'constraints'],
    },
    phases: { type: 'array' },
  },
};

const RUNTIME_START_MARKER = '## RUNTIME PROMPT START';
const RUNTIME_END_MARKER = '## RUNTIME PROMPT END';

export function extractRuntimeTemplate(raw: string): string {
  const start = raw.indexOf(RUNTIME_START_MARKER);
  const end = raw.indexOf(RUNTIME_END_MARKER);
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(
      'prompts/generate-phase.md is missing RUNTIME PROMPT START/END markers',
    );
  }
  return raw.slice(start + RUNTIME_START_MARKER.length, end).trim();
}

export function renderPrompt(opts: {
  template: string;
  userRequest: string;
  filteredCatalog: FilteredCatalog;
  previousProgram?: Program;
}): string {
  const catalogJson = JSON.stringify(
    opts.filteredCatalog.exercises.map((e) => ({
      id: e.id,
      name: e.name,
      muscle_groups: e.muscleGroups,
      equipment_required: e.equipmentRequired,
      allowed_weights: e.allowedWeights,
      technique_note: e.techniqueNote,
    })),
    null,
    2,
  );
  const prev = opts.previousProgram
    ? JSON.stringify(opts.previousProgram, null, 2)
    : 'none';
  return opts.template
    .replace('{{user_request}}', opts.userRequest.trim())
    .replace('{{filtered_catalog_json}}', catalogJson)
    .replace('{{previous_program_or_none}}', prev);
}

function stripCodeFences(s: string): string {
  // Permissive: some providers wrap JSON in ```json ... ``` even when told not to.
  const trimmed = s.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;
  const m = fence.exec(trimmed);
  return m ? m[1].trim() : trimmed;
}

export async function generateProgram(
  opts: GenerateProgramOptions,
): Promise<ProgramGenerationResult> {
  const filteredCatalog = buildFilteredCatalog(opts.inventory);
  const template = extractRuntimeTemplate(promptTemplate);
  const prompt = renderPrompt({
    template,
    userRequest: opts.userRequest,
    filteredCatalog,
    previousProgram: opts.previousProgram,
  });

  const raw = await generate({ prompt, schema: PROGRAM_SCHEMA });
  if (typeof raw !== 'string') {
    throw new Error('LLM provider returned a stream; generateProgram expects a single string response');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(raw));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown parse error';
    throw new Error(`AI returned non-JSON: ${message}`);
  }

  const result = validateProgramSchema(parsed, EXERCISE_CATALOG, opts.inventory);
  if (result.errors.length > 0) {
    const head = result.errors.slice(0, 3).map((f) => `${f.path}: ${f.message}`).join('; ');
    throw new Error(`Generated program failed schema validation: ${head}`);
  }

  return {
    program: parsed as Program,
    warnings: result.warnings ?? [],
    filteredCatalog,
  };
}
