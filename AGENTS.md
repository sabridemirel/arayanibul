# Repository Guidelines

## Project Structure & Module Organization
- `src/backend` — .NET API (`API`, `Business`, `Data`, `Core`) plus serverless `Lambda` and test projects `API.Tests` and `E2E.Tests`.
- `src/mobile` — Expo app with core code under `src/` (components, screens, services, hooks, utils, types), shared assets in `assets`, and the entry point `App.tsx`.
- Supporting folders include `docs` for product briefs, `infrastructure` for CDK stacks, and `scripts`/`start.sh` for automation; place new files alongside the closest domain module and mirror existing naming.

## Build, Test, and Development Commands
- Backend: `dotnet restore`, `dotnet ef database update`, then `dotnet run` inside `src/backend/API` to start the API.
- Backend tests: `dotnet test src/backend/API.Tests/API.Tests.csproj` and `dotnet test src/backend/E2E.Tests/E2E.Tests.csproj`; append `/p:CollectCoverage=true` to capture Coverlet coverage.
- Mobile: from `src/mobile`, run `npm install`, `npx expo start`, or `npm run android|ios|web`; clear caches with `npm run reset-project` when Expo behaves oddly.
- Mobile quality checks: `npm run lint`, `npm run test`, and `npm run test:coverage`; execute `chmod +x start.sh && ./start.sh` to boot API and Expo together for smoke testing.

## Coding Style & Naming Conventions
- C#: 4-space indent, file-scoped namespaces, PascalCase for types, camelCase for locals, and async methods suffixed with `Async`; organize tests as `MethodName_State_Expected`.
- TypeScript/React: 2-space indent with semicolons, components and contexts in PascalCase, hooks prefixed with `use`, utilities in camelCase, and shared types in `src/mobile/types`.
- Keep imports feature-scoped (`src/mobile/src/...`), update navigation/routes when adding screens, and prefer small, focused services that wrap Axios calls.

## Testing Guidelines
- Backend specs live in `src/backend/API.Tests` (unit/integration) and `src/backend/E2E.Tests` (journey flows) using xUnit + FluentAssertions; seed data with per-test fixtures instead of production seeders.
- Mobile Jest specs reside in `src/mobile/src/**/__tests__` named `*.test.ts` or `*.test.tsx`; mock network calls with axios spies or MSW and refresh snapshots when UI changes.
- Ensure `dotnet test` and `npm run test` pass before pushing; share coverage deltas when modifying core flows like auth or offers.

## Commit & Pull Request Guidelines
- Write concise, imperative commit subjects (e.g., `Add offer filter`), capitalized and free of trailing punctuation; include optional Turkish context in the body when it clarifies intent.
- Keep PRs focused on one feature/fix, add a summary, linked issue, migration or config notes, and screenshots or short videos for UI work.
- Record the commands you ran (tests, Expo smoke check) and flag any follow-up tasks, feature toggles, or manual QA steps reviewers should know.

## Security & Configuration Tips
- Do not commit real secrets; copy `temp_appsettings.json` into your local `appsettings.Development.json` and load live keys via user secrets or CI variables.
- Align Expo environment variables with backend URLs and OAuth identifiers, and document any new required values in the PR so QA can configure devices.
