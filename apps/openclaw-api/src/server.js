import { createServer } from 'node:http'
import {
  completeCheckin,
  dbPath,
  executeRegisteredTool,
  getAgentRegistry,
  getBootstrap,
  getCapabilities,
  getEvents,
  getAchievements,
  getMessagesForGroup,
  getMemories,
  getRewards,
  getReviewResults,
  getToolRuns,
  getTools,
  getWorkLogs,
  initDb,
  resolveCapability,
  saveAdoption,
  savePermissions,
  writeWorkLog,
} from './db.js'
import { getAiStatus, runAiTask } from './aiAdapter.js'

const host = process.env.OPENCLAW_HOST || '127.0.0.1'
const port = Number(process.env.OPENCLAW_PORT || 8787)
const corsOrigin = process.env.OPENCLAW_CORS_ORIGIN || '*'

initDb()

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Content-Type': 'application/json; charset=utf-8',
  })
  response.end(JSON.stringify(payload))
}

function sendError(response, error) {
  const statusCode = error.status || 500
  sendJson(response, statusCode, {
    error: {
      message: error instanceof Error ? error.message : String(error),
    },
  })
}

function readJson(request) {
  return new Promise((resolveRequest, rejectRequest) => {
    const chunks = []
    let size = 0

    request.on('data', (chunk) => {
      size += chunk.length
      if (size > 1024 * 1024) {
        request.destroy()
        rejectRequest(new Error('Request body is too large'))
        return
      }
      chunks.push(chunk)
    })

    request.on('end', () => {
      if (chunks.length === 0) {
        resolveRequest({})
        return
      }

      try {
        resolveRequest(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        const error = new Error('Invalid JSON body')
        error.status = 400
        rejectRequest(error)
      }
    })

    request.on('error', rejectRequest)
  })
}

function normalizeChatBody(body) {
  const messages = Array.isArray(body.messages)
    ? body.messages
    : [{ role: 'user', content: String(body.message || '') }]

  return {
    ...body,
    messages: messages.filter((message) => String(message.content || '').trim()),
  }
}

async function route(request, response) {
  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {})
    return
  }

  const url = new URL(request.url || '/', `http://${request.headers.host}`)
  const path = url.pathname

  if (request.method === 'GET' && path === '/health') {
    sendJson(response, 200, {
      ok: true,
      name: 'openclaw-api',
      version: '0.1.0',
      dbPath,
      ai: getAiStatus(),
      time: new Date().toISOString(),
    })
    return
  }

  if (request.method === 'GET' && path === '/api/bootstrap') {
    sendJson(response, 200, getBootstrap())
    return
  }

  if (request.method === 'GET' && path === '/api/agent/registry') {
    sendJson(response, 200, getAgentRegistry())
    return
  }

  if (request.method === 'GET' && path === '/api/capabilities') {
    sendJson(response, 200, { capabilities: getCapabilities() })
    return
  }

  if (request.method === 'GET' && path === '/api/tools') {
    sendJson(response, 200, { tools: getTools() })
    return
  }

  if (request.method === 'GET' && path === '/api/tool-runs') {
    const limit = Number(url.searchParams.get('limit') || 50)
    sendJson(response, 200, { toolRuns: getToolRuns(limit) })
    return
  }

  if (request.method === 'GET' && path === '/api/review-results') {
    const limit = Number(url.searchParams.get('limit') || 50)
    sendJson(response, 200, { reviewResults: getReviewResults(limit) })
    return
  }

  if (request.method === 'GET' && path === '/api/memories') {
    const limit = Number(url.searchParams.get('limit') || 50)
    sendJson(response, 200, { memories: getMemories(limit) })
    return
  }

  if (request.method === 'GET' && path === '/api/events') {
    const limit = Number(url.searchParams.get('limit') || 50)
    sendJson(response, 200, { events: getEvents(limit) })
    return
  }

  if (request.method === 'POST' && path === '/api/capabilities/resolve') {
    const body = await readJson(request)
    sendJson(response, 200, { capability: resolveCapability(body) })
    return
  }

  if (request.method === 'POST' && path === '/api/tools/run') {
    const body = await readJson(request)
    sendJson(
      response,
      200,
      executeRegisteredTool(body.toolKey, body.input || {}, {
        capabilityKey: body.capabilityKey,
      }),
    )
    return
  }

  if (request.method === 'POST' && path === '/api/adoption') {
    const body = await readJson(request)
    sendJson(response, 200, {
      lobster: saveAdoption(body),
      checkins: getBootstrap().checkins,
      rewards: getRewards(),
      achievements: getAchievements(),
    })
    return
  }

  if (request.method === 'POST' && path === '/api/permissions') {
    const body = await readJson(request)
    sendJson(response, 200, {
      permission: savePermissions(body),
      permissions: getBootstrap().permissions,
    })
    return
  }

  const checkinMatch = path.match(/^\/api\/checkins\/([^/]+)\/complete$/)
  if (request.method === 'POST' && checkinMatch) {
    sendJson(response, 200, {
      checkins: completeCheckin(decodeURIComponent(checkinMatch[1])),
      rewards: getRewards(),
      achievements: getAchievements(),
    })
    return
  }

  if (request.method === 'GET' && path === '/api/work-logs') {
    const limit = Number(url.searchParams.get('limit') || 50)
    sendJson(response, 200, { workLogs: getWorkLogs(limit) })
    return
  }

  if (request.method === 'POST' && path === '/api/ai/chat') {
    const body = normalizeChatBody(await readJson(request))
    const lastMessage = body.messages.at(-1)?.content || ''
    const capability = resolveCapability({ text: lastMessage })
    const output = await runAiTask(
      'chat',
      body,
      'Handle private chat with the adopted lobster profile and keep the response concise.',
    )
    writeWorkLog('ai-chat', 'Lobster chat generated', {
      capabilityKey: capability?.key,
      source: output.source,
      outputId: output.id,
    })
    sendJson(response, 200, output)
    return
  }

  if (request.method === 'POST' && path === '/api/ai/summarize-group') {
    const body = await readJson(request)
    const groupId = String(body.groupId || 'group-ai-camp')
    const readResult = executeRegisteredTool(
      'read_mock_group_messages',
      { groupId },
      { capabilityKey: 'summarize_group' },
    )
    if (readResult.toolRun.status === 'blocked') {
      sendJson(response, 403, {
        error: {
          message: readResult.toolRun.errorMessage,
        },
        toolRun: readResult.toolRun,
        reviews: readResult.reviews,
      })
      return
    }
    const messages = readResult.output.messages
    const mentions = messages.filter((message) => message.content.includes('@小北'))
    const output = await runAiTask(
      'summarize_group',
      { groupId, messages, mentions },
      'Summarize authorized mock QQ group messages into a short proactive awareness card. Treat @ mentions as high-priority signals, but do not present them as a separate global collection feature.',
    )
    writeWorkLog('summarize-group', 'Group summary generated', {
      groupId,
      toolRunId: readResult.toolRun.id,
      source: output.source,
      outputId: output.id,
      mentionCount: mentions.length,
    })
    sendJson(response, 200, {
      ...output,
      groupId,
      messages,
      mentions,
      sourceMessageIds: messages.map((message) => message.id),
      readToolRunId: readResult.toolRun.id,
    })
    return
  }

  if (request.method === 'POST' && path === '/api/ai/reply-draft') {
    const body = await readJson(request)
    const groupId = String(body.groupId || 'group-ai-camp')
    const draftTool = executeRegisteredTool(
      'generate_reply_draft',
      {
        groupId,
        sourceMessageId: body.sourceMessageId ?? null,
        autoSend: false,
      },
      { capabilityKey: 'generate_reply_draft' },
    )
    if (draftTool.toolRun.status === 'blocked') {
      sendJson(response, 403, {
        error: {
          message: draftTool.toolRun.errorMessage,
        },
        toolRun: draftTool.toolRun,
        reviews: draftTool.reviews,
      })
      return
    }

    const messages = getMessagesForGroup(groupId)
    const sourceMessage =
      messages.find((message) => message.id === body.sourceMessageId) ??
      messages.find((message) => message.id === draftTool.output.sourceMessageId) ??
      messages.find((message) => message.kind === 'mention') ??
      messages[0] ??
      null
    const output = await runAiTask(
      'generate_reply_draft',
      {
        groupId,
        sourceMessage,
        messages,
        toolDraft: draftTool.output.draft,
        previewRequired: true,
      },
      'Generate one concise QQ group reply draft. The draft must be a preview only and must clearly require user confirmation before sending.',
    )
    writeWorkLog('reply-draft', 'Reply draft generated', {
      groupId,
      sourceMessageId: sourceMessage?.id ?? null,
      toolRunId: draftTool.toolRun.id,
      source: output.source,
      outputId: output.id,
      previewRequired: true,
    })
    sendJson(response, 200, {
      ...output,
      groupId,
      draft: output.text,
      sourceMessage,
      sourceMessageIds: sourceMessage ? [sourceMessage.id] : [],
      previewRequired: true,
      toolRunId: draftTool.toolRun.id,
      reviews: draftTool.reviews,
    })
    return
  }

  if (request.method === 'POST' && path === '/api/ai/generate-work-log') {
    const body = await readJson(request)
    const limit = Number(body.limit || 8)
    const latestWorkLogs = getWorkLogs(limit)
    const output = await runAiTask(
      'generate_work_log',
      {
        ...body,
        latestWorkLogs,
      },
      'Generate a short work log from OpenClaw actions.',
    )
    const workLog = writeWorkLog('generate-work-log', 'Work log generated by AI', {
      source: output.source,
      outputId: output.id,
    })
    sendJson(response, 200, {
      ...output,
      workLogId: workLog.id,
      latestWorkLogs: getWorkLogs(limit),
    })
    return
  }

  if (request.method === 'POST' && path === '/api/ai/generate-diary') {
    const body = await readJson(request)
    const output = await runAiTask(
      'generate_diary',
      body,
      'Write a first-person diary from the lobster perspective.',
    )
    writeWorkLog('generate-diary', 'Diary generated by AI', {
      source: output.source,
      outputId: output.id,
    })
    sendJson(response, 200, output)
    return
  }

  sendJson(response, 404, {
    error: {
      message: `Not found: ${request.method} ${path}`,
    },
  })
}

const server = createServer((request, response) => {
  route(request, response).catch((error) => sendError(response, error))
})

server.listen(port, host, () => {
  console.log(`OpenClaw API listening on http://${host}:${port}`)
})
