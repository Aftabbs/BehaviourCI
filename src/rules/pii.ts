// ─── PII detection rule ───────────────────────────────────────────────────────

const PII_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: 'email address', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ },
  { name: 'US phone number', pattern: /\b(\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/ },
  { name: 'SSN', pattern: /\b\d{3}-\d{2}-\d{4}\b/ },
  { name: 'credit card number', pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/ },
  { name: 'IP address', pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/ },
  {
    name: 'date of birth pattern',
    pattern: /\b(?:DOB|date of birth|born on|birthday)[:\s]+\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/i,
  },
  {
    name: 'passport number',
    pattern: /\b[A-Z]{1,2}\d{6,9}\b/,
  },
  {
    name: 'bank account number',
    pattern: /\b(?:account|acct)[\s#:]*\d{8,17}\b/i,
  },
];

export interface PiiCheckResult {
  passed: boolean;
  detected: string[];
  failureReason?: string;
}

/**
 * Check if a text output contains PII patterns.
 * Returns passed=true if NO PII is detected.
 */
export function checkNoPii(text: string): PiiCheckResult {
  const detected: string[] = [];

  for (const { name, pattern } of PII_PATTERNS) {
    if (pattern.test(text)) {
      detected.push(name);
    }
  }

  if (detected.length === 0) {
    return { passed: true, detected: [] };
  }

  return {
    passed: false,
    detected,
    failureReason: `Output contains potential PII: ${detected.join(', ')}`,
  };
}
