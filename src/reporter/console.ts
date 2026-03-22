import chalk from 'chalk';
import type { RunReport, BehaviorSummary, TestResult } from '../types/spec.js';

const PASS = chalk.green('✓');
const FAIL = chalk.red('✗');
const WARN = chalk.yellow('⚠');

function scoreColor(score: number): string {
  if (score >= 85) return chalk.green(score.toFixed(1) + '%');
  if (score >= 70) return chalk.yellow(score.toFixed(1) + '%');
  return chalk.red(score.toFixed(1) + '%');
}

function bar(score: number, width = 20): string {
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;
  const filledStr = '█'.repeat(filled);
  const emptyStr = '░'.repeat(empty);
  if (score >= 85) return chalk.green(filledStr) + chalk.gray(emptyStr);
  if (score >= 70) return chalk.yellow(filledStr) + chalk.gray(emptyStr);
  return chalk.red(filledStr) + chalk.gray(emptyStr);
}

function printBehavior(b: BehaviorSummary, verbose = false): void {
  const icon = b.passed ? PASS : FAIL;
  const rate = scoreColor(b.passRate);
  console.log(`  ${icon} ${chalk.bold(b.name)}  ${bar(b.passRate)}  ${rate}  (${b.passedTests}/${b.totalTests})`);

  if (!b.passed || verbose) {
    const failures = b.results.filter((r) => !r.passed);
    for (const f of failures.slice(0, 3)) {
      console.log(chalk.gray(`     Input:  `) + chalk.white(truncate(f.input, 80)));
      console.log(chalk.gray(`     Output: `) + chalk.white(truncate(f.actualOutput, 80)));
      if (f.failureReason) {
        console.log(chalk.gray(`     Reason: `) + chalk.red(f.failureReason));
      }
    }
    if (failures.length > 3) {
      console.log(chalk.gray(`     ... and ${failures.length - 3} more failures`));
    }
  }
}

function truncate(str: string, max: number): string {
  const single = str.replace(/\n/g, ' ');
  return single.length > max ? single.slice(0, max - 1) + '…' : single;
}

/** Print the full run report to the console */
export function printReport(report: RunReport, verbose = false): void {
  console.log();
  console.log(chalk.bold.blue('━━━  BehaviorCI Results  ━━━'));
  console.log(chalk.gray(`Feature:   ${report.specName}`));
  if (report.branch) console.log(chalk.gray(`Branch:    ${report.branch}`));
  if (report.commitSha) console.log(chalk.gray(`Commit:    ${report.commitSha.slice(0, 8)}`));
  console.log(chalk.gray(`Duration:  ${(report.durationMs / 1000).toFixed(1)}s`));
  console.log();

  for (const behavior of report.behaviors) {
    printBehavior(behavior, verbose);
  }

  console.log();
  console.log(chalk.gray('─'.repeat(56)));

  const overallIcon = report.passed ? PASS : FAIL;
  const overallRate = scoreColor(report.overallScore);
  console.log(
    `  ${overallIcon} ${chalk.bold('Overall')}  ${bar(report.overallScore)}  ${overallRate}  ` +
    `(${report.passedTests}/${report.totalTests})`
  );
  console.log(chalk.gray(`  Threshold: ${report.threshold}%`));
  console.log();

  if (report.passed) {
    console.log(chalk.green.bold('  ✓ PASSED — all behaviors meet the threshold'));
  } else {
    console.log(chalk.red.bold('  ✗ FAILED — one or more behaviors are below threshold'));
    const failedBehaviors = report.behaviors.filter((b) => !b.passed);
    for (const b of failedBehaviors) {
      console.log(chalk.red(`    • "${b.name}" scored ${b.passRate.toFixed(1)}% (threshold: ${report.threshold}%)`));
    }
  }
  console.log();
}

/** Print a compact progress line (overwrites in terminal) */
export function printProgress(done: number, total: number, behaviorName: string): void {
  if (!process.stdout.isTTY) return;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  process.stdout.write(`\r${chalk.gray(`  Running tests... ${done}/${total} (${pct}%)`)}  `);
  if (done === total) process.stdout.write('\n');
}
