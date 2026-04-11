import type { BehaviorSpec } from '../types/spec.js';
/**
 * Parse and validate a .behaviourci.yml file.
 * Throws a descriptive error if the spec is invalid.
 */
export declare function parseSpec(filePath: string): BehaviorSpec;
/**
 * Parse a spec from a raw YAML string (useful for testing).
 */
export declare function parseSpecFromString(yamlContent: string, sourceName?: string): BehaviorSpec;
//# sourceMappingURL=parser.d.ts.map