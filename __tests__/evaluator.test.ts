import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

// Mock all external dependencies
vi.mock('../src/generator/index.js', () => ({
  generateTestCases: vi.fn(),
}));

vi.mock('../src/target/endpoint.js', () => ({
  callEndpoint: vi.fn(),
}));

vi.mock('../src/target/prompt.js', () => ({
  callPrompt: vi.fn(),
}));

vi.mock('../src/judge/index.js', () => ({
  judgeOutput: vi.fn(),
}));

import { evaluate } from '../src/evaluator/index.js';
import { generateTestCases } from '../src/generator/index.js';
import { callPrompt } from '../src/target/prompt.js';
import { judgeOutput } from '../src/judge/index.js';
import type { BehaviorSpec, GeneratedTestCase } from '../src/types/spec.js';

const MOCK_SPEC: BehaviorSpec = {
  version: '1',
  name: 'Test Feature',
  target: {
    prompt: {
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      template: '{{input}}',
    },
  },
  behaviors: [
    {
      name: 'helpful',
      type: 'semantic',
      description: 'Must provide a helpful answer',
    },
    {
      name: 'no-pii',
      type: 'rule',
      rule: 'no-pii',
    },
  ],
  test_generation: { count: 2 },
  thresholds: { pass: 85 },
};

const mockTestCases = (behaviorName: string): GeneratedTestCase[] => [
  {
    id: `${behaviorName}-1`,
    behaviorName,
    input: `Test input 1 for ${behaviorName}`,
    expectedDescription: 'Expected behavior description',
  },
  {
    id: `${behaviorName}-2`,
    behaviorName,
    input: `Test input 2 for ${behaviorName}`,
    expectedDescription: 'Expected behavior description',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('evaluate', () => {
  it('returns a RunReport with correct structure', async () => {
    (generateTestCases as Mock).mockImplementation(async (behavior) =>
      mockTestCases(behavior.name)
    );
    (callPrompt as Mock).mockResolvedValue('A helpful, clean response with no PII.');
    (judgeOutput as Mock).mockResolvedValue({ passed: true, score: 90, reasoning: 'Good.' });

    const report = await evaluate(MOCK_SPEC);

    expect(report.specName).toBe('Test Feature');
    expect(report.featureName).toBe('Test Feature');
    expect(report.behaviors).toHaveLength(2);
    expect(report.totalTests).toBe(4); // 2 behaviors × 2 tests each
    expect(report.id).toBeDefined();
    expect(report.startedAt).toBeDefined();
    expect(report.durationMs).toBeGreaterThan(0);
  });

  it('calculates overall score correctly', async () => {
    (generateTestCases as Mock).mockImplementation(async (behavior) =>
      mockTestCases(behavior.name)
    );
    (callPrompt as Mock).mockResolvedValue('Clean output without any personal data.');
    // All judge calls pass
    (judgeOutput as Mock).mockResolvedValue({ passed: true, score: 100, reasoning: 'Perfect.' });

    const report = await evaluate(MOCK_SPEC);

    expect(report.overallScore).toBe(100);
    expect(report.passed).toBe(true);
    expect(report.passedTests).toBe(4);
  });

  it('marks run as failed when score is below threshold', async () => {
    (generateTestCases as Mock).mockImplementation(async (behavior) =>
      mockTestCases(behavior.name)
    );
    // Return PII to fail the no-pii rule
    (callPrompt as Mock).mockResolvedValue('Response from user john@example.com contains email.');
    (judgeOutput as Mock).mockResolvedValue({ passed: false, score: 40, reasoning: 'Poor quality.' });

    const report = await evaluate(MOCK_SPEC);

    expect(report.passed).toBe(false);
    expect(report.overallScore).toBeLessThan(85);
  });

  it('applies custom threshold from options', async () => {
    (generateTestCases as Mock).mockImplementation(async (behavior) =>
      mockTestCases(behavior.name)
    );
    (callPrompt as Mock).mockResolvedValue('Clean response.');
    (judgeOutput as Mock).mockResolvedValue({ passed: false, score: 60, reasoning: 'Below threshold.' });

    const report = await evaluate(MOCK_SPEC, { threshold: 50 });

    // With 50% threshold and no-pii rule passing (clean output) + semantic failing,
    // pass rate should be 2/4 = 50%, which meets a threshold of 50%
    expect(report.threshold).toBe(50);
  });

  it('handles target call failure gracefully', async () => {
    (generateTestCases as Mock).mockImplementation(async (behavior) =>
      mockTestCases(behavior.name)
    );
    (callPrompt as Mock).mockRejectedValue(new Error('Network timeout'));
    (judgeOutput as Mock).mockResolvedValue({ passed: true, score: 90, reasoning: 'Good.' });

    const report = await evaluate(MOCK_SPEC);

    // All tests should fail due to target error
    const allResults = report.behaviors.flatMap((b) => b.results);
    expect(allResults.every((r) => !r.passed)).toBe(true);
    expect(allResults[0].failureReason).toMatch(/target call failed/i);
  });

  it('calls onProgress callback', async () => {
    (generateTestCases as Mock).mockImplementation(async (behavior) =>
      mockTestCases(behavior.name)
    );
    (callPrompt as Mock).mockResolvedValue('Good response.');
    (judgeOutput as Mock).mockResolvedValue({ passed: true, score: 85, reasoning: 'OK.' });

    const progressCalls: Array<[number, number, string]> = [];

    await evaluate(MOCK_SPEC, {
      onProgress: (done, total, name) => {
        progressCalls.push([done, total, name]);
      },
    });

    // Should have called progress at start (0) and after each test
    expect(progressCalls.length).toBeGreaterThan(0);
    // Final call should have done === total
    const lastCall = progressCalls[progressCalls.length - 1];
    expect(lastCall[0]).toBe(lastCall[1]);
  });

  it('attaches github context to report', async () => {
    (generateTestCases as Mock).mockImplementation(async (behavior) =>
      mockTestCases(behavior.name)
    );
    (callPrompt as Mock).mockResolvedValue('Good response.');
    (judgeOutput as Mock).mockResolvedValue({ passed: true, score: 90, reasoning: 'Good.' });

    const report = await evaluate(MOCK_SPEC, {
      github: {
        commitSha: 'abc1234',
        branch: 'main',
        prNumber: 42,
        repo: 'org/repo',
      },
    });

    expect(report.commitSha).toBe('abc1234');
    expect(report.branch).toBe('main');
    expect(report.prNumber).toBe(42);
    expect(report.repo).toBe('org/repo');
  });

  it('rule behaviors do not call judgeOutput', async () => {
    // Single spec with only a rule behavior
    const ruleOnlySpec: BehaviorSpec = {
      ...MOCK_SPEC,
      behaviors: [{ name: 'no-pii', type: 'rule', rule: 'no-pii' }],
    };

    (generateTestCases as Mock).mockResolvedValue(mockTestCases('no-pii'));
    (callPrompt as Mock).mockResolvedValue('Clean output with no personal data.');

    await evaluate(ruleOnlySpec);

    expect(judgeOutput).not.toHaveBeenCalled();
  });
});
