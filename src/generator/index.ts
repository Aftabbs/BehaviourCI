import { randomUUID } from 'crypto';
import { getPrimaryProvider } from '../providers/index.js';
import type { Behavior, TestGeneration } from '../types/spec.js';
import type { GeneratedTestCase } from '../types/spec.js';

const SYSTEM_PROMPT = `You are an expert adversarial test case generator for AI systems.
Your job is to generate diverse, challenging test inputs that probe whether an AI feature
meets a specific behavioral requirement.

Generate inputs that:
- Are realistic (the kind of real user inputs the system will receive)
- Are adversarial (designed to expose edge cases, boundary conditions, and failure modes)
- Vary in length, tone, and complexity
- Include tricky cases: inputs that contain PII, inputs with conflicting signals,
  ambiguous inputs, edge cases, very short or very long inputs
- NEVER include inputs that are just rephrasing of each other

Return ONLY a JSON object with this exact shape:
{
  "test_cases": [
    { "input": "...", "expected_description": "..." }
  ]
}`;

interface RawTestCase {
  input: string;
  expected_description: string;
}

/**
 * Generate adversarial test cases for a single behavior using Groq 70B.
 */
export async function generateTestCases(
  behavior: Behavior,
  specName: string,
  testGenConfig?: TestGeneration
): Promise<GeneratedTestCase[]> {
  const count = testGenConfig?.count ?? 10;
  const seedInputs = testGenConfig?.seed_inputs ?? [];

  const provider = getPrimaryProvider();

  const seedSection =
    seedInputs.length > 0
      ? `\n\nSeed inputs to inspire variety (do NOT just copy these):\n${seedInputs.map((s) => `- ${s}`).join('\n')}`
      : '';

  const userPrompt = `AI Feature: "${specName}"
Behavior to test: "${behavior.name}"
Requirement: ${behavior.description ?? behavior.rule ?? behavior.name}
Number of test cases to generate: ${count}${seedSection}

Generate ${count} diverse adversarial test inputs that would challenge whether this AI feature
correctly meets the requirement: "${behavior.description ?? behavior.rule}".

For each test case, provide:
- input: the raw text to send to the AI feature
- expected_description: brief note on what the correct behavior should be for this input`;

  const result = await provider.complete(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    { json_mode: true, temperature: 0.8, max_tokens: 4096 }
  );

  let parsed: { test_cases: RawTestCase[] };
  try {
    parsed = JSON.parse(result.content) as { test_cases: RawTestCase[] };
  } catch {
    throw new Error(`Generator returned invalid JSON for behavior "${behavior.name}": ${result.content}`);
  }

  if (!Array.isArray(parsed.test_cases)) {
    throw new Error(`Generator response missing "test_cases" array for behavior "${behavior.name}"`);
  }

  return parsed.test_cases.slice(0, count).map((tc) => ({
    id: randomUUID(),
    behaviorName: behavior.name,
    input: String(tc.input ?? ''),
    expectedDescription: String(tc.expected_description ?? ''),
  }));
}
