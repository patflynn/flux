import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { EXERCISE_CATALOG } from '../src/data/exerciseCatalog';
import {
  buildFilteredCatalog,
  extractRuntimeTemplate,
  generateProgramWithTemplate,
  renderPrompt,
} from '../src/llm/programGenCore';
import { configureProvider, type LLMProvider } from '../src/llm';
import type { Inventory } from '../src/data/inventory';
import type { Program } from '../src/tabs/Workouts/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = resolve(__dirname, '..', 'prompts', 'generate-phase.md');
const RAW_TEMPLATE = readFileSync(PROMPT_PATH, 'utf8');

function idsOf(catalog: ReturnType<typeof buildFilteredCatalog>): string[] {
  return catalog.exercises.map((e) => e.id).sort();
}

function validProgram(exerciseId: string): Program {
  return {
    meta: {
      startDate: '2026-06-01',
      version: 'gen-1',
      principles: [
        'injury_prevention',
        'mobility_every_phase',
        'form_over_load',
        'longevity_focus',
      ],
      constraints: { mobility_required: true, min_mobility_days_per_week: 1 },
    },
    phases: [
      {
        id: 'p1',
        name: 'Generated Phase',
        duration_weeks: 4,
        workouts: {
          A: {
            name: 'Workout A',
            focus: 'mixed',
            exercises: [
              {
                exercise_id: exerciseId,
                sets: 3,
                reps: '8-12',
                rest: '90s',
              },
            ],
          },
          Mobility: {
            name: 'Mobility & Flow',
            focus: 'mobility',
            exercises: [
              {
                exercise_id: 'cat-cow-spinal-flow',
                sets: 2,
                reps: '10',
                rest: '30s',
              },
            ],
          },
        },
      },
    ],
  };
}

function fakeProvider(
  generator: (prompt: string) => string | Promise<string>,
): {
  provider: LLMProvider;
  lastPrompt: () => string;
} {
  let lastPrompt = '';
  const provider: LLMProvider = {
    id: 'fake',
    available: true,
    async generate(opts) {
      lastPrompt = opts.prompt;
      const out = await generator(opts.prompt);
      return out;
    },
  };
  return { provider, lastPrompt: () => lastPrompt };
}

test.describe('buildFilteredCatalog', () => {
  test('empty inventory keeps only bodyweight exercises', () => {
    const filtered = buildFilteredCatalog({});
    const ids = idsOf(filtered);
    // Bodyweight-only exercises remain.
    expect(ids).toContain('warmup-hip-circles');
    expect(ids).toContain('warmup-worlds-greatest-stretch');
    expect(ids).toContain('90-90-hip-switch');
    expect(ids).toContain('cat-cow-spinal-flow');
    expect(ids).toContain('thread-the-needle');
    expect(ids).toContain('wall-slides');
    // swedish-ladder-pushups has equipmentAlternatives: [['bodyweight']]
    expect(ids).toContain('swedish-ladder-pushups');

    // Equipment-required exercises drop.
    expect(ids).not.toContain('warmup-band-pull-aparts'); // resistance-band
    expect(ids).not.toContain('swedish-ladder-dead-hang');
    expect(ids).not.toContain('kb-gorilla-rows');
    expect(ids).not.toContain('kettlebell-swings');
    expect(ids).not.toContain('goblet-squats');
    expect(ids).not.toContain('trx-inverted-rows');
    expect(ids).not.toContain('hanging-knee-raises');
    expect(ids).not.toContain('peloton-hiit-tabata');

    expect(filtered.totalCatalogSize).toBe(
      Object.keys(EXERCISE_CATALOG).length,
    );
    expect(filtered.supportedCount).toBe(filtered.exercises.length);
  });

  test('kettlebell-only inventory surfaces goblet squats, swings, and KB rows with the owned weight', () => {
    const inv: Inventory = {
      kettlebell: { kind: 'kettlebell', ownedWeights: [25] },
    };
    const filtered = buildFilteredCatalog(inv);
    const byId = new Map(filtered.exercises.map((e) => [e.id, e]));

    expect(byId.has('goblet-squats')).toBe(true);
    expect(byId.get('goblet-squats')?.allowedWeights).toEqual([25]);

    expect(byId.has('kettlebell-swings')).toBe(true);
    expect(byId.get('kettlebell-swings')?.allowedWeights).toEqual([25]);

    expect(byId.has('kb-gorilla-rows')).toBe(true);
    expect(byId.get('kb-gorilla-rows')?.allowedWeights).toEqual([25]);

    // TRX exercises still missing.
    expect(byId.has('trx-inverted-rows')).toBe(false);
  });

  test('kettlebell + dumbbell unions weights for exercises that accept either', () => {
    const inv: Inventory = {
      kettlebell: { kind: 'kettlebell', ownedWeights: [25, 35] },
      dumbbell: { kind: 'dumbbell', ownedWeights: [10, 15, 20] },
    };
    const filtered = buildFilteredCatalog(inv);
    const byId = new Map(filtered.exercises.map((e) => [e.id, e]));

    expect(byId.get('kb-gorilla-rows')?.allowedWeights).toEqual([
      10, 15, 20, 25, 35,
    ]);
    expect(byId.get('goblet-squats')?.allowedWeights).toEqual([
      10, 15, 20, 25, 35,
    ]);
    // Swings only accepts kettlebell.
    expect(byId.get('kettlebell-swings')?.allowedWeights).toEqual([25, 35]);
  });

  test('TRX + swedish-ladder + pullup-bar surfaces unweighted exercises only', () => {
    const inv: Inventory = {
      trx: { kind: 'trx', ownedWeights: [] },
      'swedish-ladder': { kind: 'swedish-ladder', ownedWeights: [] },
      'pullup-bar': { kind: 'pullup-bar', ownedWeights: [] },
    };
    const filtered = buildFilteredCatalog(inv);
    const byId = new Map(filtered.exercises.map((e) => [e.id, e]));

    expect(byId.has('trx-inverted-rows')).toBe(true);
    expect(byId.has('swedish-ladder-dead-hang')).toBe(true);
    expect(byId.has('swedish-ladder-pushups')).toBe(true);
    expect(byId.has('hanging-knee-raises')).toBe(true);

    // No weighted exercises.
    expect(byId.has('kettlebell-swings')).toBe(false);
    expect(byId.has('kb-gorilla-rows')).toBe(false);
    expect(byId.has('goblet-squats')).toBe(false);
  });
});

test.describe('renderPrompt + extractRuntimeTemplate', () => {
  test('runtime template is extractable and contains all three placeholders', () => {
    const template = extractRuntimeTemplate(RAW_TEMPLATE);
    expect(template).toContain('{{user_request}}');
    expect(template).toContain('{{filtered_catalog_json}}');
    expect(template).toContain('{{previous_program_or_none}}');
    // It should NOT contain the manual-fallback content.
    expect(template).not.toContain('Phase 1: The Foundation');
  });

  test('renderPrompt substitutes placeholders and embeds the catalog as JSON', () => {
    const template = extractRuntimeTemplate(RAW_TEMPLATE);
    const filtered = buildFilteredCatalog({
      kettlebell: { kind: 'kettlebell', ownedWeights: [25, 35] },
    });
    const prompt = renderPrompt({
      template,
      userRequest: 'hello',
      filteredCatalog: filtered,
    });
    expect(prompt).toContain('hello');
    expect(prompt).toContain('"id": "goblet-squats"');
    expect(prompt).not.toContain('{{user_request}}');
    expect(prompt).not.toContain('{{filtered_catalog_json}}');
    expect(prompt).not.toContain('{{previous_program_or_none}}');
  });

  test('missing markers throw a clear error', () => {
    expect(() => extractRuntimeTemplate('no markers here')).toThrow(
      /RUNTIME PROMPT START\/END markers/,
    );
  });
});

test.describe('generateProgramWithTemplate (mocked provider)', () => {
  test('forwards the filtered catalog into the prompt and excludes unsupported exercises', async () => {
    const inv: Inventory = {
      kettlebell: { kind: 'kettlebell', ownedWeights: [25] },
    };
    const { provider, lastPrompt } = fakeProvider(() =>
      JSON.stringify(validProgram('goblet-squats')),
    );
    configureProvider(provider);

    await generateProgramWithTemplate(
      { inventory: inv, userRequest: 'phase one' },
      RAW_TEMPLATE,
    );

    const prompt = lastPrompt();
    expect(prompt).toContain('"id": "goblet-squats"');
    expect(prompt).toContain('"id": "kettlebell-swings"');
    // Unsupported exercises must not appear in the prompt.
    expect(prompt).not.toContain('"id": "trx-inverted-rows"');
    expect(prompt).not.toContain('"id": "warmup-band-pull-aparts"');
  });

  test('returns an empty warnings list when the program uses only supported exercises', async () => {
    const inv: Inventory = {
      kettlebell: { kind: 'kettlebell', ownedWeights: [25] },
    };
    const { provider } = fakeProvider(() =>
      JSON.stringify(validProgram('goblet-squats')),
    );
    configureProvider(provider);

    const result = await generateProgramWithTemplate(
      { inventory: inv, userRequest: 'phase one' },
      RAW_TEMPLATE,
    );
    expect(result.warnings).toEqual([]);
    expect(result.program.phases.length).toBe(1);
    expect(result.filteredCatalog.supportedCount).toBeGreaterThan(0);
  });

  test('returns warnings when the program references an unsupported exercise', async () => {
    const inv: Inventory = {
      kettlebell: { kind: 'kettlebell', ownedWeights: [25] },
    };
    // trx-inverted-rows requires TRX, which we do not own.
    const { provider } = fakeProvider(() =>
      JSON.stringify(validProgram('trx-inverted-rows')),
    );
    configureProvider(provider);

    const result = await generateProgramWithTemplate(
      { inventory: inv, userRequest: 'phase one' },
      RAW_TEMPLATE,
    );
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.message.includes('trx'))).toBe(true);
  });

  test('non-JSON provider response throws with a clear message', async () => {
    const { provider } = fakeProvider(() => 'not json at all');
    configureProvider(provider);

    await expect(
      generateProgramWithTemplate(
        { inventory: {}, userRequest: 'phase one' },
        RAW_TEMPLATE,
      ),
    ).rejects.toThrow(/AI returned non-JSON/);
  });

  test('structurally-broken JSON throws with schema errors in the message', async () => {
    // Missing meta entirely — schema validator returns errors.
    const { provider } = fakeProvider(() =>
      JSON.stringify({ phases: [] }),
    );
    configureProvider(provider);

    await expect(
      generateProgramWithTemplate(
        { inventory: {}, userRequest: 'phase one' },
        RAW_TEMPLATE,
      ),
    ).rejects.toThrow(/failed schema validation/);
  });

  test('strips ```json code fences from provider output', async () => {
    const fenced = '```json\n' + JSON.stringify(validProgram('cat-cow-spinal-flow')) + '\n```';
    const { provider } = fakeProvider(() => fenced);
    configureProvider(provider);

    const result = await generateProgramWithTemplate(
      { inventory: {}, userRequest: 'phase one' },
      RAW_TEMPLATE,
    );
    expect(result.warnings).toEqual([]);
  });
});
