import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

// Mock the providers module before importing judge
vi.mock('../src/providers/index.js', () => ({
  getPrimaryProvider: vi.fn(),
}));

import { judgeOutput } from '../src/judge/index.js';
import { getPrimaryProvider } from '../src/providers/index.js';

const mockProvider = {
  complete: vi.fn(),
};

beforeEach(() => {
  (getPrimaryProvider as Mock).mockReturnValue(mockProvider);
  vi.clearAllMocks();
});

describe('judgeOutput', () => {
  const baseParams = {
    behaviorName: 'professional tone',
    behaviorDescription: 'Must use professional, neutral language',
    input: 'Why is my bill so high?',
    output: 'Your bill is higher due to increased usage in October.',
    expectedDescription: 'Professional and neutral response',
  };

  it('returns passed=true when score >= 70', async () => {
    mockProvider.complete.mockResolvedValueOnce({
      content: JSON.stringify({ passed: true, score: 88, reasoning: 'Tone is professional.' }),
    });

    const result = await judgeOutput(baseParams);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(88);
    expect(result.reasoning).toBe('Tone is professional.');
  });

  it('returns passed=false when score < 70', async () => {
    mockProvider.complete.mockResolvedValueOnce({
      content: JSON.stringify({ passed: false, score: 45, reasoning: 'Response is too casual.' }),
    });

    const result = await judgeOutput(baseParams);
    expect(result.passed).toBe(false);
    expect(result.score).toBe(45);
  });

  it('clamps score to 0-100 range', async () => {
    mockProvider.complete.mockResolvedValueOnce({
      content: JSON.stringify({ passed: true, score: 150, reasoning: 'Out of range.' }),
    });

    const result = await judgeOutput(baseParams);
    expect(result.score).toBe(100);
  });

  it('infers passed from score when passed field is missing', async () => {
    mockProvider.complete.mockResolvedValueOnce({
      content: JSON.stringify({ score: 72, reasoning: 'Decent.' }),
    });

    const result = await judgeOutput(baseParams);
    expect(result.passed).toBe(true); // score >= 70
  });

  it('infers failed from score when passed field is missing', async () => {
    mockProvider.complete.mockResolvedValueOnce({
      content: JSON.stringify({ score: 60, reasoning: 'Not quite.' }),
    });

    const result = await judgeOutput(baseParams);
    expect(result.passed).toBe(false); // score < 70
  });

  it('throws on invalid JSON response', async () => {
    mockProvider.complete.mockResolvedValueOnce({
      content: 'this is not json at all',
    });

    await expect(judgeOutput(baseParams)).rejects.toThrow(/invalid json/i);
  });

  it('calls provider with json_mode and low temperature', async () => {
    mockProvider.complete.mockResolvedValueOnce({
      content: JSON.stringify({ passed: true, score: 90, reasoning: 'Good.' }),
    });

    await judgeOutput(baseParams);

    expect(mockProvider.complete).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ role: 'system' }),
        expect.objectContaining({ role: 'user', content: expect.stringContaining(baseParams.behaviorName) }),
      ]),
      expect.objectContaining({ json_mode: true, temperature: 0.1 })
    );
  });
});
