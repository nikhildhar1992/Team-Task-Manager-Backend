# RAG Orchestrator Backend Status Plan

## Objective

Provide a clear backend status snapshot for the RAG + Orchestrator implementation so frontend setup can proceed in parallel.

## Completed on Backend

### 1) Data model and schema

- Added knowledge storage tables in `src/db/schema.sql`:
  - `knowledge_documents`
  - `knowledge_chunks`
- Added commerce tables in `src/db/schema.sql`:
  - `orders`
  - `order_items`

### 2) Knowledge module implemented

- Routes: `src/routes/knowledgeRoutes.js`
- Controller: `src/controllers/knowledgeController.js`
- Service: `src/services/knowledgeService.js`
- Repository: `src/repositories/knowledgeRepository.js`
- Validators: `src/validators/knowledgeValidators.js`
- Seed docs source: `docs/knowledge/seed-documents.json`

Implemented endpoints:

- `POST /api/v1/knowledge/ingest`
- `POST /api/v1/knowledge/search`

Behavior:

- Ingest reads source docs, chunks content, generates embeddings (OpenAI if key exists, fallback deterministic vectors otherwise), stores chunks in MySQL, and upserts vectors into Qdrant when configured.
- Search retrieves semantically from Qdrant, with SQL fallback if Qdrant is not configured or returns no hits.

### 3) AI Orchestrator endpoint implemented

- Extended AI route/controller/validator:
  - `src/routes/aiRoutes.js`
  - `src/controllers/aiController.js`
  - `src/validators/aiValidators.js`
- Added orchestration logic:
  - `src/services/orchestratorService.js`
  - `src/repositories/orchestratorRepository.js`

Implemented endpoint:

- `POST /api/v1/ai/orchestrate`

Behavior:

- Validates mode/prompt/teamId.
- Performs prompt safety checks (basic injection pattern blocking).
- Retrieves operational context from SQL (tasks, orders, team membership).
- Retrieves knowledge context from vector/knowledge search.
- Calls OpenAI chat when `OPENAI_API_KEY` is set; otherwise returns deterministic fallback response.
- Enforces strict output structure for frontend use:
  - `summary`
  - `tasks[]`
  - `sources[]`
  - `confidence`
  - `followUpQuestions[]`

### 4) API registration complete

- `src/routes/index.js` updated to include:
  - `/knowledge`
  - `/orders`
  - `/ai` (with orchestrate route included)

### 5) Code quality checks

- Lint checks run on touched files.
- No linter errors reported in edited backend files.

## Pending on Backend (Operational / rollout)

### Required run/setup steps

1. Ensure containers are up:
   - `docker compose up -d --build`
2. Run migrations to create new tables:
   - `docker compose exec api npm run migrate`
3. Ingest knowledge at least once:
   - `POST /api/v1/knowledge/ingest`
4. Validate orchestration endpoint:
   - `POST /api/v1/ai/orchestrate`

### Environment configuration pending

Configure in runtime `.env` (as needed):

- Qdrant:
  - `QDRANT_URL`
  - `QDRANT_COLLECTION` (default `product_knowledge_v1`)
  - `QDRANT_API_KEY` (optional)
- OpenAI (optional for paid model path):
  - `OPENAI_API_KEY`
  - `OPENAI_EMBEDDING_MODEL` (optional)
  - `OPENAI_CHAT_MODEL` (optional)
- Retrieval tuning:
  - `EMBEDDING_VECTOR_SIZE`
  - `RAG_TOP_K`
  - `KNOWLEDGE_SOURCE_FILE` (optional override)

### Optional hardening still pending (not blockers)

- Add OpenAPI docs for new endpoints.
- Add endpoint-level tests for ingest/search/orchestrate.
- Add scheduled ingestion trigger (nightly/cron) if required.
- Add richer prompt injection/safety guardrails.
- Add token usage / cost telemetry for OpenAI calls.

## Frontend Integration Contract (Ready)

### 1) Orchestrator request

`POST /api/v1/ai/orchestrate`

```json
{
  "prompt": "Plan my launch for next month",
  "mode": "task_breakdown",
  "teamId": 3
}
```

### 2) Orchestrator response

```json
{
  "summary": "string",
  "tasks": [
    {
      "title": "string",
      "description": "string",
      "priority": "low",
      "deadline": "2026-06-10"
    }
  ],
  "sources": [
    {
      "type": "doc",
      "id": "string",
      "title": "string",
      "excerpt": "string",
      "score": 0.84
    }
  ],
  "confidence": 0.81,
  "followUpQuestions": ["string"]
}
```

### 3) Frontend mode mapping suggestion

- `task_agent` -> `task_breakdown`
- `order_agent` -> `operations`
- `support_agent` -> `support`
- default chat -> `general`

## Budget Mode Guidance

If minimizing OpenAI cost is priority:

- Do not set `OPENAI_API_KEY`.
- Keep Qdrant enabled for vector search with deterministic fallback embeddings.
- Orchestrator will still respond with schema-compatible output.

---

This file is the current backend status baseline for frontend handoff.
