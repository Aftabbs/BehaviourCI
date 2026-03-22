#!/usr/bin/env node

// Load .env file from the directory where the CLI is run (the user's project root)
import { config as loadDotenv } from 'dotenv';
loadDotenv({ path: resolve(process.cwd(), '.env') });

import { Command } from 'commander';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { parseSpec } from '../spec/parser.js';
import { evaluate } from '../evaluator/index.js';
import { printReport, printProgress, writeJsonReport, DEFAULT_REPORT_PATH } from '../reporter/index.js';
import { saveReport } from '../storage/supabase.js';

const program = new Command();

program
  .name('behaviourci')
  .description('AI behavioral testing for CI/CD pipelines')
  .version('1.0.0');

// ── behaviourci test ──────────────────────────────────────────────────────────

program
  .command('test [spec-file]')
  .description('Run behavioral tests against your AI feature')
  .option('-t, --threshold <number>', 'Override pass threshold (0-100)')
  .option('-o, --output <path>', 'JSON report output path', DEFAULT_REPORT_PATH)
  .option('-v, --verbose', 'Show full test input/output for each case')
  .option('--no-save', 'Skip saving results to Supabase')
  .action(async (specFile: string | undefined, options: {
    threshold?: string;
    output: string;
    verbose: boolean;
    save: boolean;
  }) => {
    const specPath = resolve(specFile ?? '.behaviourci.yml');

    if (!existsSync(specPath)) {
      console.error(chalk.red(`✖ Spec file not found: ${specPath}`));
      console.error(chalk.dim(`  Run ${chalk.cyan('behaviourci init')} to scaffold a spec file.`));
      process.exit(1);
    }

    // Validate API key
    if (!process.env.GROQ_API_KEY && !process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
      console.error(chalk.red('✖ No LLM API key found.'));
      console.error(chalk.dim('  Set GROQ_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY in your environment.'));
      process.exit(1);
    }

    let spec;
    try {
      spec = await parseSpec(specPath);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`✖ Failed to parse spec: ${msg}`));
      process.exit(1);
    }

    console.log();
    console.log(chalk.bold.blue('BehaviorCI') + chalk.dim(' — AI behavioral testing'));
    console.log(chalk.dim('─'.repeat(50)));
    console.log(`${chalk.bold('Feature:')} ${spec.name}`);
    console.log(`${chalk.bold('Behaviors:')} ${spec.behaviors.length}`);
    if (spec.description) console.log(`${chalk.bold('Description:')} ${spec.description}`);
    console.log();

    const spinner = ora('Generating adversarial test cases...').start();
    let lastBehavior = '';

    try {
      const threshold = options.threshold ? parseFloat(options.threshold) : undefined;

      const report = await evaluate(spec, {
        threshold,
        onProgress: (done, total, behaviorName) => {
          if (behaviorName !== lastBehavior && behaviorName) {
            lastBehavior = behaviorName;
            spinner.text = `Testing: ${chalk.cyan(behaviorName)} (${done}/${total})`;
          } else {
            spinner.text = `Running tests... ${done}/${total}`;
          }
          printProgress(done, total, behaviorName);
        },
      });

      spinner.stop();

      // Write JSON report
      writeJsonReport(report, options.output);

      // Print console report
      printReport(report, options.verbose);

      // Save to Supabase (optional)
      if (options.save) {
        const runId = await saveReport(report);
        if (runId) {
          console.log(chalk.dim(`\n  Results saved to Supabase (run ${runId.slice(0, 8)}...)`));
        }
      }

      console.log(chalk.dim(`\n  Report written to ${options.output}`));
      console.log();

      // Exit with code 1 if failed
      if (!report.passed) {
        process.exit(1);
      }
    } catch (err) {
      spinner.stop();
      const msg = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`\n✖ Evaluation failed: ${msg}`));
      if (process.env.DEBUG) console.error(err);
      process.exit(1);
    }
  });

// ── behaviourci init ──────────────────────────────────────────────────────────

program
  .command('init')
  .description('Scaffold a .behaviourci.yml spec file interactively')
  .option('-f, --file <path>', 'Output path for the spec file', '.behaviourci.yml')
  .option('--mode <mode>', 'Target mode: endpoint or prompt', 'prompt')
  .action(async (options: { file: string; mode: string }) => {
    const outPath = resolve(options.file);

    if (existsSync(outPath)) {
      console.error(chalk.yellow(`⚠ ${outPath} already exists. Delete it first or use --file to specify a different path.`));
      process.exit(1);
    }

    const mode = options.mode === 'endpoint' ? 'endpoint' : 'prompt';

    const endpointExample = `target:
  endpoint:
    url: "\$AI_ENDPOINT_URL"
    method: POST
    headers:
      Authorization: "Bearer \$API_TOKEN"
      Content-Type: "application/json"
    body_template: '{"text": "{{input}}"}'
    response_path: "$.output"`;

    const promptExample = `target:
  prompt:
    provider: "groq"
    model: "llama-3.3-70b-versatile"
    system: "You are a helpful AI assistant."
    template: "{{input}}"`;

    const targetBlock = mode === 'endpoint' ? endpointExample : promptExample;

    const spec = `version: "1"
name: "My AI Feature"
description: "Describe what your AI feature does"

${targetBlock}

behaviors:
  - name: "helpful and accurate"
    type: semantic
    description: "Responses must directly address the user's question with accurate, helpful information"

  - name: "no PII in output"
    type: rule
    rule: no-pii

  - name: "concise responses"
    type: rule
    rule: max-length
    config:
      words: 150

  - name: "professional tone"
    type: semantic
    description: "Responses must use professional, neutral language without emotional outbursts or slang"

test_generation:
  count: 10

thresholds:
  pass: 85
  per_behavior:
    "no PII in output": 100
`;

    try {
      const { writeFileSync } = await import('fs');
      writeFileSync(outPath, spec, 'utf-8');
      console.log();
      console.log(chalk.green('✔ Created ' + outPath));
      console.log();
      console.log(chalk.bold('Next steps:'));
      console.log(`  1. Edit ${chalk.cyan(outPath)} to describe your AI feature's behaviors`);
      console.log(`  2. Set ${chalk.cyan('GROQ_API_KEY')} in your environment`);
      if (mode === 'endpoint') {
        console.log(`  3. Set ${chalk.cyan('AI_ENDPOINT_URL')} and ${chalk.cyan('API_TOKEN')} in your environment`);
      }
      console.log(`  4. Run ${chalk.cyan('behaviourci test')} to validate`);
      console.log();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`✖ Could not write file: ${msg}`));
      process.exit(1);
    }
  });

// ── behaviourci report ────────────────────────────────────────────────────────

program
  .command('report [report-file]')
  .description('Pretty-print the last JSON run report')
  .option('-v, --verbose', 'Show full test input/output details')
  .action((reportFile: string | undefined, options: { verbose: boolean }) => {
    const reportPath = resolve(reportFile ?? DEFAULT_REPORT_PATH);

    if (!existsSync(reportPath)) {
      console.error(chalk.red(`✖ Report not found: ${reportPath}`));
      console.error(chalk.dim('  Run behaviourci test to generate a report first.'));
      process.exit(1);
    }

    try {
      const raw = readFileSync(reportPath, 'utf-8');
      const report = JSON.parse(raw);

      console.log();
      console.log(chalk.dim(`Report: ${reportPath}`));
      printReport(report, options.verbose);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`✖ Failed to read report: ${msg}`));
      process.exit(1);
    }
  });

// ── behaviourci validate ──────────────────────────────────────────────────────

program
  .command('validate [spec-file]')
  .description('Validate a spec file without running tests')
  .action(async (specFile: string | undefined) => {
    const specPath = resolve(specFile ?? '.behaviourci.yml');

    if (!existsSync(specPath)) {
      console.error(chalk.red(`✖ Spec file not found: ${specPath}`));
      process.exit(1);
    }

    try {
      const spec = await parseSpec(specPath);
      console.log();
      console.log(chalk.green('✔ Spec is valid'));
      console.log();
      console.log(`  ${chalk.bold('Name:')} ${spec.name}`);
      console.log(`  ${chalk.bold('Version:')} ${spec.version}`);
      console.log(`  ${chalk.bold('Behaviors:')} ${spec.behaviors.length}`);
      console.log(`  ${chalk.bold('Test count:')} ${spec.test_generation?.count ?? 10} per behavior`);
      console.log(`  ${chalk.bold('Pass threshold:')} ${spec.thresholds?.pass ?? 85}%`);

      const target = spec.target.endpoint ? 'endpoint' : 'prompt';
      console.log(`  ${chalk.bold('Target mode:')} ${target}`);

      if (spec.target.endpoint) {
        console.log(`  ${chalk.bold('Endpoint URL:')} ${spec.target.endpoint.url}`);
      } else if (spec.target.prompt) {
        console.log(`  ${chalk.bold('Provider:')} ${spec.target.prompt.provider ?? 'auto'}`);
        console.log(`  ${chalk.bold('Model:')} ${spec.target.prompt.model ?? 'default'}`);
      }

      console.log();
      spec.behaviors.forEach((b) => {
        const icon = b.type === 'rule' ? '⚡' : '🧠';
        console.log(`  ${icon} ${chalk.cyan(b.name)} ${chalk.dim(`(${b.type}${b.rule ? ': ' + b.rule : ''})`)}`);
      });
      console.log();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`✖ Invalid spec: ${msg}`));
      process.exit(1);
    }
  });

program.parse();
