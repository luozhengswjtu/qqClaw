# Stage 1.5 Execution Notes

Date: 2026-04-30

## Scope

Stage 1.5 adds the minimum OpenClaw foundation without replacing the current
QQ Lobster v2 frontend:

1. `apps/openclaw-api` local backend.
2. SQLite persistence with seed demo data.
3. OpenAI-compatible AI adapter.
4. Mock fallback for every AI path.
5. Frontend adapter layer and Vite proxy.
6. Adoption, bootstrap, checkin, and lobster chat writes routed through
   OpenClaw when available.
7. Capability registry, tool registry, review policies, tool run logs, review
   results, event logs, and explicit memories.
8. Permission-gated mock tools for group-message reads, mentions, summaries,
   reply drafts, work logs, diary material, and space-post previews.
9. Low-risk chat uses streamed UI simulation on the frontend; high-risk
   preview-capable tools are marked as confirmation-required in OpenClaw.

## Runtime

OpenClaw API:

```text
cd apps/openclaw-api
npm run dev
```

Frontend:

```text
cd apps/qq-lobster-v2
npm run dev
```

Default API URL:

```text
http://127.0.0.1:8787
```

The frontend proxies `/openclaw/*` to that API during Vite dev.

## AI Config

Use `.env.example` as the config shape:

```text
OPENCLAW_AI_PROVIDER=openai-compatible
OPENCLAW_AI_BASE_URL=
OPENCLAW_AI_API_KEY=
OPENCLAW_AI_MODEL=
OPENCLAW_AI_TIMEOUT_MS=30000
OPENCLAW_AI_FALLBACK=mock
```

When base URL, API key, or model is missing, OpenClaw records the request and
returns `mock-fallback` output.

## Verification

Passed:

```text
cd apps/qq-lobster-v2 && npm run lint
cd apps/qq-lobster-v2 && npm run build
cd apps/openclaw-api && npm run smoke
```

Smoke result:

```text
health: true
aiConfigured: false
groups: 3
lobster: 小钳
chatSource: mock-fallback
capabilities: 7
tools: 7
blockedToolStatus: blocked
successfulToolStatus: success
reviewResults: 10
memories: 10
```

Additional checked behavior:

1. `GET /api/agent/registry` returns capabilities, tools, review policies,
   and memories.
2. `POST /api/tools/run` blocks `read_mock_group_messages` for an unauthorized
   group and records a `check_group_permission` review result.
3. After `POST /api/permissions` grants `summarizeGroup`, the same tool succeeds
   for `group-ai-camp` and records both pre-check and post-check results.
4. `POST /api/ai/summarize-group` now goes through the registered tool and
   permission review before calling the AI adapter.
5. `POST /api/ai/chat` resolves a capability and records AI output, review,
   event, work-log, and behavior memory entries.

## Notes

`node:sqlite` is experimental in Node 24.13.0, but it avoids installing native
SQLite dependencies in the current Windows environment. If this becomes a
deployment issue later, replace the storage adapter while keeping the API
contract stable.
