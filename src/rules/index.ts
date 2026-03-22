import { checkNoPii } from './pii.js';
import { checkMaxLength, checkMinLength } from './length.js';
import { checkMustBeJson, checkMustContain, checkMustNotContain } from './format.js';
import type { Behavior, RuleCheckResult } from '../types/spec.js';

/**
 * Run the appropriate deterministic rule check for a behavior.
 * Returns a RuleCheckResult with passed status and optional failure reason.
 */
export function runRule(behavior: Behavior, output: string): RuleCheckResult {
  if (!behavior.rule) {
    return { rule: 'no-pii', passed: true }; // no rule to run
  }

  const config = behavior.config ?? {};

  switch (behavior.rule) {
    case 'no-pii': {
      const result = checkNoPii(output);
      return { rule: 'no-pii', passed: result.passed, failureReason: result.failureReason };
    }

    case 'max-length': {
      const result = checkMaxLength(output, config);
      return { rule: 'max-length', passed: result.passed, failureReason: result.failureReason };
    }

    case 'min-length': {
      const result = checkMinLength(output, config);
      return { rule: 'min-length', passed: result.passed, failureReason: result.failureReason };
    }

    case 'must-be-json': {
      const result = checkMustBeJson(output);
      return { rule: 'must-be-json', passed: result.passed, failureReason: result.failureReason };
    }

    case 'must-contain': {
      const result = checkMustContain(output, config);
      return { rule: 'must-contain', passed: result.passed, failureReason: result.failureReason };
    }

    case 'must-not-contain': {
      const result = checkMustNotContain(output, config);
      return { rule: 'must-not-contain', passed: result.passed, failureReason: result.failureReason };
    }

    default: {
      const exhaustive: never = behavior.rule;
      throw new Error(`Unknown rule: ${exhaustive}`);
    }
  }
}
