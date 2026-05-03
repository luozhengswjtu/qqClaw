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
const autoSpaceFromWorkLog = await request('/api/space/awareness-events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'work_log_created',
    sourceId: generatedWorkLog.workLogId,
    outputId: generatedWorkLog.id,
    workLogId: generatedWorkLog.workLogId,
    title: '工作记录',
    summary: generatedWorkLog.text,
  }),
})
const autoSpaceDuplicate = await request('/api/space/awareness-events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'work_log_created',
    sourceId: generatedWorkLog.workLogId,
    outputId: generatedWorkLog.id,
    workLogId: generatedWorkLog.workLogId,
    title: '工作记录',
    summary: generatedWorkLog.text,
  }),
})
const hiddenDiaryBefore = await request('/api/diary/hidden-first')
const hiddenDiary = await request('/api/ai/generate-diary', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    stage: 7,
    trigger: 'hidden_first_diary',
  }),
})
const hiddenDiaryAfter = await request('/api/diary/hidden-first')
const hiddenDiaryRepeat = await request('/api/ai/generate-diary', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    stage: 7,
    trigger: 'hidden_first_diary',
  }),
})
const hiddenDiaryReveal = await request('/api/diary/hidden-first/reveal', {
  method: 'POST',
})
const hiddenDiaryImage = await request('/api/diary/hidden-first/image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({}),
})
const spacePost = await request('/api/ai/generate-space-post', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    kind: 'diary',
  }),
})
const spaceBeforeInteractions = await request('/api/space')
const firstSpacePost = spacePost.post
const likedSpace = await request('/api/space/interactions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    postId: firstSpacePost.id,
    type: 'like',
  }),
})
const commentedSpace = await request('/api/space/comments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    postId: firstSpacePost.id,
    content: '我来小龙虾空间留个脚印。',
  }),
})
const sharedSpace = await request('/api/space/interactions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    postId: firstSpacePost.id,
    type: 'share',
    detail: {
      channel: 'qq-space-card',
    },
  }),
})
const friendComment =
  commentedSpace.posts
    .find((post) => post.id === firstSpacePost.id)
    ?.comments.find((comment) => comment.authorType === 'friend') ??
  commentedSpace.posts.find((post) => post.id === firstSpacePost.id)?.comments[0]
const spaceCommentReply = await request('/api/ai/space-comment-reply', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    postId: firstSpacePost.id,
    commentId: friendComment?.id,
  }),
})
const spaceAfterReply = await request('/api/space')
const reviewResults = await request('/api/review-results?limit=10')
const memories = await request('/api/memories?limit=10')
const workLogs = await request('/api/work-logs?limit=80')

if (bootstrap.checkins.length !== 5) {
  throw new Error(`expected 5 guide checkins, got ${bootstrap.checkins.length}`)
}
if (
  !firstCheckin.checkins.some(
    (item) =>
      item.key === 'first_group_permission' &&
      ['active', 'done'].includes(item.status),
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
if (!['blocked', 'success'].includes(blockedMentionSignal.toolRun.status)) {
  throw new Error('mention signal extraction returned an unexpected status')
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
if (!hiddenDiaryBefore.canTrigger && !hiddenDiaryBefore.triggered) {
  throw new Error('hidden diary should be triggerable after stage 7 prerequisites')
}
if (!hiddenDiary.text || !hiddenDiary.quote || !hiddenDiary.todayAchievement) {
  throw new Error('hidden diary did not return diary card fields')
}
if (!hiddenDiaryAfter.triggered || hiddenDiaryAfter.canTrigger) {
  throw new Error('hidden diary state did not persist first trigger')
}
if (!hiddenDiaryRepeat.alreadyTriggered) {
  throw new Error('hidden diary should not regenerate after first trigger')
}
if (!hiddenDiaryReveal.revealed || !hiddenDiaryReveal.unlocked) {
  throw new Error('hidden diary reveal did not unlock diary entry')
}
if (!hiddenDiaryImage.image?.url || !hiddenDiaryImage.entry?.image?.url) {
  throw new Error('hidden diary image generation did not return an image url')
}
if (!autoSpaceFromWorkLog.posted || !autoSpaceFromWorkLog.post) {
  throw new Error('space awareness did not auto-post a valuable work log event')
}
if (!autoSpaceDuplicate.duplicate || autoSpaceDuplicate.posted) {
  throw new Error('space awareness did not dedupe the same event')
}
if (!spacePost.post || spacePost.previewRequired) {
  throw new Error('space post generation did not return an auto-published local post')
}
if (spacePost.post.authorLobsterId !== 'lobster-xiaoqian') {
  throw new Error('space post must be authored by the lobster')
}
if (!spaceBeforeInteractions.posts.some((post) => post.kind === 'diary')) {
  throw new Error('space did not include the generated diary post')
}
if (!spaceBeforeInteractions.posts.some((post) => post.kind === 'achievement')) {
  throw new Error('space did not include the seeded achievement post')
}
const likedPost = likedSpace.posts.find((post) => post.id === firstSpacePost.id)
if (!likedPost?.likedByMe || likedPost.likeCount < 1) {
  throw new Error('space like interaction was not recorded')
}
const commentedPost = commentedSpace.posts.find((post) => post.id === firstSpacePost.id)
if (!commentedPost?.comments.some((comment) => comment.authorType === 'human')) {
  throw new Error('space human comment was not recorded')
}
const sharedPost = sharedSpace.posts.find((post) => post.id === firstSpacePost.id)
if (!sharedPost || sharedPost.shareCount < 1) {
  throw new Error('space share interaction was not recorded')
}
if (!spaceCommentReply.previewRequired || !spaceCommentReply.replyComment) {
  throw new Error('space comment reply did not stay in preview state')
}
const repliedPost = spaceAfterReply.posts.find((post) => post.id === firstSpacePost.id)
if (!repliedPost?.comments.some((comment) => comment.authorType === 'lobster')) {
  throw new Error('lobster comment reply was not recorded under the space post')
}
if (
  !spaceAfterReply.posts.some((post) => post.id === firstSpacePost.id) ||
  !spaceCommentReply.space.posts.length
) {
  throw new Error('space state was not returned after comment reply')
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
      autoSpacePosted: autoSpaceFromWorkLog.posted,
      autoSpaceDuplicate: autoSpaceDuplicate.duplicate,
      hiddenDiarySource: hiddenDiary.source,
      hiddenDiaryTriggered: hiddenDiaryAfter.triggered,
      hiddenDiaryRevealed: hiddenDiaryReveal.revealed,
      hiddenDiaryImageSource: hiddenDiaryImage.source,
      spacePostSource: spacePost.source,
      spacePosts: spaceAfterReply.posts.length,
      spaceFirstPostComments: repliedPost?.comments.length ?? 0,
      spaceLiked: likedPost?.likedByMe ?? false,
      spaceShares: sharedPost?.shareCount ?? 0,
      spaceCommentReplySource: spaceCommentReply.source,
      reviewResults: reviewResults.reviewResults.length,
      memories: memories.memories.length,
      workLogs: workLogs.workLogs.length,
    },
    null,
    2,
  ),
)
