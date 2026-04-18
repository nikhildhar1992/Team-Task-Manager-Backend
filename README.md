# Team Task Manager Backend

Production-ready SaaS backend for team task management built with Node.js, Express, MySQL, Redis, and BullMQ.

## Highlights

- Clean architecture: Controller -> Service -> Repository
- JWT auth with access/refresh tokens + refresh token rotation
- Multi-tenant team scoping in data access layer
- RBAC (Admin, Member)
- Task APIs with cursor pagination, filtering, sorting
- Redis caching with fail-safe behavior
- Route-specific + user/IP rate limiting
- BullMQ background worker for notifications
- AI endpoint using Gemini for task generation
- Centralized error handling + structured logging (Pino)
- Security hardening: Helmet, CORS, validation, XSS, payload limits
- Health endpoints (`/health`, `/health/full`)
- Dockerized API + Worker + MySQL + Redis
- Swagger docs at `/docs`

## Project Structure

```text
src/
 ├── controllers/
 ├── services/
 ├── repositories/
 ├── middlewares/
 ├── routes/
 ├── config/
 ├── utils/
 ├── jobs/
 ├── workers/
 ├── db/
 ├── validators/
 └── docs/
```

## Quick Start (Local)

1. Copy env file:

```bash
cp .env.example .env
```

2. Install dependencies:

```bash
npm install
```

3. Run migrations and seed:

```bash
npm run migrate
npm run seed
```

4. Start API:

```bash
npm run dev
```

5. Start worker (new terminal):

```bash
npm run worker:dev
```

## Docker Development

```bash
docker compose up
```

Then run migration/seed from API container shell:

```bash
docker compose exec api npm run migrate
docker compose exec api npm run seed
```

## API Base URL

`/api/v1`

## Main Endpoints

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/teams/me`
- `POST /api/v1/teams/:teamId/members`
- `DELETE /api/v1/teams/:teamId/members`
- `GET /api/v1/teams/:teamId/tasks`
- `POST /api/v1/teams/:teamId/tasks`
- `PATCH /api/v1/teams/:teamId/tasks/:taskId`
- `DELETE /api/v1/teams/:teamId/tasks/:taskId`
- `POST /api/v1/ai/generate-tasks`
- `GET /api/v1/health`
- `GET /api/v1/health/full`

## Scripts

- `npm run dev` -> run API with hot reload
- `npm run start` -> run API (production mode)
- `npm run worker:dev` -> run worker with hot reload
- `npm run worker` -> run worker
- `npm run migrate` -> apply schema
- `npm run seed` -> insert seed data
- `npm run lint` -> run ESLint
- `npm run format` -> run Prettier

## Notes

- Refresh tokens are stored hashed in MySQL and rotated on `/auth/refresh`.
- All task queries enforce team-level isolation with `team_id`.
- Caching and rate limiting gracefully degrade if Redis is unavailable.
