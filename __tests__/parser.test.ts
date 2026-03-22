import { describe, it, expect } from 'vitest';
import { parseSpecFromString } from '../src/spec/parser.js';

const VALID_PROMPT_SPEC = `
version: "1"
name: "My Feature"
description: "Tests for my AI feature"
target:
  prompt:
    provider: groq
    model: llama-3.3-70b-versatile
    system: "You are helpful."
    template: "Answer: {{input}}"
behaviors:
  - name: "helpful"
    type: semantic
    description: "Must provide a helpful answer"
  - name: "no-pii"
    type: rule
    rule: no-pii
test_generation:
  count: 5
thresholds:
  pass: 80
`;

const VALID_ENDPOINT_SPEC = `
version: "1"
name: "Endpoint Feature"
target:
  endpoint:
    url: "https://api.example.com/predict"
    method: POST
    body_template: '{"text": "{{input}}"}'
    response_path: "$.result"
behaviors:
  - name: "accurate"
    type: semantic
    description: "Must be accurate"
`;

describe('parseSpecFromString', () => {
  it('parses a valid prompt-mode spec', () => {
    const spec = parseSpecFromString(VALID_PROMPT_SPEC);
    expect(spec.name).toBe('My Feature');
    expect(spec.behaviors).toHaveLength(2);
    expect(spec.target.prompt?.provider).toBe('groq');
    expect(spec.test_generation?.count).toBe(5);
    expect(spec.thresholds?.pass).toBe(80);
  });

  it('parses a valid endpoint-mode spec', () => {
    const spec = parseSpecFromString(VALID_ENDPOINT_SPEC);
    expect(spec.name).toBe('Endpoint Feature');
    expect(spec.target.endpoint?.url).toBe('https://api.example.com/predict');
    expect(spec.target.endpoint?.method).toBe('POST');
  });

  it('applies defaults for test_generation count when block is present', () => {
    const specWithGenBlock = VALID_ENDPOINT_SPEC + '\ntest_generation:\n  count: 10\n';
    const spec = parseSpecFromString(specWithGenBlock);
    expect(spec.test_generation?.count).toBe(10);
  });

  it('applies default pass threshold when thresholds block is present', () => {
    const specWithThresholds = VALID_ENDPOINT_SPEC + '\nthresholds:\n  pass: 85\n';
    const spec = parseSpecFromString(specWithThresholds);
    expect(spec.thresholds?.pass).toBe(85);
  });

  it('thresholds and test_generation are undefined when not specified', () => {
    const spec = parseSpecFromString(VALID_ENDPOINT_SPEC);
    // Optional blocks are undefined when omitted — evaluator falls back to defaults
    expect(spec.thresholds).toBeUndefined();
    expect(spec.test_generation).toBeUndefined();
  });

  it('throws if name is missing', () => {
    const bad = VALID_PROMPT_SPEC.replace('name: "My Feature"', '');
    expect(() => parseSpecFromString(bad)).toThrow(/name/i);
  });

  it('throws if behaviors array is empty', () => {
    const bad = VALID_PROMPT_SPEC.replace(
      /behaviors:[\s\S]+test_generation/,
      'behaviors: []\ntest_generation'
    );
    expect(() => parseSpecFromString(bad)).toThrow(/behavior/i);
  });

  it('throws if rule behavior has no rule field', () => {
    const bad = `
version: "1"
name: "Test"
target:
  prompt:
    provider: groq
    model: llama-3.3-70b-versatile
    template: "{{input}}"
behaviors:
  - name: "missing rule"
    type: rule
`;
    expect(() => parseSpecFromString(bad)).toThrow(/rule/i);
  });

  it('throws if semantic behavior has no description', () => {
    const bad = `
version: "1"
name: "Test"
target:
  prompt:
    provider: groq
    model: llama-3.3-70b-versatile
    template: "{{input}}"
behaviors:
  - name: "no description"
    type: semantic
`;
    expect(() => parseSpecFromString(bad)).toThrow(/description/i);
  });

  it('throws if target has neither endpoint nor prompt', () => {
    const bad = `
version: "1"
name: "Test"
target: {}
behaviors:
  - name: "test"
    type: semantic
    description: "test"
`;
    expect(() => parseSpecFromString(bad)).toThrow(/endpoint.*prompt|prompt.*endpoint/i);
  });

  it('parses per-behavior thresholds', () => {
    const spec = parseSpecFromString(`
version: "1"
name: "Test"
target:
  prompt:
    provider: groq
    model: llama-3.3-70b-versatile
    template: "{{input}}"
behaviors:
  - name: "no-pii"
    type: rule
    rule: no-pii
thresholds:
  pass: 85
  per_behavior:
    "no-pii": 100
`);
    expect(spec.thresholds?.per_behavior?.['no-pii']).toBe(100);
  });
});
