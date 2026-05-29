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

import promptTemplate from '../../prompts/generate-phase.md?raw';
import {
  generateProgramWithTemplate,
  type GenerateProgramOptions,
  type ProgramGenerationResult,
} from './programGenCore';

export {
  buildFilteredCatalog,
  extractRuntimeTemplate,
  renderPrompt,
  type FilteredCatalog,
  type FilteredExercise,
  type GenerateProgramOptions,
  type ProgramGenerationResult,
} from './programGenCore';

export function generateProgram(
  opts: GenerateProgramOptions,
): Promise<ProgramGenerationResult> {
  return generateProgramWithTemplate(opts, promptTemplate);
}
