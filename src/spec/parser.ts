import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { z } from 'zod';
import type { BehaviorSpec } from '../types/spec.js';

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const RuleConfigSchema = z.object({
  words: z.number().positive().optional(),
  chars: z.number().positive().optional(),
  pattern: z.string().optional(),
  caseSensitive: z.boolean().optional(),
});

const BehaviorSchema = z.object({
  name: z.string().min(1, 'Behavior name cannot be empty'),
  type: z.enum(['semantic', 'rule']),
  description: z.string().optional(),
  rule: z
    .enum(['no-pii', 'max-length', 'min-length', 'must-contain', 'must-not-contain', 'must-be-json'])
    .optional(),
  config: RuleConfigSchema.optional(),
}).refine(
  (b) => b.type !== 'rule' || b.rule !== undefined,
  { message: 'Behaviors with type "rule" must specify a "rule" field' }
).refine(
  (b) => b.type !== 'semantic' || b.description !== undefined,
  { message: 'Behaviors with type "semantic" must specify a "description" field' }
);

const EndpointTargetSchema = z.object({
  url: z.string().url('endpoint.url must be a valid URL'),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH']).optional().default('POST'),
  headers: z.record(z.string()).optional(),
  body_template: z.string().optional(),
  response_path: z.string().optional(),
  timeout_ms: z.number().positive().optional().default(10000),
});

const PromptTargetSchema = z.object({
  provider: z.enum(['groq', 'openai', 'anthropic', 'azure-openai']),
  model: z.string().min(1),
  system: z.string().optional(),
  template: z.string().min(1, 'prompt.template cannot be empty'),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().positive().optional(),
});

const TargetSchema = z.object({
  endpoint: EndpointTargetSchema.optional(),
  prompt: PromptTargetSchema.optional(),
}).refine(
  (t) => t.endpoint !== undefined || t.prompt !== undefined,
  { message: 'target must define either "endpoint" or "prompt" (or both)' }
);

const BehaviorSpecSchema = z.object({
  version: z.string().default('1'),
  name: z.string().min(1, 'Spec "name" is required'),
  description: z.string().optional(),
  target: TargetSchema,
  behaviors: z.array(BehaviorSchema).min(1, 'At least one behavior is required'),
  test_generation: z
    .object({
      count: z.number().int().min(1).max(50).optional().default(10),
      seed_inputs: z.array(z.string()).optional(),
    })
    .optional(),
  thresholds: z
    .object({
      pass: z.number().min(0).max(100).optional().default(85),
      per_behavior: z.record(z.number().min(0).max(100)).optional(),
    })
    .optional(),
});

// ─── Parser ──────────────────────────────────────────────────────────────────

/**
 * Parse and validate a .behaviourci.yml file.
 * Throws a descriptive error if the spec is invalid.
 */
export function parseSpec(filePath: string): BehaviorSpec {
  let raw: unknown;

  try {
    const content = readFileSync(filePath, 'utf-8');
    raw = load(content);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read spec file "${filePath}": ${msg}`);
  }

  const result = BehaviorSpecSchema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid spec file "${filePath}":\n${issues}`);
  }

  return result.data as BehaviorSpec;
}

/**
 * Parse a spec from a raw YAML string (useful for testing).
 */
export function parseSpecFromString(yamlContent: string, sourceName = '<inline>'): BehaviorSpec {
  let raw: unknown;
  try {
    raw = load(yamlContent);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse YAML from ${sourceName}: ${msg}`);
  }

  const result = BehaviorSpecSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid spec in ${sourceName}:\n${issues}`);
  }

  return result.data as BehaviorSpec;
}
