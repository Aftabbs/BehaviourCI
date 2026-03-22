import { randomUUID } from 'crypto';
import { generateTestCases } from '../generator/index.js';
import { callEndpoint } from '../target/endpoint.js';
import { callPrompt } from '../target/prompt.js';
import { runRule } from '../rules/index.js';
import { judgeOutput } from '../judge/index.js';
import type {
  BehaviorSpec,
  Behavior,
  GeneratedTestCase,
  TestResult,
  BehaviorSummary,
  RunReport,
} from '../types/spec.js';

export interface EvaluatorOptions {
  /** Override threshold from spec */
  threshold?: number;
  /** GitHub context for the run report */
  github?: {
    commitSha?: string;
    branch?: string;
    prNumber?: number;
    repo?: string;
  };
  /** Called after each test case is evaluated (for progress reporting) */
  onProgress?: (done: number, total: number, behaviorName: string) => void;
}

/** Call the target (endpoint or prompt) with a test input */
async function callTarget(spec: BehaviorSpec, input: string): Promise<string> {
  if (spec.target.endpoint) {
    return callEndpoint(spec.target.endpoint, input);
  }
  if (spec.target.prompt) {
    return callPrompt(spec.target.prompt, input);
  }
  throw new Error('Spec target defines neither endpoint nor prompt');
}

/** Evaluate a single test case against a behavior */
async function evaluateTestCase(
  spec: BehaviorSpec,
  behavior: Behavior,
  testCase: GeneratedTestCase
): Promise<TestResult> {
  const start = Date.now();

  let actualOutput: string;
  try {
    actualOutput = await callTarget(spec, testCase.input);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      id: testCase.id,
      behaviorName: behavior.name,
      behaviorType: behavior.type,
      input: testCase.input,
      actualOutput: '',
      passed: false,
      score: 0,
      checkType: behavior.type === 'rule' ? 'rule' : 'semantic',
      failureReason: `Target call failed: ${msg}`,
      durationMs: Date.now() - start,
    };
  }

  // Rule-based check
  if (behavior.type === 'rule' && behavior.rule) {
    const ruleResult = runRule(behavior, actualOutput);
    return {
      id: testCase.id,
      behaviorName: behavior.name,
      behaviorType: 'rule',
      input: testCase.input,
      actualOutput,
      passed: ruleResult.passed,
      score: ruleResult.passed ? 100 : 0,
      checkType: 'rule',
      failureReason: ruleResult.failureReason,
      durationMs: Date.now() - start,
    };
  }

  // Semantic check — LLM as judge
  const judgeResult = await judgeOutput({
    behaviorName: behavior.name,
    behaviorDescription: behavior.description ?? behavior.name,
    input: testCase.input,
    output: actualOutput,
    expectedDescription: testCase.expectedDescription,
  });

  return {
    id: testCase.id,
    behaviorName: behavior.name,
    behaviorType: 'semantic',
    input: testCase.input,
    actualOutput,
    passed: judgeResult.passed,
    score: judgeResult.score,
    checkType: 'semantic',
    failureReason: judgeResult.passed ? undefined : `Score ${judgeResult.score}/100: ${judgeResult.reasoning}`,
    judgeReasoning: judgeResult.reasoning,
    durationMs: Date.now() - start,
  };
}

/** Evaluate all test cases for a single behavior */
async function evaluateBehavior(
  spec: BehaviorSpec,
  behavior: Behavior,
  options: EvaluatorOptions,
  progressOffset: number,
  totalTests: number
): Promise<BehaviorSummary> {
  const testCases = await generateTestCases(behavior, spec.name, spec.test_generation);

  const results: TestResult[] = [];
  let done = progressOffset;

  // Run test cases concurrently (up to 3 at a time to respect Groq rate limits)
  const CONCURRENCY = 3;
  for (let i = 0; i < testCases.length; i += CONCURRENCY) {
    const batch = testCases.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((tc) => evaluateTestCase(spec, behavior, tc))
    );
    results.push(...batchResults);
    done += batchResults.length;
    options.onProgress?.(done, totalTests, behavior.name);
  }

  const passedTests = results.filter((r) => r.passed).length;
  const passRate = results.length > 0 ? (passedTests / results.length) * 100 : 0;

  // Per-behavior threshold
  const perBehaviorThreshold = spec.thresholds?.per_behavior?.[behavior.name];
  const effectiveThreshold = perBehaviorThreshold ?? (spec.thresholds?.pass ?? 85);

  return {
    name: behavior.name,
    totalTests: results.length,
    passedTests,
    passRate,
    passed: passRate >= effectiveThreshold,
    results,
  };
}

/**
 * Run the full BehaviorCI evaluation for a spec.
 * This is the core orchestrator — called by both the CLI and GitHub Action.
 */
export async function evaluate(spec: BehaviorSpec, options: EvaluatorOptions = {}): Promise<RunReport> {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  const runId = randomUUID();

  const testCount = spec.test_generation?.count ?? 10;
  const totalTests = spec.behaviors.length * testCount;

  options.onProgress?.(0, totalTests, '');

  // Evaluate each behavior sequentially (to avoid overwhelming Groq rate limits)
  const behaviorSummaries: BehaviorSummary[] = [];
  let progressOffset = 0;

  for (let i = 0; i < spec.behaviors.length; i++) {
    const behavior = spec.behaviors[i];

    // Small inter-behavior delay to stay under RPM limits on free-tier providers
    if (i > 0) await new Promise((r) => setTimeout(r, 1500));

    const summary = await evaluateBehavior(spec, behavior, options, progressOffset, totalTests);
    behaviorSummaries.push(summary);
    progressOffset += summary.totalTests;
  }

  const totalPassedTests = behaviorSummaries.reduce((sum, b) => sum + b.passedTests, 0);
  const totalAllTests = behaviorSummaries.reduce((sum, b) => sum + b.totalTests, 0);
  const overallScore = totalAllTests > 0 ? (totalPassedTests / totalAllTests) * 100 : 0;

  const threshold = options.threshold ?? spec.thresholds?.pass ?? 85;

  return {
    id: runId,
    specName: spec.name,
    featureName: spec.name,
    startedAt,
    durationMs: Date.now() - startMs,
    overallScore: Math.round(overallScore * 10) / 10,
    passed: overallScore >= threshold,
    totalTests: totalAllTests,
    passedTests: totalPassedTests,
    threshold,
    behaviors: behaviorSummaries,
    commitSha: options.github?.commitSha,
    branch: options.github?.branch,
    prNumber: options.github?.prNumber,
    repo: options.github?.repo,
  };
}
