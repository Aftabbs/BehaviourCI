import type { RuleConfig } from '../types/spec.js';

export function checkMustBeJson(text: string): { passed: boolean; failureReason?: string } {
  try {
    JSON.parse(text.trim());
    return { passed: true };
  } catch {
    return { passed: false, failureReason: 'Output is not valid JSON' };
  }
}

export function checkMustContain(text: string, config: RuleConfig = {}): { passed: boolean; failureReason?: string } {
  if (!config.pattern) return { passed: true };

  const haystack = config.caseSensitive ? text : text.toLowerCase();
  const needle = config.caseSensitive ? config.pattern : config.pattern.toLowerCase();

  // Try as regex first, fall back to substring match
  try {
    const flags = config.caseSensitive ? '' : 'i';
    const regex = new RegExp(config.pattern, flags);
    if (!regex.test(text)) {
      return { passed: false, failureReason: `Output does not contain required pattern: "${config.pattern}"` };
    }
    return { passed: true };
  } catch {
    // Not a valid regex — use substring match
    if (!haystack.includes(needle)) {
      return { passed: false, failureReason: `Output does not contain required text: "${config.pattern}"` };
    }
    return { passed: true };
  }
}

export function checkMustNotContain(text: string, config: RuleConfig = {}): { passed: boolean; failureReason?: string } {
  if (!config.pattern) return { passed: true };

  try {
    const flags = config.caseSensitive ? '' : 'i';
    const regex = new RegExp(config.pattern, flags);
    if (regex.test(text)) {
      return { passed: false, failureReason: `Output contains forbidden pattern: "${config.pattern}"` };
    }
    return { passed: true };
  } catch {
    const haystack = config.caseSensitive ? text : text.toLowerCase();
    const needle = config.caseSensitive ? config.pattern : config.pattern.toLowerCase();
    if (haystack.includes(needle)) {
      return { passed: false, failureReason: `Output contains forbidden text: "${config.pattern}"` };
    }
    return { passed: true };
  }
}
