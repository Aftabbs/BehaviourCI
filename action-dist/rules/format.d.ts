import type { RuleConfig } from '../types/spec.js';
export declare function checkMustBeJson(text: string): {
    passed: boolean;
    failureReason?: string;
};
export declare function checkMustContain(text: string, config?: RuleConfig): {
    passed: boolean;
    failureReason?: string;
};
export declare function checkMustNotContain(text: string, config?: RuleConfig): {
    passed: boolean;
    failureReason?: string;
};
//# sourceMappingURL=format.d.ts.map