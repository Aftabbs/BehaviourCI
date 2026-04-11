# Contributing to BehaviorCI

Thanks for your interest in contributing.

## Getting Started

```bash
git clone https://github.com/Aftabbs/BehaviourCI.git
cd BehaviourCI
npm install
cp .env.example .env   # add your GROQ_API_KEY
npm test               # verify 54 tests pass
npm run build          # compile TypeScript
```

## Running Locally

```bash
# Run the CLI directly from source (no build needed)
npm run cli -- test examples/basic.behaviourci.yml

# Or use the demo (no API key needed)
npm run cli -- demo
```

## Making Changes

1. Fork the repo and create a branch: `git checkout -b feature/your-feature`
2. Make your changes in `src/`
3. Add or update tests in `__tests__/`
4. Run `npm test` — all 54 tests must pass
5. Run `npm run lint` — no TypeScript errors
6. Open a pull request with a clear description

## What to Work On

Check the [open issues](https://github.com/Aftabbs/BehaviourCI/issues) for good first contributions. Areas that need help:

- **New rule types** — add more deterministic checks (`src/rules/`)
- **Provider support** — new LLM providers (`src/providers/`)
- **Dashboard improvements** — React frontend (`dashboard/src/`)
- **Example specs** — more `examples/*.behaviourci.yml` for common AI use cases
- **Documentation** — clearer setup guides, more examples

## Project Structure

```
src/
  action/       GitHub Action entry point
  cli/          CLI commands (test, init, demo, validate, report)
  evaluator/    Core orchestrator
  generator/    Adversarial test generation
  judge/        LLM-as-judge scoring
  providers/    Groq, OpenAI, Anthropic, Azure provider adapters
  reporter/     Console, JSON, GitHub PR comment output
  rules/        Deterministic checks (PII, length, format)
  spec/         YAML parser + Zod validation
  storage/      Supabase persistence layer
  target/       HTTP endpoint + direct prompt callers
  types/        Shared TypeScript interfaces

dashboard/      React + Tailwind + recharts frontend
__tests__/      Unit tests (Vitest)
examples/       Example .behaviourci.yml specs
supabase/       Database migrations
```

## Commit Messages

Follow [conventional commits](https://www.conventionalcommits.org/):

```
feat: add must-start-with rule type
fix: handle empty LLM response in judge
docs: add healthcare example spec
test: add coverage for endpoint interpolation
```

## Adding a New Rule

1. Add the rule name to `RuleName` in `src/types/spec.ts`
2. Implement the check in `src/rules/` (new file or existing)
3. Add a case to `runRule()` in `src/rules/index.ts`
4. Add the rule to the Zod schema in `src/spec/parser.ts`
5. Add tests in `__tests__/rules.test.ts`
6. Document it in the README rule table

## Adding a New Provider

1. Create `src/providers/yourprovider.ts` implementing `LLMProvider`
2. Add it to `getProvider()` and `getPrimaryProvider()` in `src/providers/index.ts`
3. Add the env var to `.env.example`
4. Document it in the README providers table
