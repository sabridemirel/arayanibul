# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Arayanibul is a reverse classifieds platform: buyers post what they're looking for ("Need"), and service/product providers respond with offers ("Offer"). Three clients/layers: .NET backend, React Native/Expo mobile app, React web app.

Core flow: Need created → providers send Offers → buyer accepts one → messaging (per offer) → escrow payment → release/refund → reviews.

Status lifecycles (`src/backend/API/Models/Enums.cs`):
- Need: `Active → InProgress → Completed | Cancelled | Expired`
- Offer: `Pending → Accepted | Rejected | Withdrawn`
- Transaction: `Pending → Processing → Completed (in escrow) → Released | Refunded` (or `Failed`/`Cancelled`)
- Verification badges are a bit-flag enum (Email/Phone/Identity/Business)

## Architecture

### Backend — `src/backend/API/` (.NET 9)
- Single API project (no separate layer projects): `Controllers/`, `Services/`, `Interfaces/`, `Models/` (entities + DTOs together), `Data/` (DbContext + `SeedData`), `Hubs/ChatHub.cs`, `Middleware/`, `Validation/`, `Migrations/`
- DI and service registration: `Configuration/ServiceExtensions.cs` (`AddApplicationServices`, `AddJwtAuthentication`, `AddBusinessServices`, `AddCorsPolicy`)
- **Database: PostgreSQL** (Npgsql) in all environments. The SQLite package is referenced but unused.
- Auth: JWT + refresh tokens, Google/Facebook OAuth, guest login (`guest-login`, `convert-guest`); `GuestCleanupService` removes stale guests
- Real-time: SignalR hub at `/chathub`; push notifications via Firebase (`NOTIFICATION_SETUP.md`)
- Payments: Iyzico / PayTR with escrow (`PaymentController`: initialize, callback, release, refund)
- Middleware pipeline: security headers, security monitoring, rate limiting, global exception handling
- Health check: `/health`; Swagger: `/swagger`
- Images: ImageSharp + `LocalFileStorageService` (served from `wwwroot`)

### Mobile — `src/mobile/` (Expo 54, React Native 0.81, React 19)
- Navigation: `navigation/AppNavigator.tsx` — Auth stack (Welcome/Login/Register), 5-tab main navigator, root stack (NeedDetail, CreateNeed, CreateOffer, Chat, Payment, TransactionHistory, Notifications…)
- **Two parallel folder trees exist:** most code lives at the root level (`screens/`, `services/`, `contexts/`, `components/`, `hooks/`, `theme/`), while `src/` holds newer pieces (onboarding screens, `NeedCard`, some UI components). Check both before adding or looking for code.
- Contexts: Auth, Notification, Theme. API via Axios (`services/api.ts`, `secureApiClient.ts`); also biometric auth, secure storage, certificate pinning services

### Web — `src/web/` (Vite 7, React 19, Tailwind 4, React Router 7)
- `src/pages/` (Home, Search, NeedDetail, CreateNeed, CreateOffer, MyNeeds, MyOffers, Profile, Login, Register), `src/services/api.ts`, `src/contexts/AuthContext.tsx`
- API URL comes from `VITE_API_URL`; served by nginx in Docker
- Docs: `src/web/README.md`, `docs/WEB_LAYER_DOCUMENTATION.md`

### Project Structure
```
src/
├── backend/
│   ├── API/          # Web API (.NET 9)
│   ├── API.Tests/    # Unit + integration tests
│   └── E2E.Tests/    # End-to-end tests (user journey, payment flow)
├── mobile/           # Expo app (see "two parallel folder trees" above)
└── web/              # Vite + React web app
docs/                 # Roadmap, MVP status, UAT, deployment docs (Turkish)
docker-compose.yml    # postgres + api + web
```

## Development Commands

### Quick Start (Docker)
```bash
./start.sh   # docker compose up (postgres + api + web), waits for /health, then launches mobile simulators
```
- API: http://localhost:5001/api — Swagger: http://localhost:5001/swagger
- Web: http://localhost:3000
- Postgres: localhost:5432 (db `arayanibul`, user `postgres`)

### Backend (local, without Docker)
```bash
cd src/backend/API
dotnet restore
dotnet ef database update   # requires PostgreSQL running on localhost:5432
dotnet run                  # http://localhost:5001
```
For new migrations use the `migrate` skill.

### Mobile
```bash
cd src/mobile
npm install
npx expo start      # or: npm start
npm run ios         # expo run:ios (native build)
npm run android     # expo run:android
npm run lint
npm run test        # jest; also test:watch, test:coverage
```

### Web
```bash
cd src/web
npm install
npm run dev         # Vite dev server (http://localhost:5173)
npm run build       # tsc -b && vite build
npm run lint
```

## Testing
- Backend: `dotnet test` in `src/backend/API.Tests` or `src/backend/E2E.Tests`
- Mobile: Jest (`npm run test`)
- Web: no test setup yet
- UAT scenarios: `docs/USER_ACCEPTANCE_TESTING.md`

## Çalışma Kuralları

Uygun görevlerde doğrudan kod yazmak yerine **önce plugin skill/agent kullan** (projeye özel `.claude/agents/` yok):

| Görev | Kullan |
|-------|--------|
| UI tasarım / yeniden tasarım | `frontend-design` skill |
| Kullanıcıya görünen metin (web/mobil) | `turkish-ui-copy` skill (proje skill'i) |
| UI/UX & erişilebilirlik denetimi (web) | `chrome-devtools-mcp:a11y-debugging` skill + Lighthouse |
| Web uygulamasını test etme | `webapp-testing` skill (Playwright) |
| Yeni özellik (planlama + geliştirme) | `feature-dev:feature-dev` skill (code-explorer / code-architect agent'ları) |
| Bug araştırma/fix | `superpowers:systematic-debugging` skill |
| Kod inceleme | `feature-dev:code-reviewer` agent veya `code-review` skill |
| .NET / EF Core dokümantasyonu | `microsoft-docs` plugin |

Tek satırlık basit düzeltmeler (typo, bir elementi kaldırma vb.) için agent şart değil.

## Important Notes
- Google/Facebook authentication requires native builds (won't work in Expo Go); email/password and guest auth work in Expo Go
- Features usually need to be implemented on both mobile and web to keep parity
- Production setup and runbook (domains/DNS, SEO, ImageSharp license, deploy steps, change log): `docs/OPERATIONS.md` — update it when production setup changes
- Project status and backlog: `docs/MVP_STATUS_SUMMARY.md`, `docs/FEATURES_ROADMAP.md`, `docs/PRIORITY_TASKS.md` (may lag behind code)
- Project follows Turkish documentation (README and docs are in Turkish); UI text is Turkish
