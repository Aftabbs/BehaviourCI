import * as core from '@actions/core';
import * as github from '@actions/github';
import { parseSpec } from '../spec/parser.js';
import { evaluate } from '../evaluator/index.js';
import { printReport, printProgress } from '../reporter/index.js';
import { writeJsonReport, DEFAULT_REPORT_PATH } from '../reporter/index.js';
import { buildGithubComment } from '../reporter/index.js';
import { saveReport } from '../storage/supabase.js';

async function run(): Promise<void> {
  try {
    // ── Read inputs ──────────────────────────────────────────────────────────
    const specFile = core.getInput('spec-file') || '.behaviourci.yml';
    const groqApiKey = core.getInput('groq-api-key', { required: true });
    const supabaseUrl = core.getInput('supabase-url');
    const supabaseAnonKey = core.getInput('supabase-anon-key');
    const supabaseServiceKey = core.getInput('supabase-service-key');
    const failOnRegression = core.getInput('fail-on-regression') !== 'false';
    const thresholdInput = core.getInput('threshold');
    const openaiApiKey = core.getInput('openai-api-key');
    const anthropicApiKey = core.getInput('anthropic-api-key');

    // ── Propagate API keys as env vars (providers read from process.env) ─────
    if (groqApiKey) process.env.GROQ_API_KEY = groqApiKey;
    if (openaiApiKey) process.env.OPENAI_API_KEY = openaiApiKey;
    if (anthropicApiKey) process.env.ANTHROPIC_API_KEY = anthropicApiKey;
    if (supabaseUrl) process.env.SUPABASE_URL = supabaseUrl;
    if (supabaseAnonKey) process.env.SUPABASE_ANON_KEY = supabaseAnonKey;
    if (supabaseServiceKey) process.env.SUPABASE_SERVICE_KEY = supabaseServiceKey;

    // ── Parse spec ───────────────────────────────────────────────────────────
    core.info(`[BehaviorCI] Loading spec: ${specFile}`);
    const spec = await parseSpec(specFile);
    core.info(`[BehaviorCI] Spec: "${spec.name}" — ${spec.behaviors.length} behaviors`);

    // ── GitHub context ───────────────────────────────────────────────────────
    const ctx = github.context;
    const githubContext = {
      commitSha: ctx.sha || undefined,
      branch: ctx.ref?.replace('refs/heads/', '') || undefined,
      prNumber: ctx.payload.pull_request?.number || undefined,
      repo: ctx.payload.repository?.full_name || undefined,
    };

    // ── Run evaluation ───────────────────────────────────────────────────────
    core.info('[BehaviorCI] Starting behavioral evaluation...');

    const threshold = thresholdInput ? parseFloat(thresholdInput) : undefined;

    const report = await evaluate(spec, {
      threshold,
      github: githubContext,
      onProgress: (done, total, behaviorName) => {
        if (behaviorName) {
          core.info(`[BehaviorCI] Progress: ${done}/${total} — ${behaviorName}`);
        }
      },
    });

    // ── Console report ───────────────────────────────────────────────────────
    printReport(report, false);

    // ── JSON artifact ────────────────────────────────────────────────────────
    writeJsonReport(report, DEFAULT_REPORT_PATH);
    core.info(`[BehaviorCI] Report written to ${DEFAULT_REPORT_PATH}`);

    // ── Set outputs ──────────────────────────────────────────────────────────
    core.setOutput('score', report.overallScore.toString());
    core.setOutput('passed', report.passed.toString());
    core.setOutput('report-path', DEFAULT_REPORT_PATH);

    // ── Post GitHub PR comment ───────────────────────────────────────────────
    await postPrComment(report);

    // ── Persist to Supabase ──────────────────────────────────────────────────
    const runId = await saveReport(report);
    if (runId) {
      core.info(`[BehaviorCI] Results saved to Supabase (run ID: ${runId})`);
    }

    // ── Fail action if below threshold ───────────────────────────────────────
    if (failOnRegression && !report.passed) {
      core.setFailed(
        `[BehaviorCI] Behavioral regression detected — score ${report.overallScore.toFixed(1)}% is below threshold ${report.threshold}%`
      );
    } else if (report.passed) {
      core.info(
        `[BehaviorCI] ✅ All behaviors passed — score ${report.overallScore.toFixed(1)}% (threshold: ${report.threshold}%)`
      );
    } else {
      // failOnRegression=false but still failed threshold — warn only
      core.warning(
        `[BehaviorCI] Score ${report.overallScore.toFixed(1)}% is below threshold ${report.threshold}% (fail-on-regression=false, continuing)`
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    core.setFailed(`[BehaviorCI] Fatal error: ${msg}`);
  }
}

/** Post (or update) a PR comment with the behavioral test results */
async function postPrComment(report: import('../types/spec.js').RunReport): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    core.info('[BehaviorCI] GITHUB_TOKEN not set — skipping PR comment');
    return;
  }

  const ctx = github.context;
  const prNumber = ctx.payload.pull_request?.number;
  if (!prNumber) {
    core.info('[BehaviorCI] Not a pull request context — skipping PR comment');
    return;
  }

  try {
    const octokit = github.getOctokit(token);
    const { owner, repo } = ctx.repo;
    const commentBody = buildGithubComment(report);
    const MARKER = '<!-- behaviourci-report -->';
    const body = `${MARKER}\n${commentBody}`;

    // Look for an existing BehaviorCI comment to update
    const { data: comments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber,
      per_page: 100,
    });

    const existing = comments.find((c) => c.body?.includes(MARKER));

    if (existing) {
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existing.id,
        body,
      });
      core.info('[BehaviorCI] Updated existing PR comment');
    } else {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body,
      });
      core.info('[BehaviorCI] Posted PR comment');
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    core.warning(`[BehaviorCI] Could not post PR comment: ${msg}`);
  }
}

run();
