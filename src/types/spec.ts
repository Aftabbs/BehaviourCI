// ─── Core domain types for BehaviorCI ────────────────────────────────────────

export type BehaviorType = 'semantic' | 'rule';

export type RuleName =
  | 'no-pii'
  | 'max-length'
  | 'min-length'
  | 'must-contain'
  | 'must-not-contain'
  | 'must-be-json';

export interface RuleConfig {
  words?: number;
  chars?: number;
  pattern?: string;
  caseSensitive?: boolean;
}

export interface Behavior {
  name: string;
  type: BehaviorType;
  description?: string;
  rule?: RuleName;
  config?: RuleConfig;
}

export interface EndpointTarget {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  /** Body template — use {{input}} as placeholder */
  body_template?: string;
  /** JSONPath to extract response text, e.g. "$.result" */
  response_path?: string;
  timeout_ms?: number;
}

export interface PromptTarget {
  provider: 'groq' | 'openai' | 'anthropic' | 'azure-openai';
  model: string;
  system?: string;
  /** Prompt template — use {{input}} as placeholder */
  template: string;
  temperature?: number;
  max_tokens?: number;
}

export interface Target {
  endpoint?: EndpointTarget;
  prompt?: PromptTarget;
}

export interface TestGeneration {
  /** Number of adversarial test cases to generate per behavior */
  count?: number;
  /** Optional seed inputs to base generation on */
  seed_inputs?: string[];
}

export interface PerBehaviorThreshold {
  [behaviorName: string]: number;
}

export interface Thresholds {
  /** Overall minimum pass % to allow PR merge (0-100) */
  pass?: number;
  per_behavior?: PerBehaviorThreshold;
}

/** The parsed and validated .behaviourci.yml spec */
export interface BehaviorSpec {
  version: string;
  name: string;
  description?: string;
  target: Target;
  behaviors: Behavior[];
  test_generation?: TestGeneration;
  thresholds?: Thresholds;
}

// ─── Runtime types (generated during a test run) ────────────────────────────

export interface GeneratedTestCase {
  id: string;
  behaviorName: string;
  input: string;
  expectedDescription: string;
}

export interface RuleCheckResult {
  rule: RuleName;
  passed: boolean;
  failureReason?: string;
}

export interface JudgeResult {
  passed: boolean;
  score: number;        // 0-100
  reasoning: string;
}

export interface TestResult {
  id: string;
  behaviorName: string;
  behaviorType: BehaviorType;
  input: string;
  actualOutput: string;
  passed: boolean;
  score: number;        // 0-100
  checkType: 'rule' | 'semantic';
  failureReason?: string;
  judgeReasoning?: string;
  durationMs: number;
}

export interface BehaviorSummary {
  name: string;
  totalTests: number;
  passedTests: number;
  passRate: number;     // 0-100
  passed: boolean;      // met per_behavior threshold
  results: TestResult[];
}

/** The final aggregated report for a full run */
export interface RunReport {
  id: string;
  specName: string;
  featureName: string;
  startedAt: string;    // ISO string
  durationMs: number;
  overallScore: number; // 0-100
  passed: boolean;
  totalTests: number;
  passedTests: number;
  threshold: number;
  behaviors: BehaviorSummary[];
  // GitHub context (populated in Action mode)
  commitSha?: string;
  branch?: string;
  prNumber?: number;
  repo?: string;
}
