# OpenClaw API

Stage 1.5 minimum backend for QQ Lobster v2.

## Run

```text
npm run dev
```

Default local address:

```text
http://127.0.0.1:8787
```

## AI configuration

OpenClaw uses an OpenAI-compatible `/chat/completions` endpoint. If any AI
configuration is missing or the request fails, the API returns `mock-fallback`
output and records that source in SQLite.

```text
OPENCLAW_AI_PROVIDER=openai-compatible
OPENCLAW_AI_BASE_URL=
OPENCLAW_AI_API_KEY=
OPENCLAW_AI_MODEL=
OPENCLAW_AI_TIMEOUT_MS=30000
OPENCLAW_AI_FALLBACK=mock
```

## Endpoints

```text
GET  /health
GET  /api/bootstrap
POST /api/adoption
POST /api/permissions
POST /api/checkins/:key/complete
GET  /api/work-logs
POST /api/ai/chat
POST /api/ai/summarize-group
POST /api/ai/generate-work-log
POST /api/ai/generate-diary
```
