import { writeFileSync } from 'fs';
import type { RunReport } from '../types/spec.js';

export const DEFAULT_REPORT_PATH = 'behaviourci-report.json';

/** Write the run report to a JSON file */
export function writeJsonReport(report: RunReport, outputPath = DEFAULT_REPORT_PATH): void {
  writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
}
