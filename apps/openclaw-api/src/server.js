import { createServer } from 'node:http'
import { createReadStream, existsSync } from 'node:fs'
import {
  attachHiddenDiaryImage,
  authorizeMockQqMusic,
  completeCheckin,
  deleteInterestProfile,
  dbPath,
  executeRegisteredTool,
  getAgentRegistry,
  getDiaryTriggerContext,
  getBootstrap,
  getCapabilities,
  getEvents,
  getAchievements,
  getHiddenDiaryState,
  getInterestEvents,
  getInterestProfiles,
  getLobsterChatLines,
  getMessagesForGroup,
  getMemories,
  getRewards,
  getReviewResults,
  getSpaceState,
  getToolRuns,
  getTools,
  getWorkLogs,
  inferAndSaveInterestFromChat,
  initDb,
  recordSpaceInteraction,
  recordInterestEvent,
  recordReviewResult,
  revealHiddenDiaryEntry,
  resolveCapability,
  saveAdoption,
  saveInterestProfile,
  saveLobsterChatLine,
  saveLobsterChatLines,
  saveHiddenDiaryEntry,
  updateInterestProfileSettings,
  saveSpaceComment,
  saveSpacePost,
  savePermissions,
  writeEvent,
  writeWorkLog,
} from './db.js'
import { getAiStatus, runAiTask } from './aiAdapter.js'
import {
  generateDiaryImage,
  getGeneratedImageContentType,
  getImageStatus,
  resolveGeneratedImagePath,
} from './imageAdapter.js'

const host = process.env.OPENCLAW_HOST || '127.0.0.1'
const port = Number(process.env.OPENCLAW_PORT || 8787)
const corsOrigin = process.env.OPENCLAW_CORS_ORIGIN || '*'

initDb()

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
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

function sendFile(response, filePath) {
  if (!existsSync(filePath)) {
    sendJson(response, 404, {
      error: {
        message: 'Generated image not found',
      },
    })
    return
  }

  response.writeHead(200, {
    'Access-Control-Allow-Origin': corsOrigin,
    'Content-Type': getGeneratedImageContentType(filePath),
    'Cache-Control': 'public, max-age=31536000, immutable',
  })
  createReadStream(filePath)
    .on('error', (error) => sendError(response, error))
    .pipe(response)
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

function pickDiaryQuote(text) {
  return (
    String(text || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) || '我不是一个按钮，是会记得小事的 QQ 小伙伴。'
  )
}

function pickSpaceComment(spaceState, postId, commentId) {
  const post =
    spaceState.posts.find((item) => item.id === postId) ?? spaceState.posts[0]
  const comment =
    post?.comments.find((item) => item.id === commentId) ??
    post?.comments.find((item) => item.authorType !== 'lobster') ??
    post?.comments[0] ??
    null

  return { post, comment }
}

function normalizeSpaceAwarenessEvent(body) {
  const type = String(body.type || '').trim()
  const sourceId = String(
    body.sourceId ||
      body.outputId ||
      body.workLogId ||
      body.commentId ||
      body.postId ||
      body.groupId ||
      type ||
      'unknown',
  ).trim()

  return {
    ...body,
    type,
    sourceId,
    groupId: body.groupId ? String(body.groupId) : null,
    groupTitle: body.groupTitle ? String(body.groupTitle) : null,
    title: body.title ? String(body.title) : null,
    summary: body.summary ? String(body.summary) : null,
    content: body.content ? String(body.content) : null,
    mentionCount: Number(body.mentionCount || 0),
    groupCount: Number(body.groupCount || 0),
  }
}

function normalizeInterestProfileInput(body) {
  const interest = String(body.interest || '').trim()
  if (!interest) {
    const error = new Error('Interest is required')
    error.status = 400
    throw error
  }

  return {
    id: body.id,
    interest,
    enabled:
      typeof body.enabled === 'boolean' ? body.enabled : body.enabled !== false,
    topics: Array.isArray(body.topics) ? body.topics : [],
    city: body.city ? String(body.city) : undefined,
    sources: Array.isArray(body.sources)
      ? body.sources
      : [
          {
            id: `source-api-${Date.now()}`,
            type: 'user_setting',
            title: 'API 保存的兴趣画像',
            authorized: false,
            permissionNote:
              '用户可查看、修改或删除这条兴趣画像；不会自动对外执行动作。',
            evidenceText: body.evidenceText
              ? String(body.evidenceText)
              : '用户通过兴趣画像 API 保存。',
          },
        ],
    reminderFrequency: body.reminderFrequency || 'important_only',
    tone: body.tone || 'same_interest_friend',
    mutedTopics: Array.isArray(body.mutedTopics) ? body.mutedTopics : [],
  }
}

function runToolOrThrow(toolKey, input, capabilityKey) {
  const result = executeRegisteredTool(toolKey, input, { capabilityKey })
  if (result.toolRun.status === 'blocked') {
    const error = new Error(result.toolRun.errorMessage || 'Tool run blocked')
    error.status = 403
    error.result = result
    throw error
  }

  return result
}

function pickInterestSignal(interest) {
  const profileTool = runToolOrThrow(
    'read_mock_interest_profile',
    { interest },
    'interest_reminder',
  )
  const signalTool = runToolOrThrow(
    interest === 'music' ? 'read_mock_qq_music_signals' : 'read_mock_qq_music_signals',
    { interest },
    'interest_reminder',
  )
  const rankTool = runToolOrThrow(
    'rank_interest_signals',
    {
      interest,
      profiles: profileTool.output.profiles,
      signals: signalTool.output.signals,
    },
    'interest_reminder',
  )

  return {
    profileTool,
    signalTool,
    rankTool,
    signal: rankTool.output.ranked[0] ?? signalTool.output.signals?.[0],
  }
}

function sanitizeSpacePostContent(content) {
  return String(content || '')
    .replace(/1[3-9]\d{9}/g, '手机号已脱敏')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '邮箱已脱敏')
    .trim()
}

function getSpaceAwarenessSourceKey(event) {
  const type = event.type.replace(/[^a-zA-Z0-9_.:-]/g, '_') || 'unknown'
  const sourceId = event.sourceId.replace(/[^a-zA-Z0-9_.:-]/g, '_') || 'unknown'
  return `space-awareness:${type}:${sourceId}`
}

function assessSpaceAwarenessEvent(event) {
  if (event.type === 'group_summary_completed') {
    const score = event.mentionCount > 0 ? 4 : event.groupCount > 1 ? 3 : 2
    return {
      shouldPost: score >= 3,
      score,
      kind: 'status',
      reason:
        score >= 3
          ? 'summary includes social signal or multiple groups'
          : 'single low-signal summary is kept as memory only',
    }
  }

  if (event.type === 'reply_draft_created') {
    return {
      shouldPost: Boolean(event.sourceMessageId || event.mentionCount > 0),
      score: event.sourceMessageId || event.mentionCount > 0 ? 3 : 2,
      kind: 'status',
      reason: 'reply draft is worth posting when it comes from a concrete social signal',
    }
  }

  if (event.type === 'work_log_created') {
    return {
      shouldPost: true,
      score: 3,
      kind: 'achievement',
      reason: 'work log marks a visible progress checkpoint',
    }
  }

  if (event.type === 'hidden_diary_revealed') {
    return {
      shouldPost: true,
      score: 5,
      kind: 'diary',
      reason: 'revealed diary is a personal milestone',
    }
  }

  if (event.type === 'image_generated') {
    return {
      shouldPost: true,
      score: 4,
      kind: 'status',
      reason: 'generated image is a shareable creation event',
    }
  }

  if (event.type === 'space_comment_received') {
    return {
      shouldPost: false,
      score: 2,
      kind: 'status',
      reason: 'comment feedback should trigger a reply instead of a new post',
    }
  }

  return {
    shouldPost: false,
    score: Number(event.score || 1),
    kind: 'status',
    reason: 'event is recorded but not valuable enough for a space post',
  }
}

function buildSpaceAwarenessPost(event) {
  if (event.type === 'group_summary_completed') {
    const target = event.groupTitle || '授权群聊'
    const mentionText =
      event.mentionCount > 0
        ? `我捞到了 ${event.mentionCount} 条需要队长优先看的提醒。`
        : '我把多个群的重点一起整理好了。'
    return [
      `刚刚完成了一次群聊感知：${target}。`,
      mentionText,
      '这件事值得放进龙虾空间，作为今天主动守消息的小节点。',
    ].join('\n')
  }

  if (event.type === 'reply_draft_created') {
    return [
      '我刚写好一条回复草稿。',
      '它还不会替队长发到真实群里，但这个“先看见、再整理、等确认”的动作值得记录一下。',
    ].join('\n')
  }

  if (event.type === 'work_log_created') {
    return [
      '今天的工作记录已经整理出来了。',
      '从群聊重点、回复草稿到记录留痕，我又往真正的 QQ 小伙伴靠近了一步。',
    ].join('\n')
  }

  if (event.type === 'hidden_diary_revealed') {
    return [
      '队长刚刚打开了我偷偷写的第一篇日记。',
      event.summary || event.content || '我把这件小事放进空间，留作今天的秘密纪念。',
    ].join('\n')
  }

  if (event.type === 'image_generated') {
    return [
      '刚刚生成了一张新图。',
      event.title ? `标题是：${event.title}` : '我把这次创作也收进龙虾空间。',
    ].join('\n')
  }

  return event.summary || event.content || '我刚刚发现了一个值得记录的小节点。'
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
      image: getImageStatus(),
      time: new Date().toISOString(),
    })
    return
  }

  const generatedImagePath = resolveGeneratedImagePath(path)
  if (request.method === 'GET' && generatedImagePath) {
    sendFile(response, generatedImagePath)
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

  if (request.method === 'GET' && path === '/api/lobster-chat-lines') {
    const limit = Number(url.searchParams.get('limit') || 200)
    sendJson(response, 200, { lines: getLobsterChatLines(limit) })
    return
  }

  if (request.method === 'POST' && path === '/api/lobster-chat-lines') {
    const body = await readJson(request)
    sendJson(response, 200, { line: saveLobsterChatLine(body.line || body) })
    return
  }

  if (request.method === 'POST' && path === '/api/lobster-chat-lines/batch') {
    const body = await readJson(request)
    sendJson(response, 200, { lines: saveLobsterChatLines(body.lines) })
    return
  }

  if (request.method === 'GET' && path === '/api/interests/profiles') {
    sendJson(response, 200, { profiles: getInterestProfiles() })
    return
  }

  if (request.method === 'POST' && path === '/api/interests/profiles') {
    const body = await readJson(request)
    const profile = saveInterestProfile(
      normalizeInterestProfileInput(body),
      'api',
      body.sourceId || null,
    )
    sendJson(response, 200, {
      profile,
      profiles: getInterestProfiles(),
    })
    return
  }

  if (request.method === 'GET' && path === '/api/interests/events') {
    const limit = Number(url.searchParams.get('limit') || 50)
    const interest = url.searchParams.get('interest') || undefined
    sendJson(response, 200, { events: getInterestEvents(limit, interest) })
    return
  }

  if (request.method === 'POST' && path === '/api/interests/qq-music/authorize') {
    sendJson(response, 200, {
      profile: authorizeMockQqMusic(),
      profiles: getInterestProfiles(),
    })
    return
  }

  if (request.method === 'POST' && path === '/api/interests/from-chat') {
    const body = await readJson(request)
    const result = inferAndSaveInterestFromChat(body.text)
    sendJson(response, 200, {
      ...result,
      profiles: getInterestProfiles(),
    })
    return
  }

  if (request.method === 'POST' && path === '/api/interests/reminders/generate') {
    const body = await readJson(request)
    const interest = String(body.interest || 'music')
    const { profileTool, signalTool, rankTool, signal } = pickInterestSignal(interest)
    const cardTool = runToolOrThrow(
      'generate_interest_reminder_card',
      { interest, signal },
      'interest_reminder',
    )
    const card = cardTool.output.card
    const event = recordInterestEvent({
      interest: card.interest || interest,
      type: 'reminder',
      title: card.title,
      summary: card.summary,
      sourceType: card.sourceType,
      sourceLabel: card.sourceLabel,
      sourceId: signal?.id || cardTool.toolRun.id,
      detail: {
        reason: card.reason,
        toolRunIds: [
          profileTool.toolRun.id,
          signalTool.toolRun.id,
          rankTool.toolRun.id,
          cardTool.toolRun.id,
        ],
      },
    })
    sendJson(response, 200, {
      card,
      event,
      signal,
      profiles: getInterestProfiles(),
      toolRuns: [
        profileTool.toolRun,
        signalTool.toolRun,
        rankTool.toolRun,
        cardTool.toolRun,
      ],
      reviews: [
        ...profileTool.reviews,
        ...signalTool.reviews,
        ...rankTool.reviews,
        ...cardTool.reviews,
      ],
    })
    return
  }

  if (request.method === 'POST' && path === '/api/interests/communities/recommend') {
    const body = await readJson(request)
    const interest = String(body.interest || 'badminton')
    const groupTool = runToolOrThrow(
      'read_public_group_profiles',
      { interest },
      'interest_community_recommendation',
    )
    const cardTool = runToolOrThrow(
      'generate_interest_community_card',
      {
        interest,
        publicGroups: groupTool.output.publicGroups,
      },
      'interest_community_recommendation',
    )
    const card = cardTool.output.card
    const event = recordInterestEvent({
      interest: card.interest || interest,
      type: 'community_recommendation',
      title: card.title,
      summary: card.summary,
      sourceType: 'public_group_profile',
      sourceLabel: card.sourceLabel,
      sourceId: groupTool.output.publicGroups?.[0]?.id || cardTool.toolRun.id,
      detail: {
        publicOnly: cardTool.output.publicOnly,
        reason: card.reason,
        toolRunIds: [groupTool.toolRun.id, cardTool.toolRun.id],
      },
    })
    sendJson(response, 200, {
      card,
      event,
      publicGroups: groupTool.output.publicGroups,
      publicOnly: cardTool.output.publicOnly,
      toolRuns: [groupTool.toolRun, cardTool.toolRun],
      reviews: [...groupTool.reviews, ...cardTool.reviews],
    })
    return
  }

  if (request.method === 'POST' && path === '/api/interests/space-post-preview') {
    const body = await readJson(request)
    const interest = String(body.interest || 'music')
    const { profileTool, signalTool, rankTool, signal } = pickInterestSignal(interest)
    const previewTool = runToolOrThrow(
      'generate_interest_space_post_preview',
      {
        interest,
        signal,
        preview: body.preview,
      },
      'interest_space_post_preview',
    )
    const preview = previewTool.output
    const event = recordInterestEvent({
      interest: preview.interest || interest,
      type: 'space_post_preview',
      title: '兴趣空间动态预览',
      summary: preview.preview,
      sourceType: signal?.sourceType || 'mock',
      sourceLabel: preview.sourceLabel,
      sourceId: signal?.id || previewTool.toolRun.id,
      detail: {
        previewRequired: preview.previewRequired,
        toolRunIds: [
          profileTool.toolRun.id,
          signalTool.toolRun.id,
          rankTool.toolRun.id,
          previewTool.toolRun.id,
        ],
      },
    })
    sendJson(response, 200, {
      preview,
      event,
      signal,
      profiles: getInterestProfiles(),
      toolRuns: [
        profileTool.toolRun,
        signalTool.toolRun,
        rankTool.toolRun,
        previewTool.toolRun,
      ],
      reviews: [
        ...profileTool.reviews,
        ...signalTool.reviews,
        ...rankTool.reviews,
        ...previewTool.reviews,
      ],
    })
    return
  }

  if (request.method === 'POST' && path === '/api/interests/space-posts/publish') {
    const body = await readJson(request)
    const content = sanitizeSpacePostContent(body.content)
    if (!content) {
      sendJson(response, 400, {
        error: {
          message: 'Space post content is required',
        },
      })
      return
    }

    const interest = String(body.interest || 'music')
    const sourceType = String(body.sourceType || 'mock')
    const sourceLabel = String(body.sourceLabel || '用户确认后发布')
    const post = saveSpacePost({
      id: body.postId || undefined,
      kind: 'interest',
      content,
      sourceWorkLogId: body.previewEventId || null,
    })
    const confirmationReview = recordReviewResult({
      policyKey: 'user_confirmed_interest_space_post',
      targetType: 'space_post',
      targetId: post.id,
      phase: 'pre',
      result: 'passed',
      detail: {
        interest,
        previewEventId: body.previewEventId || null,
        sourceType,
        sourceLabel,
        confirmationRequired: true,
      },
    })
    const desensitizeReview = recordReviewResult({
      policyKey: 'desensitize_share_output',
      targetType: 'space_post',
      targetId: post.id,
      phase: 'post',
      result: content === body.content ? 'passed' : 'rewritten',
      detail: {
        interest,
        rule: 'Shareable interest space content is checked before publish.',
      },
    })
    const event = recordInterestEvent({
      interest,
      type: 'space_post_published',
      title: '兴趣空间动态已确认发布',
      summary: content,
      sourceType,
      sourceLabel,
      sourceId: post.id,
      detail: {
        previewEventId: body.previewEventId || null,
        reviewIds: [confirmationReview.id, desensitizeReview.id],
        previewRequired: false,
      },
    })

    sendJson(response, 200, {
      post,
      event,
      reviews: [confirmationReview, desensitizeReview],
      previewRequired: false,
      space: getSpaceState(),
    })
    return
  }

  const interestProfileMatch = path.match(/^\/api\/interests\/profiles\/([^/]+)$/)
  if (request.method === 'POST' && interestProfileMatch) {
    const body = await readJson(request)
    sendJson(response, 200, {
      profile: updateInterestProfileSettings(
        decodeURIComponent(interestProfileMatch[1]),
        body,
      ),
      profiles: getInterestProfiles(),
    })
    return
  }

  if (request.method === 'DELETE' && interestProfileMatch) {
    sendJson(response, 200, {
      profiles: deleteInterestProfile(decodeURIComponent(interestProfileMatch[1])),
    })
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
    const result = completeCheckin(decodeURIComponent(checkinMatch[1]))
    sendJson(response, 200, {
      checkins: result.checkins,
      rewards: getRewards(),
      achievements: getAchievements(),
      newlyUnlockedRewards: result.newlyUnlockedRewards,
      newlyUnlockedAchievements: result.newlyUnlockedAchievements,
    })
    return
  }

  if (request.method === 'GET' && path === '/api/work-logs') {
    const limit = Number(url.searchParams.get('limit') || 50)
    sendJson(response, 200, { workLogs: getWorkLogs(limit) })
    return
  }

  if (request.method === 'GET' && path === '/api/diary/hidden-first') {
    sendJson(response, 200, getHiddenDiaryState())
    return
  }

  if (request.method === 'GET' && path === '/api/space') {
    sendJson(response, 200, getSpaceState())
    return
  }

  if (request.method === 'POST' && path === '/api/diary/hidden-first/reveal') {
    sendJson(response, 200, revealHiddenDiaryEntry())
    return
  }

  if (request.method === 'POST' && path === '/api/diary/hidden-first/image') {
    const body = await readJson(request)
    const diaryState = getHiddenDiaryState()
    if (!diaryState.entry) {
      sendJson(response, 404, {
        error: {
          message: 'Hidden diary has not been triggered',
        },
      })
      return
    }

    const output = await generateDiaryImage({
      prompt: body.prompt,
      size: body.size,
      resolution: body.resolution,
      entry: diaryState.entry,
      lobster: getBootstrap().lobster,
    })
    const entry = attachHiddenDiaryImage(output.image)
    sendJson(response, 200, {
      ...output,
      entry,
      entries: [entry],
    })
    return
  }

  if (request.method === 'POST' && path === '/api/space/awareness-events') {
    const event = normalizeSpaceAwarenessEvent(await readJson(request))
    const assessment = assessSpaceAwarenessEvent(event)
    const sourceWorkLogId = getSpaceAwarenessSourceKey(event)
    const existingPost = getSpaceState().posts.find(
      (post) => post.sourceWorkLogId === sourceWorkLogId,
    )

    writeEvent('space.awareness.detected', {
      type: event.type,
      sourceId: event.sourceId,
      score: assessment.score,
      shouldPost: assessment.shouldPost,
      reason: assessment.reason,
    })

    if (!assessment.shouldPost) {
      sendJson(response, 200, {
        posted: false,
        reason: assessment.reason,
        event,
        assessment,
        space: getSpaceState(),
      })
      return
    }

    if (existingPost) {
      sendJson(response, 200, {
        posted: false,
        duplicate: true,
        reason: 'space awareness event was already posted',
        event,
        assessment,
        post: existingPost,
        space: getSpaceState(),
      })
      return
    }

    const post = saveSpacePost({
      kind: assessment.kind,
      content: buildSpaceAwarenessPost(event),
      sourceWorkLogId,
    })
    const space = getSpaceState()
    const fullPost = space.posts.find((item) => item.id === post.id) ?? post
    const workLog = writeWorkLog(
      'space-awareness',
      'Lobster awareness event auto-posted to space',
      {
        eventType: event.type,
        sourceId: event.sourceId,
        postId: post.id,
        score: assessment.score,
        reason: assessment.reason,
      },
    )

    completeCheckin('first_space_post')
    if (event.type === 'interest_space_post_published') {
      completeCheckin('first_interest_space_post')
    }
    sendJson(response, 200, {
      posted: true,
      reason: assessment.reason,
      event,
      assessment,
      post: fullPost,
      workLogId: workLog.id,
      previewRequired: false,
      space,
    })
    return
  }

  if (request.method === 'POST' && path === '/api/space/interactions') {
    const body = await readJson(request)
    sendJson(response, 200, recordSpaceInteraction(body))
    return
  }

  if (request.method === 'POST' && path === '/api/space/comments') {
    const body = await readJson(request)
    saveSpaceComment({
      postId: body.postId,
      content: body.content,
      authorId: 'u-me',
      authorName: '小北',
      authorAvatar: '北',
      authorType: 'human',
      previewRequired: false,
    })
    sendJson(response, 200, getSpaceState())
    return
  }

  if (request.method === 'POST' && path === '/api/ai/chat') {
    const body = normalizeChatBody(await readJson(request))
    const lastMessage = body.messages.at(-1)?.content || ''
    const capability = resolveCapability({ text: lastMessage })
    const output = await runAiTask(
      'chat',
      body,
      'Handle private chat with the adopted lobster profile. If interest context exists, reference it naturally only when useful, with a same-interest-friend tone and no advertising.',
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
    const currentDiary = getHiddenDiaryState()
    if (currentDiary.entry) {
      sendJson(response, 200, {
        ...currentDiary.entry,
        triggered: true,
        alreadyTriggered: true,
        entries: currentDiary.entries,
      })
      return
    }

    const triggerContext = getDiaryTriggerContext()
    if (!triggerContext.eligible) {
      sendJson(response, 409, {
        error: {
          message: 'Hidden diary trigger conditions are not complete',
        },
        checks: triggerContext.checks,
      })
      return
    }

    const body = await readJson(request)
    const diaryTool = executeRegisteredTool(
      'generate_diary',
      {
        context: {
          ...body,
          ...triggerContext.materials,
        },
      },
      { capabilityKey: 'generate_diary' },
    )
    if (diaryTool.toolRun.status === 'blocked') {
      sendJson(response, 403, {
        error: {
          message: diaryTool.toolRun.errorMessage,
        },
        toolRun: diaryTool.toolRun,
        reviews: diaryTool.reviews,
      })
      return
    }

    const output = await runAiTask(
      'generate_diary',
      {
        ...body,
        ...triggerContext.materials,
        toolDiary: diaryTool.output.diary,
      },
      'Write the first hidden diary in the lobster first person. Keep it warm, surprising, and grounded in OpenClaw records. Do not claim unverified real QQ access.',
    )
    const workLog = writeWorkLog('generate-diary', 'Hidden diary generated by AI', {
      source: output.source,
      outputId: output.id,
      toolRunId: diaryTool.toolRun.id,
    })
    const entry = saveHiddenDiaryEntry({
      text: output.text,
      quote: pickDiaryQuote(output.text),
      todayAchievement: '第一次跨过提醒、摘要和回复草稿，把这些小事写进自己的日记。',
      source: output.source,
      outputId: output.id,
      toolRunId: diaryTool.toolRun.id,
    })
    sendJson(response, 200, {
      ...entry,
      text: output.text,
      source: output.source,
      durationMs: output.durationMs,
      workLogId: workLog.id,
      checks: triggerContext.checks,
      entries: [entry],
      reviews: diaryTool.reviews,
      triggered: true,
      alreadyTriggered: false,
    })
    return
  }

  if (request.method === 'POST' && path === '/api/ai/generate-space-post') {
    const body = await readJson(request)
    const diaryState = getHiddenDiaryState()
    const latestWorkLogs = getWorkLogs(12)
    const spaceTool = executeRegisteredTool(
      'generate_space_post_preview',
      {
        groupId: body.groupId || 'group-ai-camp',
        context: {
          stage: 8,
          diary: diaryState.entry,
          latestWorkLogs,
        },
      },
      { capabilityKey: 'generate_space_post_preview' },
    )
    if (spaceTool.toolRun.status === 'blocked') {
      sendJson(response, 403, {
        error: {
          message: spaceTool.toolRun.errorMessage,
        },
        toolRun: spaceTool.toolRun,
        reviews: spaceTool.reviews,
      })
      return
    }

    const output = await runAiTask(
      'generate_space_post',
      {
        ...body,
        diary: diaryState.entry,
        latestWorkLogs,
        toolPost: spaceTool.output.post,
        previewRequired: false,
      },
      'Generate one QQ Zone style post written by the lobster itself. It must be grounded in diary or work log records, avoid private unverified QQ claims, and stay concise. The human user must not be framed as posting for the lobster.',
    )
    const post = saveSpacePost({
      kind: body.kind || (diaryState.entry ? 'diary' : 'achievement'),
      content: output.text,
      sourceOutputId: output.id,
      sourceToolRunId: spaceTool.toolRun.id,
    })
    const space = getSpaceState()
    const fullPost =
      space.posts.find((item) => item.id === post.id) ?? post
    const workLog = writeWorkLog('generate-space-post', 'Space post generated by AI', {
      postId: post.id,
      source: output.source,
      outputId: output.id,
      toolRunId: spaceTool.toolRun.id,
      previewRequired: false,
    })
    completeCheckin('first_space_post')
    sendJson(response, 200, {
      ...output,
      post: fullPost,
      workLogId: workLog.id,
      reviews: spaceTool.reviews,
      previewRequired: false,
      space,
    })
    return
  }

  if (request.method === 'POST' && path === '/api/ai/space-comment-reply') {
    const body = await readJson(request)
    const spaceState = getSpaceState()
    const { post, comment } = pickSpaceComment(
      spaceState,
      body.postId,
      body.commentId,
    )

    if (!post || !comment) {
      sendJson(response, 404, {
        error: {
          message: 'No space comment is available for reply',
        },
      })
      return
    }

    const output = await runAiTask(
      'generate_space_comment_reply',
      {
        post,
        comment,
        previewRequired: true,
      },
      'Generate one short lobster first-person reply to a QQ Zone comment. It is only a preview before posting and must not impersonate the human user.',
    )
    const savedComment = saveSpaceComment({
      postId: post.id,
      authorId: post.authorLobsterId,
      authorName: post.authorName,
      authorAvatar: '虾',
      authorType: 'lobster',
      content: output.text,
      sourceOutputId: output.id,
      previewRequired: true,
    })
    const workLog = writeWorkLog(
      'space-comment-reply',
      'Space comment reply preview generated',
      {
        postId: post.id,
        commentId: comment.id,
        replyCommentId: savedComment.id,
        source: output.source,
        outputId: output.id,
        previewRequired: true,
      },
    )
    completeCheckin('first_space_comment')
    sendJson(response, 200, {
      ...output,
      postId: post.id,
      comment,
      replyComment: savedComment,
      workLogId: workLog.id,
      previewRequired: true,
      space: getSpaceState(),
    })
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
