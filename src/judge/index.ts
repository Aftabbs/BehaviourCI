import { getPrimaryProvider } from '../providers/index.js';
import type { JudgeResult } from '../types/spec.js';

const JUDGE_SYSTEM = `You are an expert AI behavior evaluator (judge).
Your job is to determine whether an AI system's output satisfies a specific behavioral requirement.

Be strict but fair. Focus only on whether the specific requirement is met.
Ignore unrelated aspects of the output.

Return ONLY a JSON object with this exact shape:
{
  "passed": true or false,
  "score": <integer 0-100 representing how well the requirement is met>,
  "reasoning": "<one to two sentences explaining your verdict>"
}`;

/**
 * Use Groq 70B as an LLM judge to evaluate whether an AI output meets a behavior requirement.
 */
export async function judgeOutput(params: {
  behaviorName: string;
  behaviorDescription: string;
  input: string;
  output: string;
  expectedDescription: string;
}): Promise<JudgeResult> {
  const provider = getPrimaryProvider();

  const userPrompt = `Behavioral requirement to evaluate: "${params.behaviorName}"
Requirement description: ${params.behaviorDescription}

User input sent to the AI:
"""
${params.input}
"""

AI system output:
"""
${params.output}
"""

Expected behavior: ${params.expectedDescription}

Does the AI output satisfy the behavioral requirement?
Score 0-100 where 100 = perfectly meets the requirement, 0 = completely fails it.
Score ≥ 70 is considered "passed".`;

  const result = await provider.complete(
    [
      { role: 'system', content: JUDGE_SYSTEM },
      { role: 'user', content: userPrompt },
    ],
    { json_mode: true, temperature: 0.1, max_tokens: 512 }
  );

  let parsed: { passed: boolean; score: number; reasoning: string };
  try {
    parsed = JSON.parse(result.content) as typeof parsed;
  } catch {
    throw new Error(`Judge returned invalid JSON: ${result.content}`);
  }

  const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score ?? 0))));
  const passed = typeof parsed.passed === 'boolean' ? parsed.passed : score >= 70;

  return {
    passed,
    score,
    reasoning: String(parsed.reasoning ?? ''),
  };
}
