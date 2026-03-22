import type { RuleConfig } from '../types/spec.js';

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function checkMaxLength(text: string, config: RuleConfig = {}): { passed: boolean; failureReason?: string } {
  const wordLimit = config.words;
  const charLimit = config.chars;

  if (wordLimit !== undefined) {
    const wordCount = countWords(text);
    if (wordCount > wordLimit) {
      return {
        passed: false,
        failureReason: `Output is ${wordCount} words, exceeds max-length of ${wordLimit} words`,
      };
    }
  }

  if (charLimit !== undefined && text.length > charLimit) {
    return {
      passed: false,
      failureReason: `Output is ${text.length} chars, exceeds max-length of ${charLimit} chars`,
    };
  }

  return { passed: true };
}

export function checkMinLength(text: string, config: RuleConfig = {}): { passed: boolean; failureReason?: string } {
  const minWords = config.words;
  const minChars = config.chars;

  if (minWords !== undefined) {
    const wordCount = countWords(text);
    if (wordCount < minWords) {
      return {
        passed: false,
        failureReason: `Output is ${wordCount} words, below min-length of ${minWords} words`,
      };
    }
  }

  if (minChars !== undefined && text.length < minChars) {
    return {
      passed: false,
      failureReason: `Output is ${text.length} chars, below min-length of ${minChars} chars`,
    };
  }

  return { passed: true };
}
