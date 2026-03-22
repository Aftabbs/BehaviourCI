import { describe, it, expect } from 'vitest';
import { checkNoPii } from '../src/rules/pii.js';
import { checkMaxLength, checkMinLength } from '../src/rules/length.js';
import { checkMustBeJson, checkMustContain, checkMustNotContain } from '../src/rules/format.js';
import { runRule } from '../src/rules/index.js';
import type { Behavior } from '../src/types/spec.js';

// ── PII detection ─────────────────────────────────────────────────────────────

describe('checkNoPii', () => {
  it('passes clean text', () => {
    expect(checkNoPii('The issue is a login timeout on the dashboard.').passed).toBe(true);
  });

  it('detects email addresses', () => {
    const result = checkNoPii('Contact john.doe@example.com for details.');
    expect(result.passed).toBe(false);
    expect(result.failureReason).toMatch(/email/i);
  });

  it('detects US phone numbers', () => {
    const result = checkNoPii('Call us at (555) 123-4567 anytime.');
    expect(result.passed).toBe(false);
    expect(result.failureReason).toMatch(/phone/i);
  });

  it('detects SSN patterns', () => {
    const result = checkNoPii('My SSN is 123-45-6789.');
    expect(result.passed).toBe(false);
    expect(result.failureReason).toMatch(/ssn/i);
  });

  it('detects credit card numbers', () => {
    const result = checkNoPii('Card number: 4111 1111 1111 1111');
    expect(result.passed).toBe(false);
    expect(result.failureReason).toMatch(/credit card/i);
  });

  it('passes text with numbers that are not PII', () => {
    expect(checkNoPii('Error code: 50030 occurred 12 times.').passed).toBe(true);
  });
});

// ── Length checks ─────────────────────────────────────────────────────────────

describe('checkMaxLength', () => {
  it('passes text within word limit', () => {
    expect(checkMaxLength('one two three', { words: 5 }).passed).toBe(true);
  });

  it('fails text exceeding word limit', () => {
    const result = checkMaxLength('one two three four five six', { words: 5 });
    expect(result.passed).toBe(false);
    expect(result.failureReason).toMatch(/6.*word|word.*6/i);
  });

  it('passes text within char limit', () => {
    expect(checkMaxLength('hello', { chars: 10 }).passed).toBe(true);
  });

  it('fails text exceeding char limit', () => {
    const result = checkMaxLength('hello world', { chars: 5 });
    expect(result.passed).toBe(false);
    expect(result.failureReason).toMatch(/char/i);
  });

  it('passes if no config provided', () => {
    expect(checkMaxLength('any text here', {}).passed).toBe(true);
  });
});

describe('checkMinLength', () => {
  it('passes text above minimum', () => {
    expect(checkMinLength('one two three four five', { words: 3 }).passed).toBe(true);
  });

  it('fails text below minimum', () => {
    const result = checkMinLength('hi', { words: 5 });
    expect(result.passed).toBe(false);
    expect(result.failureReason).toMatch(/word/i);
  });
});

// ── Format checks ─────────────────────────────────────────────────────────────

describe('checkMustBeJson', () => {
  it('passes valid JSON objects', () => {
    expect(checkMustBeJson('{"key": "value"}').passed).toBe(true);
  });

  it('passes valid JSON arrays', () => {
    expect(checkMustBeJson('[1, 2, 3]').passed).toBe(true);
  });

  it('fails invalid JSON', () => {
    const result = checkMustBeJson('not json at all');
    expect(result.passed).toBe(false);
    expect(result.failureReason).toMatch(/json/i);
  });

  it('fails JSON with trailing text', () => {
    const result = checkMustBeJson('{"key": "value"} extra text');
    expect(result.passed).toBe(false);
  });
});

describe('checkMustContain', () => {
  it('passes when pattern is found', () => {
    expect(checkMustContain('The urgency is HIGH', { pattern: 'HIGH' }).passed).toBe(true);
  });

  it('fails when pattern is not found', () => {
    const result = checkMustContain('The urgency is LOW', { pattern: 'HIGH' });
    expect(result.passed).toBe(false);
  });

  it('supports regex patterns', () => {
    expect(checkMustContain('[HIGH] urgent issue', { pattern: '\\[(HIGH|CRITICAL)\\]' }).passed).toBe(true);
  });

  it('is case-insensitive by default', () => {
    expect(checkMustContain('The urgency is high', { pattern: 'HIGH' }).passed).toBe(true);
  });

  it('respects caseSensitive flag', () => {
    expect(checkMustContain('The urgency is high', { pattern: 'HIGH', caseSensitive: true }).passed).toBe(false);
  });
});

describe('checkMustNotContain', () => {
  it('passes when forbidden pattern is absent', () => {
    expect(checkMustNotContain('Normal response text', { pattern: 'sorry' }).passed).toBe(true);
  });

  it('fails when forbidden pattern is present', () => {
    const result = checkMustNotContain('I am sorry but I cannot help', { pattern: 'sorry' });
    expect(result.passed).toBe(false);
  });
});

// ── runRule dispatcher ────────────────────────────────────────────────────────

describe('runRule', () => {
  it('dispatches no-pii rule', () => {
    const behavior: Behavior = { name: 'no PII', type: 'rule', rule: 'no-pii' };
    expect(runRule(behavior, 'clean output').passed).toBe(true);
    expect(runRule(behavior, 'email: test@test.com').passed).toBe(false);
  });

  it('dispatches max-length rule', () => {
    const behavior: Behavior = {
      name: 'concise',
      type: 'rule',
      rule: 'max-length',
      config: { words: 3 },
    };
    expect(runRule(behavior, 'one two three').passed).toBe(true);
    expect(runRule(behavior, 'one two three four five').passed).toBe(false);
  });

  it('dispatches must-be-json rule', () => {
    const behavior: Behavior = { name: 'json output', type: 'rule', rule: 'must-be-json' };
    expect(runRule(behavior, '{"ok": true}').passed).toBe(true);
    expect(runRule(behavior, 'not json').passed).toBe(false);
  });

  it('returns passed=true when no rule is defined', () => {
    const behavior: Behavior = { name: 'no rule', type: 'rule' };
    expect(runRule(behavior, 'any output').passed).toBe(true);
  });
});
