export interface PiiCheckResult {
    passed: boolean;
    detected: string[];
    failureReason?: string;
}
/**
 * Check if a text output contains PII patterns.
 * Returns passed=true if NO PII is detected.
 */
export declare function checkNoPii(text: string): PiiCheckResult;
//# sourceMappingURL=pii.d.ts.map