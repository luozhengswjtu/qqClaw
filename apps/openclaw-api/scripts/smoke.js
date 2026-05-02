const baseURL = process.env.OPENCLAW_BASE_URL || 'http://127.0.0.1:8787'

async function request(path, options) {
  const response = await fetch(`${baseURL}${path}`, options)
  const json = await response.json()
  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${JSON.stringify(json)}`)
  }
  return json
}

const health = await request('/health')
const bootstrap = await request('/api/bootstrap')
const adoption = await request('/api/adoption', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    lobsterName: '小钳',
    userCallsign: '队长',
    personality: 'quiet_observer',
    interests: ['ai_tools'],
  }),
})
const firstCheckin = await request('/api/checkins/first_lobster_chat/complete', {
  method: 'POST',
})
const chat = await request('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: '先打个招呼' }],
  }),
})
const registry = await request('/api/agent/registry')
const blockedTool = await request('/api/tools/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    capabilityKey: 'summarize_group',
    toolKey: 'read_mock_group_messages',
    input: { groupId: 'group-class' },
  }),
})
const blockedMentionSignal = await request('/api/tools/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    capabilityKey: 'summarize_group',
    toolKey: 'collect_mentions',
    input: { groupId: 'group-ai-camp' },
  }),
})
await request('/api/permissions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    groupId: 'group-ai-camp',
    collectMentions: true,
    summarizeGroup: true,
    draftReply: true,
    diaryMaterial: false,
  }),
})
const mentionSignalTool = await request('/api/tools/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    capabilityKey: 'summarize_group',
    toolKey: 'collect_mentions',
    input: { groupId: 'group-ai-camp' },
  }),
})
const successfulTool = await request('/api/tools/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    capabilityKey: 'summarize_group',
    toolKey: 'read_mock_group_messages',
    input: { groupId: 'group-ai-camp' },
  }),
})
const groupSummary = await request('/api/ai/summarize-group', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    groupId: 'group-ai-camp',
  }),
})
const replyDraft = await request('/api/ai/reply-draft', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    groupId: 'group-ai-camp',
    sourceMessageId: 'm-002',
  }),
})
const generatedWorkLog = await request('/api/ai/generate-work-log', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    limit: 8,
    context: {
      stage: 6,
      cardTypes: ['summary_card', 'reply_draft_card', 'work_log_card'],
    },
  }),
})
const reviewResults = await request('/api/review-results?limit=10')
const memories = await request('/api/memories?limit=10')
const workLogs = await request('/api/work-logs?limit=20')

if (bootstrap.checkins.length !== 10) {
  throw new Error(`expected 10 guide checkins, got ${bootstrap.checkins.length}`)
}
if (
  !firstCheckin.checkins.some(
    (item) => item.key === 'first_group_permission' && item.status === 'active',
  )
) {
  throw new Error('first_group_permission was not unlocked after first chat')
}
if (!firstCheckin.rewards.some((item) => item.id === 'tiny-flag' && item.unlocked)) {
  throw new Error('tiny-flag reward was not unlocked')
}
if (!workLogs.workLogs.some((item) => item.type === 'checkin')) {
  throw new Error('checkin work log was not written')
}
if (blockedMentionSignal.toolRun.status !== 'blocked') {
  throw new Error('mention signal extraction should be blocked before permission grant')
}
if (mentionSignalTool.toolRun.status !== 'success') {
  throw new Error('mention signal extraction did not succeed after permission grant')
}
if (mentionSignalTool.output.mentions.length < 1) {
  throw new Error('mention signal extraction did not return mention messages')
}
if (!mentionSignalTool.output.card.sourceMessageIds.includes('m-002')) {
  throw new Error('mention signal output did not include the source message id')
}
if (!groupSummary.text) {
  throw new Error('group summary did not return text')
}
if (groupSummary.mentions.length < 1) {
  throw new Error('group summary did not include mention signals')
}
if (!groupSummary.sourceMessageIds.includes('m-002')) {
  throw new Error('group summary did not include the mention source message id')
}
if (!workLogs.workLogs.some((item) => item.type === 'permissions')) {
  throw new Error('permission work log was not written')
}
if (!replyDraft.draft) {
  throw new Error('reply draft did not return draft text')
}
if (!replyDraft.previewRequired) {
  throw new Error('reply draft must require preview confirmation')
}
if (!replyDraft.sourceMessageIds.includes('m-002')) {
  throw new Error('reply draft did not keep its source message id')
}
if (!generatedWorkLog.text) {
  throw new Error('generated work log did not return text')
}
if (!generatedWorkLog.latestWorkLogs.length) {
  throw new Error('generated work log did not return latest work logs')
}

console.log(
  JSON.stringify(
    {
      health: health.ok,
      aiConfigured: health.ai.configured,
      groups: bootstrap.groups.length,
      lobster: adoption.lobster.name,
      chatSource: chat.source,
      checkins: bootstrap.checkins.length,
      activeAfterFirstCheckin: firstCheckin.checkins.find(
        (item) => item.status === 'active',
      )?.key,
      unlockedRewards: firstCheckin.rewards.filter((item) => item.unlocked).length,
      capabilities: registry.capabilities.length,
      tools: registry.tools.length,
      blockedToolStatus: blockedTool.toolRun.status,
      blockedMentionSignalStatus: blockedMentionSignal.toolRun.status,
      mentionSignalToolStatus: mentionSignalTool.toolRun.status,
      mentionSignals: mentionSignalTool.output.mentions.length,
      successfulToolStatus: successfulTool.toolRun.status,
      groupSummarySource: groupSummary.source,
      groupSummaryMentions: groupSummary.mentions.length,
      replyDraftSource: replyDraft.source,
      replyDraftPreviewRequired: replyDraft.previewRequired,
      generatedWorkLogSource: generatedWorkLog.source,
      reviewResults: reviewResults.reviewResults.length,
      memories: memories.memories.length,
      workLogs: workLogs.workLogs.length,
    },
    null,
    2,
  ),
)
