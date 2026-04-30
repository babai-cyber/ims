# Incident Management System (IMS)
> Zeotap Infrastructure / SRE Intern Assignment

## Architecture

```
[Signal Sources] → POST /api/signals
      ↓
[Rate Limiter] → [Bull Queue (Redis)] ← Backpressure Buffer
      ↓
[Signal Processor — Debounce (10s window)]
      ↓
[Work Item Created (PostgreSQL)] + [Raw Signal Stored (MongoDB)]
      ↓
[Dashboard Cache Updated (Redis)]

[React Frontend] ← GET /api/work-items ← [Redis Cache] / [PostgreSQL fallback]
```

## Tech Stack

| Component | Technology | Why |
|-----------|------------|-----|
| Backend API | Node.js + TypeScript + Express | Type-safe, fast |
| Signal Buffer | Bull + Redis | Handles 10k/sec backpressure |
| Source of Truth | PostgreSQL + Sequelize | ACID transactions for state |
| Audit Log | MongoDB | Schema-flexible, high-volume signals |
| Cache | Redis | Dashboard in <5ms |
| Frontend | React + Vite | Fast, component-based UI |
| Deployment | Docker Compose | One-command startup |

## Setup (Local — VS Code)

### Prerequisites
- Docker Desktop running
- Node.js 20+ (for local dev)
- VS Code

### Run with Docker (Recommended)

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/ims.git
cd ims

# 2. Start everything (databases + backend + frontend)
docker-compose up --build

# 3. Wait ~30 seconds for all services to start

# 4. Open the dashboard
open http://localhost:3000

# 5. Check system health
curl http://localhost:4000/health

# 6. Simulate failures
bash seed/seed.sh
```

### Run Locally (VS Code Dev Mode)

```bash
# Terminal 1: Start databases
docker-compose up postgres mongodb redis

# Terminal 2: Backend
cd backend
cp .env.example .env
npm install
npm run dev

# Terminal 3: Frontend
cd frontend
npm install
npm run dev

# Open: http://localhost:3000
```

## How Backpressure Is Handled

When signals arrive at 10,000/sec, the HTTP route immediately adds them to a **Bull/Redis queue** and returns **HTTP 202 Accepted** — no DB writes happen in the request cycle. The queue worker processes signals at a sustainable rate (50 concurrent workers). This prevents DB overload — Redis acts as a shock absorber between ingestion and persistence.

```
HTTP POST → Queue.add() → return 202 (fast, <1ms)
           Queue.process() → DB writes (async, sustainable rate)
```

## Design Patterns

- **Strategy Pattern**: `AlertContext` selects `P0AlertStrategy` (RDBMS/API) or `P2AlertStrategy` (Cache/Queue) based on component type — swappable without changing caller code
- **State Pattern**: `WorkItemStateMachine` enforces valid transitions `OPEN → INVESTIGATING → RESOLVED → CLOSED`, with RCA check before allowing `CLOSED`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/signals | Ingest a signal (rate-limited, async) |
| GET | /api/work-items | List all incidents (cache-first) |
| GET | /api/work-items/:id | Incident detail + raw signals + RCA |
| PATCH | /api/work-items/:id/status | Advance state machine |
| POST | /api/work-items/:id/rca | Submit RCA |
| GET | /health | System health check |

## Security Measures (OWASP Top 10)

| OWASP Risk | Implementation |
|------------|---------------|
| A01 Broken Access Control | Rate limiting per IP |
| A03 Injection | express-validator input sanitization |
| A04 Insecure Design | Strict state machine, no skip-states |
| A05 Security Misconfiguration | Helmet.js headers, CORS whitelist |
| A06 Vulnerable Components | Trivy image scanning in CI/CD |
| A07 Auth Failures | Rate limiting on all endpoints |
| A09 Security Logging | Winston structured logging |

## Non-Functional Additions (Bonus)

- ✅ Rate limiting (10,000 req/min on ingestion, 1,000 on API)
- ✅ Redis TTL cache for dashboard (300s)
- ✅ MongoDB TTL index for signal cleanup (90 days)
- ✅ Exponential backoff on queue job retries (3 attempts)
- ✅ Throughput metrics logged every 5 seconds
- ✅ Transactional state transitions (PostgreSQL transactions + row lock)
- ✅ Multi-stage Docker builds (smaller, more secure images)
- ✅ Non-root user in Docker containers
- ✅ Health checks on all Docker services
- ✅ Trivy security scanning in CI pipeline
- ✅ SonarQube code quality analysis
- ✅ Unit tests for RCA validation logic

## Sample Data

```bash
bash seed/seed.sh
```

Or use the JSON payloads in `seed/simulate-failure.json` with Postman/curl.

## GitHub Link

**https://github.com/YOUR_USERNAME/ims**
