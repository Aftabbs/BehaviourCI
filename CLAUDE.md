# BehaviorCI

## What This Is
BehaviorCI is an AI behavioral testing layer for CI/CD pipelines. It lets engineering teams define their AI feature's expected behavior in plain English, then automatically generates test cases, runs them on every PR, and blocks deploys when AI behavior regresses — with zero eval infrastructure setup required.

**Tagline:** "GitHub Actions + Jest, but for AI behavior."

## The Problem We Solve
When teams ship AI-powered features, they can verify code compiles and APIs respond — but they cannot reliably verify the AI behaves correctly. Model upgrades (GPT-4 → GPT-4o → o3) silently break products. Prompt changes cause regressions nobody catches. There are no standardized behavioral tests for AI features.

## Architecture
```
Developer writes YAML behavior spec
    ↓
BehaviorCI GitHub Action triggers on PR
    ↓
Auto-generates adversarial test cases (using LLM-as-generator)
    ↓
Runs tests against AI endpoint (multi-model: OpenAI, Anthropic, Gemini)
    ↓
LLM-as-judge scoring + deterministic rule checks (PII, length, format)
    ↓
Pass/fail result blocks or allows PR merge
    ↓
Dashboard (React + Supabase) shows AI feature health over time
```

## Core Components
1. **GitHub Action** — CI/CD integration entry point (YAML config)
2. **Test Generator** — LLM-based adversarial case generation from behavior specs
3. **Evaluator** — Multi-model runner + LLM-as-judge scoring engine
4. **Rule Engine** — Deterministic checks (PII, format, length, safety)
5. **Dashboard** — React frontend + Supabase backend, team health views
6. **CLI** — Local testing before pushing (`behaviourci test`)

## Tech Stack
- **Runtime:** Node.js (TypeScript)
- **CI Integration:** GitHub Actions (primary), GitLab CI, Bitbucket (later)
- **AI Providers:** Anthropic, OpenAI, Google Gemini (model-agnostic)
- **Database:** Supabase (Postgres + realtime)
- **Frontend:** React + Tailwind (dashboard)
- **Testing:** Vitest for unit tests
- **Package:** npm publish for GitHub Action + CLI

## Key Design Principles
1. **Model-agnostic always** — never hard-code to one AI provider
2. **Deterministic core** — rule-based checks don't drift; AI is the judge, not the infrastructure
3. **Zero setup friction** — one YAML file, 2-minute integration
4. **Plain English specs** — non-engineers can write behavior tests
5. **Fail loud** — block the PR, surface the regression, don't let it sneak through

## Coding Conventions
- TypeScript strict mode
- All AI calls go through a provider abstraction layer (`/src/providers/`)
- Tests in `__tests__/` alongside source files
- Environment variables via `.env` (never hardcoded keys)
- Commit messages: conventional commits format (`feat:`, `fix:`, `docs:`)

## GSD Workflow
This project uses GSD for phased development:
- `/gsd:new-project` — initialize the spec
- `/gsd:plan-phase` — plan a development phase
- `/gsd:execute-phase` — execute a phase with parallel agents
- `/gsd:verify-work` — verify completed work meets spec
- `/gsd:ship` — prepare for release

## Key Files (once created)
- `src/action/` — GitHub Action entry point
- `src/providers/` — AI provider abstraction
- `src/evaluator/` — scoring engine
- `src/generator/` — test case generation
- `src/rules/` — deterministic rule checks
- `dashboard/` — React dashboard
- `action.yml` — GitHub Action manifest
- `README.md` — public docs

## Revenue Model
- Free tier: 100 test runs/month, 1 AI feature
- Team ($199/mo): unlimited runs, 5 AI features, dashboard
- Pro ($499/mo): 10+ features, model comparison, audit logs
- Enterprise ($2k-5k/mo): SSO, on-prem, SLAs, compliance reports
