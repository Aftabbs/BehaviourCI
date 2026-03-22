# BehaviorCI

Behavioral testing for AI features in CI/CD pipelines.

BehaviorCI lets engineering teams define how their AI feature should behave, then verifies it on every pull request. When a model upgrade, prompt change, or system instruction drift causes a regression, BehaviorCI catches it before it ships.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org)

---

## The Problem

Standard CI pipelines verify that code compiles, APIs return 200, and unit tests pass. None of that tells you whether your AI feature still behaves correctly. Model upgrades, prompt edits, and temperature changes silently alter AI output — and there is no test layer to catch it.

BehaviorCI fills that gap. You describe expected behavior in a YAML spec. BehaviorCI generates adversarial test cases, runs them against your AI feature, scores the output using an LLM judge and deterministic rule checks, and fails the build if behavior regresses below your threshold.

---

## How It Works

```
Developer writes .behaviourci.yml spec
        |
        v
BehaviorCI triggers on pull request
        |
        v
Groq generates adversarial test inputs for each behavior
        |
        v
Test inputs run against the AI feature (HTTP endpoint or direct prompt)
        |
        v
Each output is evaluated:
  - Rule behaviors: deterministic checks (PII, length, format, JSON)
  - Semantic behaviors: LLM-as-judge scoring (0-100)
        |
        v
Score >= threshold: PR passes
Score <  threshold: PR blocked, failure details posted as PR comment
        |
        v
All results stored in Supabase, visible in the React dashboard
```

---

## Sample Output

```
BehaviorCI — AI behavioral testing
──────────────────────────────────────────────────
Feature:   Support Ticket Summarizer
Behaviors: 6

  PASS  identifies urgency level    100.0%   3/3
  PASS  no PII in output            100.0%   3/3
  PASS  concise response            100.0%   3/3
  PASS  professional tone           100.0%   3/3
  PASS  states the core issue       100.0%   3/3
  FAIL  valid summary format         66.7%   2/3
        Input:  "The system is down."
        Output: "System is down. [CRITICAL]" — 8 words, minimum is 10

──────────────────────────────────────────────────
  Overall: 94.4%   17/18 passed   Threshold: 85%   PASSED
  Duration: 20.8s
```

---

## Setup

### Requirements

- Node.js 18+
- Groq API key — free at [console.groq.com](https://console.groq.com)

### Install

```bash
npm install -g behaviourci
```

### Create a spec file

```bash
behaviourci init
```

Edit the generated `.behaviourci.yml`:

```yaml
version: "1"
name: "Support Ticket Summarizer"

target:
  prompt:
    provider: "groq"
    model: "llama-3.3-70b-versatile"
    system: "You are a support ticket summarizer."
    template: "Summarize this ticket: {{input}}"

behaviors:
  - name: "identifies urgency level"
    type: semantic
    description: "Response must include an urgency indicator: LOW, MEDIUM, HIGH, or CRITICAL"

  - name: "no PII in output"
    type: rule
    rule: no-pii

  - name: "concise"
    type: rule
    rule: max-length
    config:
      words: 75

thresholds:
  pass: 85
  per_behavior:
    "no PII in output": 100
```

### Run

```bash
# Linux / macOS
export GROQ_API_KEY=your-key

# Windows CMD
set GROQ_API_KEY=your-key

behaviourci test
```

---

## GitHub Actions

Add to `.github/workflows/behaviourci.yml`:

```yaml
name: BehaviorCI

on:
  pull_request:
    branches: [main]

jobs:
  behavioral-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: behaviourci/behaviourci@v1
        with:
          spec-file: .behaviourci.yml
          groq-api-key: ${{ secrets.GROQ_API_KEY }}
          fail-on-regression: true
          threshold: 85
          supabase-url: ${{ secrets.SUPABASE_URL }}
          supabase-anon-key: ${{ secrets.SUPABASE_ANON_KEY }}
```

On every PR, BehaviorCI posts a behavioral test report as a comment and blocks the merge if the score drops below the threshold.

---

## Behavior Types

### Semantic

Evaluated by an LLM judge (Groq 70B). Describe the expected behavior in plain English.

```yaml
- name: "professional tone"
  type: semantic
  description: "Neutral and professional language — no emotional language or slang"
```

Score 0–100. Score >= 70 is a pass for that test case.

### Rule

Deterministic checks. No LLM required. Consistent across every run.

| Rule | Description |
|------|-------------|
| `no-pii` | Fails if output contains email, phone, SSN, credit card, or IP address |
| `max-length` | Fails if output exceeds word or character limit |
| `min-length` | Fails if output is below word or character minimum |
| `must-contain` | Fails if output does not match a required pattern or substring |
| `must-not-contain` | Fails if output matches a forbidden pattern |
| `must-be-json` | Fails if output is not valid JSON |

---

## Target Modes

**Prompt mode** — call a model directly with your system prompt:

```yaml
target:
  prompt:
    provider: "groq"          # groq | openai | anthropic | azure-openai
    model: "llama-3.3-70b-versatile"
    system: "You are a helpful assistant."
    template: "{{input}}"
```

**Endpoint mode** — call your deployed AI service over HTTP:

```yaml
target:
  endpoint:
    url: "$AI_SERVICE_URL"
    method: POST
    headers:
      Authorization: "Bearer $API_TOKEN"
      Content-Type: "application/json"
    body_template: '{"message": "{{input}}"}'
    response_path: "$.reply"
```

---

## Dashboard

Every test run is stored in Supabase and available in a React dashboard with trend charts, behavior breakdowns, and full test input/output history.

**Setup:**

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/migrations/001_init.sql` in the Supabase SQL editor
3. Copy your Project URL and API keys

```bash
cd dashboard
cp .env.example .env
# Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install && npm run dev
```

---

## Supported Providers

| Provider | Env var |
|----------|---------|
| Groq (recommended) | `GROQ_API_KEY` |
| OpenAI | `OPENAI_API_KEY` |
| Anthropic | `ANTHROPIC_API_KEY` |
| Azure OpenAI | `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT` |

BehaviorCI uses Groq for test generation and judging regardless of which provider your AI feature uses.

---

## CLI Reference

```bash
behaviourci test [spec-file]       Run behavioral tests
  --threshold <n>                  Override pass threshold (0-100)
  --output <path>                  JSON report output path
  --verbose                        Show full input/output per test case
  --no-save                        Skip Supabase persistence

behaviourci init                   Scaffold a .behaviourci.yml spec file
  --mode <endpoint|prompt>         Target mode

behaviourci validate [spec-file]   Validate spec syntax without running tests

behaviourci report [file]          Pretty-print a saved JSON report
```

---

## Environment Variables

```bash
# LLM providers
GROQ_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_DEPLOYMENT=
AZURE_OPENAI_API_VERSION=

# Supabase (optional — enables dashboard and result history)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
```

---

## Project Structure

```
src/
  action/       GitHub Action entry point
  cli/          CLI — test, init, validate, report commands
  evaluator/    Orchestrator — runs all behaviors for a spec
  generator/    Adversarial test case generation
  judge/        LLM-as-judge scoring
  providers/    Groq, OpenAI, Anthropic, Azure OpenAI
  reporter/     Console output, JSON report, GitHub PR comment
  rules/        Deterministic rule checks
  spec/         YAML spec parser with Zod validation
  storage/      Supabase persistence
  target/       HTTP endpoint and direct prompt callers
  types/        Shared TypeScript interfaces

dashboard/      React + Vite + Tailwind frontend
supabase/       Database schema and migrations
examples/       Example spec files
__tests__/      Unit tests (Vitest) — 54 tests
action.yml      GitHub Action manifest
```

---

## Roadmap

- Slack and email notifications on regression
- Model comparison mode — run the same spec against multiple models
- Baseline locking — alert when score drops from a pinned reference run
- GitLab CI and Bitbucket Pipelines support
- VS Code extension for inline spec authoring
- npm registry publish and GitHub Actions marketplace listing

---

## Contributing

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature`
3. Run tests: `npm test`
4. Open a pull request

---

## License

MIT
