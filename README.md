# Release Checklist Tool

Single-repo release checklist application with a Next.js frontend and a Go + Echo + Postgres backend.

## Stack

- Frontend: Next.js 16, React 19, Tailwind CSS 4
- Backend: Go 1.26, Echo
- Database: PostgreSQL 17
- Local orchestration: Docker Compose

## Project Structure

```text
backend/   Go API, business logic, embedded SQL migrations
frontend/  Next.js single-page UI
```

## API Endpoints

- `GET /api/health`
- `GET /api/meta/steps`
- `GET /api/releases`
- `GET /api/releases/:id`
- `POST /api/releases`
- `PATCH /api/releases/:id`
- `PATCH /api/releases/:id/steps`
- `DELETE /api/releases/:id`

## Request Shapes

### Create release

```json
{
  "name": "Version 2.4.0",
  "dueDate": "2026-03-30T13:00:00Z",
  "additionalInfo": "Deploy after product sign-off."
}
```

### Update additional info

```json
{
  "additionalInfo": "Rollback owner: platform team"
}
```

### Update steps

```json
{
  "stepsState": {
    "pull_requests_merged": true,
    "changelog_updated": true,
    "tests_passing": false,
    "staging_verified": false,
    "monitoring_ready": false,
    "rollout_approved": false,
    "production_deployed": false,
    "post_release_checks": false
  }
}
```

## Database Schema

```sql
CREATE TABLE releases (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    additional_info TEXT,
    steps_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

The checklist step definitions are fixed in backend code. Each release stores its completion state in `steps_state`.

Status is computed dynamically:
- `planned`: no completed steps
- `ongoing`: at least one completed step, but not all
- `done`: all steps completed

## Local Run

### Option 1: Docker Compose

```bash
docker compose up --build
```

Services:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8080`
- Postgres: `localhost:5432`

### Option 2: Run services manually

Backend:

```bash
cd backend
cp .env.example .env
go mod tidy
go run ./cmd/api
```

Frontend:

```bash
cd frontend
npm run dev
```

Set `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api` if needed.

## Notes

- SQL migrations run automatically when the API starts.
- The frontend is a dark-theme SPA-style interface implemented in Next.js.
- The current workspace contains `frontend/.git`, which should be removed if you want the final submission to be a single Git repository.
