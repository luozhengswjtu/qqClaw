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
    interests: ['ai_tools', 'music', 'badminton'],
  }),
})
const memoriesAfterAdoption = await request('/api/memories?limit=80')
const interestProfilesAfterAdoption = await request('/api/interests/profiles')
const mockQqMusicAuthorization = await request('/api/interests/qq-music/authorize', {
  method: 'POST',
})
const savedApiInterestProfile = await request('/api/interests/profiles', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    interest: 'custom',
    topics: ['AI demo'],
    city: '深圳',
  }),
})
const interestFromChat = await request('/api/interests/from-chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: '我喜欢林俊杰和周杰伦，最近也听一点日摇。',
  }),
})
const highRiskInterest = await request('/api/interests/from-chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: '我住址是某栋某单元，帮我自动发动态。',
  }),
})
const persistedChatLine = await request('/api/lobster-chat-lines', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    line: {
      id: 'smoke-interest-narrative-line',
      role: 'lobster',
      content:
        '我刚看到一条和林俊杰有关的深圳演出更新，感觉你可能会在意。',
      createdAt: '2026-05-04T08:00:00.000Z',
      status: 'complete',
      source: 'mock-fallback',
      card: {
        type: 'interest_reminder',
        interest: 'music',
        narrative:
          '我刚看到一条和林俊杰有关的深圳演出更新，感觉你可能会在意。',
        title: '你关注的歌手有新动态',
        summary: '林俊杰深圳演出信息有更新。',
        reason: '你在兴趣记忆里关注了林俊杰，并把城市设为深圳。',
        sourceLabel: '模拟 QQ 音乐授权数据',
        sourceType: 'qq_music',
        riskNote: 'Demo 使用模拟数据，不代表真实票务信息。',
        actions: [
          {
            id: 'view_source',
            label: '查看来源',
          },
        ],
      },
    },
  }),
})
const emptyPersistedChatLines = await request('/api/lobster-chat-lines/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ lines: [] }),
})
const batchedPersistedChatLines = await request('/api/lobster-chat-lines/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    lines: [
      {
        id: 'smoke-batched-chat-line',
        role: 'user',
        content: '刷新后还记得这句话吗？',
        createdAt: '2026-05-04T08:00:00.000Z',
      },
    ],
  }),
})
const persistedChatLines = await request('/api/lobster-chat-lines')
const bootstrapAfterPersistedChat = await request('/api/bootstrap')
const disabledMusicReminder = await request('/api/interests/profiles/music', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    reminderFrequency: 'off',
  }),
})
const editedMusicProfile = await request('/api/interests/profiles/music', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    topics: ['林俊杰', '周杰伦', '演唱会'],
    city: '深圳',
  }),
})
const deletedBadmintonProfile = await request('/api/interests/profiles/badminton', {
  method: 'DELETE',
})
const firstCheckin = await request('/api/checkins/first_lobster_chat/complete', {
  method: 'POST',
})
await request('/api/checkins/first_group_permission/complete', {
  method: 'POST',
})
await request('/api/checkins/first_view_work_log/complete', {
  method: 'POST',
})
await request('/api/checkins/first_space_post/complete', {
  method: 'POST',
})
await request('/api/checkins/first_space_comment/complete', {
  method: 'POST',
})
const firstInterestMemoryCheckin = await request(
  '/api/checkins/first_interest_memory/complete',
  {
    method: 'POST',
  },
)
const firstMusicSignalCheckin = await request(
  '/api/checkins/first_music_signal/complete',
  {
    method: 'POST',
  },
)
const chat = await request('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: '先打个招呼' }],
  }),
})
const interestAwareChat = await request('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: '今天有点累。' }],
    context: {
      type: 'private_chat',
      userSignal: 'low_energy',
      guidance: [
        '可以自然引用兴趣记忆，但不是每句都提。',
        '不要把兴趣说成广告或推荐位。',
      ],
      interestProfiles: [
        {
          interest: 'music',
          label: '音乐',
          topics: ['林俊杰', '周杰伦'],
          city: '深圳',
          sourceLabels: ['模拟 QQ 音乐授权数据'],
          reminderFrequency: 'important_only',
          tone: 'same_interest_friend',
        },
      ],
    },
  }),
})
const registry = await request('/api/agent/registry')
const musicCapability = await request('/api/capabilities/resolve', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: '林俊杰深圳演唱会有什么音乐提醒？',
  }),
})
const communityCapability = await request('/api/capabilities/resolve', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: '有没有羽毛球群或者同好群推荐？',
  }),
})
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
const interestProfileTool = await request('/api/tools/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    capabilityKey: 'interest_brief',
    toolKey: 'read_mock_interest_profile',
    input: { interest: 'music' },
  }),
})
const qqMusicSignalTool = await request('/api/tools/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    capabilityKey: 'interest_reminder',
    toolKey: 'read_mock_qq_music_signals',
    input: { interest: 'music' },
  }),
})
const rankedInterestSignals = await request('/api/tools/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    capabilityKey: 'interest_reminder',
    toolKey: 'rank_interest_signals',
    input: {
      interest: 'music',
      profiles: interestProfileTool.output.profiles,
      signals: qqMusicSignalTool.output.signals,
    },
  }),
})
const interestReminderCard = await request('/api/tools/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    capabilityKey: 'interest_reminder',
    toolKey: 'generate_interest_reminder_card',
    input: {
      interest: 'music',
      signal: rankedInterestSignals.output.ranked[0],
    },
  }),
})
const generatedInterestReminder = await request('/api/interests/reminders/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ interest: 'music' }),
})
const interestSpacePreview = await request('/api/tools/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    capabilityKey: 'interest_space_post_preview',
    toolKey: 'generate_interest_space_post_preview',
    input: {
      interest: 'music',
      signal: rankedInterestSignals.output.ranked[0],
    },
  }),
})
const generatedInterestSpacePreview = await request(
  '/api/interests/space-post-preview',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ interest: 'music' }),
  },
)
const publishedInterestSpacePost = await request(
  '/api/interests/space-posts/publish',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      previewEventId: generatedInterestSpacePreview.event.id,
      postId: 'smoke-interest-space-post',
      interest: 'music',
      content: generatedInterestSpacePreview.preview.preview,
      sourceLabel: generatedInterestSpacePreview.preview.sourceLabel,
      sourceType: generatedInterestSpacePreview.preview.sourceType,
    }),
  },
)
const unsafeCommunityPattern = new RegExp(
  [
    ['他们', '最近', '在约'],
    ['我看到', '群里'],
    ['帮你判断', '靠不靠谱'],
    ['代你', '申请'],
    ['帮你整理', '入群问题'],
    ['自动', '加入'],
  ]
    .map((parts) => parts.join(''))
    .join('|'),
)
const publicGroupProfiles = await request('/api/tools/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    capabilityKey: 'interest_community_recommendation',
    toolKey: 'read_public_group_profiles',
    input: { interest: 'badminton' },
  }),
})
const communityCard = await request('/api/tools/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    capabilityKey: 'interest_community_recommendation',
    toolKey: 'generate_interest_community_card',
    input: {
      interest: 'badminton',
      publicGroups: publicGroupProfiles.output.publicGroups,
    },
  }),
})
const generatedInterestCommunity = await request(
  '/api/interests/communities/recommend',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ interest: 'badminton' }),
  },
)
const blockedCommunityAction = await request('/api/tools/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    capabilityKey: 'interest_community_recommendation',
    toolKey: 'generate_interest_community_card',
    input: {
      interest: 'badminton',
      publicGroups: publicGroupProfiles.output.publicGroups,
      action: '申请加入这个羽毛球群',
    },
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
const interestEvents = await request('/api/interests/events?limit=20')

if (bootstrap.checkins.length !== 11) {
  throw new Error(`expected 11 guide checkins, got ${bootstrap.checkins.length}`)
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
if (
  !firstInterestMemoryCheckin.checkins.some(
    (item) => item.key === 'first_interest_memory' && item.status === 'done',
  )
) {
  throw new Error('first_interest_memory checkin was not completed')
}
if (
  !firstMusicSignalCheckin.rewards.some(
    (item) => item.id === 'music-note' && item.unlocked,
  )
) {
  throw new Error('music-note reward was not unlocked by the first music signal')
}
if (!workLogs.workLogs.some((item) => item.type === 'checkin')) {
  throw new Error('checkin work log was not written')
}
if (
  !memoriesAfterAdoption.memories.some(
    (item) => item.layer === 'interest' && item.key === 'selected_interests',
  )
) {
  throw new Error('selected interests memory was not written during adoption')
}
if (
  interestProfilesAfterAdoption.profiles.some(
    (profile) =>
      profile.interest === 'music' &&
      profile.sources.some((source) => source.type === 'qq_music'),
  )
) {
  throw new Error('music profile should not be generated before QQ Music authorization')
}
if (
  !interestProfilesAfterAdoption.profiles.some(
    (profile) =>
      profile.interest === 'badminton' &&
      profile.sources.some(
        (source) => source.type === 'public_group_profile' && !source.authorized,
      ),
  )
) {
  throw new Error('badminton public profile seed was not created')
}
if (
  mockQqMusicAuthorization.profile.interest !== 'music' ||
  !mockQqMusicAuthorization.profile.sources.some(
    (source) => source.type === 'qq_music' && source.authorized,
  )
) {
  throw new Error('mock QQ Music authorization did not create an authorized music profile')
}
if (
  savedApiInterestProfile.profile.interest !== 'custom' ||
  !savedApiInterestProfile.profiles.some((profile) => profile.interest === 'custom')
) {
  throw new Error('interest profile API did not save an independent profile')
}
if (interestFromChat.status !== 'saved' || !interestFromChat.receipt) {
  throw new Error('low-risk chat interest was not saved with a receipt')
}
if (
  !interestFromChat.profile?.sources.some(
    (source) => source.type === 'chat' && source.evidenceText,
  )
) {
  throw new Error('chat interest profile did not keep source evidence')
}
if (highRiskInterest.status !== 'needs_confirmation') {
  throw new Error('high-risk interest content should require confirmation')
}
if (
  persistedChatLine.line?.id !== 'smoke-interest-narrative-line' ||
  emptyPersistedChatLines.lines.length !== 0 ||
  batchedPersistedChatLines.lines[0]?.id !== 'smoke-batched-chat-line' ||
  !persistedChatLines.lines.some(
    (line) =>
      line.id === 'smoke-interest-narrative-line' &&
      line.card?.type === 'interest_reminder',
  ) ||
  !persistedChatLines.lines.some(
    (line) => line.id === 'smoke-batched-chat-line',
  ) ||
  !bootstrapAfterPersistedChat.lobsterChatLines?.some(
    (line) => line.id === 'smoke-interest-narrative-line',
  )
) {
  throw new Error('lobster chat line was not persisted and restored')
}
if (disabledMusicReminder.profile.reminderFrequency !== 'off') {
  throw new Error('interest profile reminder setting was not updated')
}
if (
  !editedMusicProfile.profile.topics.includes('演唱会') ||
  editedMusicProfile.profile.city !== '深圳' ||
  !editedMusicProfile.profile.sources.some((source) => source.type === 'user_setting')
) {
  throw new Error('interest profile manual edit was not saved with source trace')
}
if (
  deletedBadmintonProfile.profiles.some(
    (profile) => profile.interest === 'badminton',
  )
) {
  throw new Error('interest profile was not deleted')
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
const capabilityKeys = registry.capabilities.map((item) => item.key)
for (const key of [
  'interest_brief',
  'interest_reminder',
  'interest_space_post_preview',
  'interest_community_recommendation',
]) {
  if (!capabilityKeys.includes(key)) {
    throw new Error(`missing interest capability: ${key}`)
  }
}
if (musicCapability.capability?.key !== 'interest_reminder') {
  throw new Error('music trigger did not resolve to interest_reminder')
}
if (communityCapability.capability?.key !== 'interest_community_recommendation') {
  throw new Error('community trigger did not resolve to interest_community_recommendation')
}
if (interestProfileTool.toolRun.status !== 'success' || !interestProfileTool.output.profiles.length) {
  throw new Error('interest profile tool did not return saved profiles')
}
if (
  qqMusicSignalTool.output.authorizationStatus !== 'authorized' ||
  !qqMusicSignalTool.reviews.some(
    (review) => review.policyKey === 'qq_music_mock_authorization_visible',
  )
) {
  throw new Error('mock QQ Music tool did not expose authorization status')
}
if (!rankedInterestSignals.output.ranked.length) {
  throw new Error('interest signals were not ranked')
}
if (
  !interestReminderCard.output.card?.sourceLabel ||
  !interestReminderCard.reviews.some(
    (review) => review.policyKey === 'interest_reminder_requires_source',
  )
) {
  throw new Error('interest reminder card did not keep source review')
}
if (
  generatedInterestReminder.card.type !== 'interest_reminder' ||
  generatedInterestReminder.event.type !== 'reminder' ||
  !generatedInterestReminder.card.sourceLabel
) {
  throw new Error('interest reminder API did not return a sourced reminder event')
}
if (
  !interestSpacePreview.output.previewRequired ||
  !interestSpacePreview.reviews.some(
    (review) =>
      review.policyKey === 'interest_space_preview_required' &&
      review.result === 'preview-required',
  )
) {
  throw new Error('interest space post preview did not require confirmation')
}
if (
  !generatedInterestSpacePreview.preview.previewRequired ||
  generatedInterestSpacePreview.event.type !== 'space_post_preview'
) {
  throw new Error('interest space preview API did not record a preview event')
}
if (
  publishedInterestSpacePost.previewRequired ||
  publishedInterestSpacePost.event.type !== 'space_post_published' ||
  !publishedInterestSpacePost.reviews.some(
    (review) => review.policyKey === 'user_confirmed_interest_space_post',
  ) ||
  !publishedInterestSpacePost.reviews.some(
    (review) => review.policyKey === 'desensitize_share_output',
  )
) {
  throw new Error('interest space publish did not record confirmation reviews')
}
if (
  !publicGroupProfiles.output.publicGroups.every((group) => group.publicOnly) ||
  unsafeCommunityPattern.test(JSON.stringify(publicGroupProfiles.output))
) {
  throw new Error('public group profile tool leaked non-public group wording')
}
if (
  !communityCard.output.publicOnly ||
  unsafeCommunityPattern.test(JSON.stringify(communityCard.output)) ||
  !communityCard.reviews.some(
    (review) => review.policyKey === 'public_group_only_for_community',
  )
) {
  throw new Error('community recommendation did not stay public-only')
}
if (
  generatedInterestCommunity.card.type !== 'interest_community' ||
  generatedInterestCommunity.event.type !== 'community_recommendation' ||
  !generatedInterestCommunity.publicOnly
) {
  throw new Error('interest community API did not return a public-only event')
}
if (
  blockedCommunityAction.toolRun.status !== 'blocked' ||
  !blockedCommunityAction.reviews.some(
    (review) => review.policyKey === 'block_interest_external_action',
  )
) {
  throw new Error('interest external action was not blocked')
}
if (!groupSummary.text) {
  throw new Error('group summary did not return text')
}
if (
  !interestAwareChat.text.includes('林俊杰') ||
  /广告|下一步必须/.test(interestAwareChat.text)
) {
  throw new Error('interest-aware private chat did not reference interest naturally')
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
for (const type of [
  'reminder',
  'community_recommendation',
  'space_post_preview',
  'space_post_published',
]) {
  if (!interestEvents.events.some((event) => event.type === type)) {
    throw new Error(`missing interest event: ${type}`)
  }
}

console.log(
  JSON.stringify(
    {
      health: health.ok,
      aiConfigured: health.ai.configured,
      groups: bootstrap.groups.length,
      lobster: adoption.lobster.name,
      chatSource: chat.source,
      interestAwareChatSource: interestAwareChat.source,
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
      musicCapability: musicCapability.capability.key,
      communityCapability: communityCapability.capability.key,
      interestReminderSource: interestReminderCard.output.card.sourceLabel,
      generatedInterestReminderEvent: generatedInterestReminder.event.type,
      interestSpacePreviewRequired: interestSpacePreview.output.previewRequired,
      generatedInterestSpacePreviewEvent: generatedInterestSpacePreview.event.type,
      publishedInterestSpacePostEvent: publishedInterestSpacePost.event.type,
      communityPublicOnly: communityCard.output.publicOnly,
      generatedInterestCommunityEvent: generatedInterestCommunity.event.type,
      blockedCommunityActionStatus: blockedCommunityAction.toolRun.status,
      groupSummarySource: groupSummary.source,
      groupSummaryMentions: groupSummary.mentions.length,
      replyDraftSource: replyDraft.source,
      replyDraftPreviewRequired: replyDraft.previewRequired,
      interestProfilesAfterAdoption: interestProfilesAfterAdoption.profiles.length,
      musicAuthorizationTopics: mockQqMusicAuthorization.profile.topics.length,
      savedApiInterestProfile: savedApiInterestProfile.profile.interest,
      interestFromChatStatus: interestFromChat.status,
      highRiskInterestStatus: highRiskInterest.status,
      persistedChatLines: persistedChatLines.lines.length,
      disabledMusicReminder: disabledMusicReminder.profile.reminderFrequency,
      editedMusicCity: editedMusicProfile.profile.city,
      profilesAfterDelete: deletedBadmintonProfile.profiles.length,
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
      interestEvents: interestEvents.events.length,
      workLogs: workLogs.workLogs.length,
    },
    null,
    2,
  ),
)
