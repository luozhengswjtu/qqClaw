import type {
  Achievement,
  GroupPermissionScope,
  Interest,
  InterestNarrativeCard,
  InterestProfile,
  LobsterChatContext,
  LobsterImageAsset,
  LobsterChatLine,
  LobsterProfile,
  LobsterReward,
  LobsterDiaryEntry,
  LobsterSpaceComment,
  LobsterSpacePost,
  Personality,
  QQMessage,
  WorkLogEntry,
} from '../types'

export interface OpenClawAdoptionInput {
  lobsterName: string
  userCallsign: string
  personality: Personality
  interests: Interest[]
}

export interface OpenClawAiOutput {
  id: string
  text: string
  source: 'real-ai' | 'mock-fallback'
  durationMs: number
}

export interface OpenClawGroupSummaryOutput extends OpenClawAiOutput {
  groupId: string
  messages: QQMessage[]
  mentions: QQMessage[]
  sourceMessageIds: string[]
  readToolRunId?: string
}

export interface OpenClawReplyDraftOutput extends OpenClawAiOutput {
  groupId: string
  draft: string
  sourceMessage: QQMessage | null
  sourceMessageIds: string[]
  previewRequired: true
  toolRunId?: string
}

export interface OpenClawWorkLogOutput extends OpenClawAiOutput {
  workLogId?: string
  latestWorkLogs: WorkLogEntry[]
}

export interface OpenClawDiaryState {
  eligible: boolean
  canTrigger: boolean
  checks: Array<{
    key: string
    passed: boolean
  }>
  triggered: boolean
  revealed: boolean
  unlocked: boolean
  entry: LobsterDiaryEntry | null
  entries: LobsterDiaryEntry[]
}

export interface OpenClawDiaryOutput extends LobsterDiaryEntry {
  durationMs?: number
  workLogId?: string
  checks?: OpenClawDiaryState['checks']
  entries: LobsterDiaryEntry[]
  triggered: boolean
  alreadyTriggered: boolean
}

export interface OpenClawDiaryImageOutput {
  image: LobsterImageAsset
  entry: LobsterDiaryEntry
  entries: LobsterDiaryEntry[]
  source: 'real-ai' | 'mock-fallback'
  durationMs: number
}

export interface OpenClawSpaceState {
  owner: OpenClawLobsterProfile | null
  posts: LobsterSpacePost[]
}

export interface OpenClawReviewResult {
  id: string
  policyKey: string
  targetType: string
  targetId?: string | null
  phase: string
  result: string
  detail: Record<string, unknown>
  createdAt: string
}

export interface OpenClawSpacePostOutput extends OpenClawAiOutput {
  post: LobsterSpacePost
  workLogId?: string
  previewRequired: boolean
  space: OpenClawSpaceState
}

export interface OpenClawSpaceCommentReplyOutput extends OpenClawAiOutput {
  postId: string
  comment: LobsterSpaceComment
  replyComment: LobsterSpaceComment
  workLogId?: string
  previewRequired: true
  space: OpenClawSpaceState
}

export interface OpenClawSpaceAwarenessEventInput {
  type:
    | 'group_summary_completed'
    | 'reply_draft_created'
    | 'work_log_created'
    | 'hidden_diary_revealed'
    | 'image_generated'
    | 'space_comment_received'
    | 'interest_music_signal'
    | 'interest_space_post_published'
  sourceId?: string
  outputId?: string
  workLogId?: string
  interest?: Interest
  groupId?: string
  groupTitle?: string
  groupCount?: number
  mentionCount?: number
  sourceMessageId?: string
  postId?: string
  commentId?: string
  title?: string
  summary?: string
  content?: string
}

export interface OpenClawSpaceAwarenessOutput {
  posted: boolean
  duplicate?: boolean
  reason: string
  assessment: {
    shouldPost: boolean
    score: number
    kind: LobsterSpacePost['kind']
    reason: string
  }
  post?: LobsterSpacePost
  workLogId?: string
  previewRequired?: false
  space: OpenClawSpaceState
}

export interface OpenClawInterestEvent {
  id: string
  interest: Interest
  type: string
  title: string
  summary: string
  sourceType: string
  sourceLabel: string
  sourceId?: string | null
  detail: Record<string, unknown>
  createdAt: string
}

export interface OpenClawInterestReminderOutput {
  card: InterestNarrativeCard
  event: OpenClawInterestEvent
  signal?: Record<string, unknown>
  profiles: InterestProfile[]
}

export interface OpenClawInterestCommunityOutput {
  card: InterestNarrativeCard
  event: OpenClawInterestEvent
  publicGroups: unknown[]
  publicOnly: boolean
}

export interface OpenClawInterestSpacePostPreviewOutput {
  preview: {
    interest: Interest
    preview: string
    sourceLabel: string
    sourceType?: InterestNarrativeCard['sourceType']
    previewRequired: true
    blockedActions?: string[]
  }
  event: OpenClawInterestEvent
  signal?: Record<string, unknown>
  profiles: InterestProfile[]
}

export interface OpenClawInterestSpacePostPublishOutput {
  post: LobsterSpacePost
  event: OpenClawInterestEvent
  reviews: OpenClawReviewResult[]
  space: OpenClawSpaceState
  previewRequired: false
}

export interface OpenClawLobsterProfile extends LobsterProfile {
  adoptedAt?: string | null
  updatedAt?: string
  userId?: string
}

export interface OpenClawCheckInCompleteOutput {
  checkins: OpenClawBootstrap['checkins']
  rewards: LobsterReward[]
  achievements: Achievement[]
  newlyUnlockedRewards?: LobsterReward[]
  newlyUnlockedAchievements?: Achievement[]
}

interface OpenClawBootstrap {
  lobster: OpenClawLobsterProfile | null
  permissions: GroupPermissionScope[]
  checkins: Array<{
    key: string
    status: 'locked' | 'active' | 'done'
  }>
  rewards: LobsterReward[]
  achievements: Achievement[]
  messages: QQMessage[]
  lobsterChatLines?: LobsterChatLine[]
  diary?: OpenClawDiaryState
  space?: OpenClawSpaceState
  interestProfiles?: InterestProfile[]
  agent: OpenClawAgentRegistry
}

export interface OpenClawAgentRegistry {
  capabilities: Array<{
    key: string
    title: string
    enabled: boolean
    riskLevel: string
    outputType: string
  }>
  tools: Array<{
    key: string
    title: string
    riskLevel: string
    requiresConfirmation: boolean
    hasMock: boolean
  }>
  reviewPolicies: Array<{
    key: string
    phase: string
    action: string
    enabled: boolean
  }>
  memories: Array<{
    id: string
    layer: string
    key: string
  }>
}

const baseURL = import.meta.env.VITE_OPENCLAW_API_URL || '/openclaw'

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${baseURL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`OpenClaw request failed: ${response.status}`)
  }

  return (await response.json()) as T
}

export const openclawClient = {
  bootstrap() {
    return requestJson<OpenClawBootstrap>('/api/bootstrap')
  },

  resetDemoState() {
    return requestJson<OpenClawBootstrap>('/api/demo/reset', {
      method: 'POST',
    })
  },

  saveAdoption(input: OpenClawAdoptionInput) {
    return requestJson<{
      lobster: LobsterProfile
      checkins: OpenClawBootstrap['checkins']
      rewards: LobsterReward[]
      achievements: Achievement[]
    }>('/api/adoption', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  completeCheckIn(key: string) {
    return requestJson<OpenClawCheckInCompleteOutput>(
      `/api/checkins/${encodeURIComponent(key)}/complete`,
      {
        method: 'POST',
      },
    )
  },

  chat(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    context?: LobsterChatContext,
  ) {
    return requestJson<OpenClawAiOutput>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, context }),
    })
  },

  savePermissions(input: GroupPermissionScope) {
    return requestJson<{
      permission: GroupPermissionScope
      permissions: GroupPermissionScope[]
    }>('/api/permissions', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  lobsterChatLines(limit = 200) {
    return requestJson<{ lines: LobsterChatLine[] }>(
      `/api/lobster-chat-lines?limit=${encodeURIComponent(String(limit))}`,
    )
  },

  saveLobsterChatLine(line: LobsterChatLine) {
    return requestJson<{ line: LobsterChatLine }>('/api/lobster-chat-lines', {
      method: 'POST',
      body: JSON.stringify({ line }),
    })
  },

  saveLobsterChatLines(lines: LobsterChatLine[]) {
    return requestJson<{ lines: LobsterChatLine[] }>(
      '/api/lobster-chat-lines/batch',
      {
        method: 'POST',
        body: JSON.stringify({ lines }),
      },
    )
  },

  interestProfiles() {
    return requestJson<{ profiles: InterestProfile[] }>('/api/interests/profiles')
  },

  saveInterestProfile(input: Partial<InterestProfile> & { interest: Interest }) {
    return requestJson<{
      profile: InterestProfile
      profiles: InterestProfile[]
    }>('/api/interests/profiles', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  interestEvents(input: { interest?: Interest; limit?: number } = {}) {
    const params = new URLSearchParams()
    if (input.interest) {
      params.set('interest', input.interest)
    }
    if (input.limit) {
      params.set('limit', String(input.limit))
    }

    const suffix = params.toString() ? `?${params.toString()}` : ''
    return requestJson<{ events: OpenClawInterestEvent[] }>(
      `/api/interests/events${suffix}`,
    )
  },

  authorizeMockQqMusic() {
    return requestJson<{
      profile: InterestProfile
      profiles: InterestProfile[]
    }>('/api/interests/qq-music/authorize', {
      method: 'POST',
    })
  },

  saveInterestFromChat(text: string) {
    return requestJson<{
      status: 'none' | 'saved' | 'needs_confirmation'
      reason?: string
      evidenceText?: string
      receipt?: string
      profile?: InterestProfile
      profiles: InterestProfile[]
    }>('/api/interests/from-chat', {
      method: 'POST',
      body: JSON.stringify({ text }),
    })
  },

  generateInterestReminder(interest: Interest = 'music') {
    return requestJson<OpenClawInterestReminderOutput>(
      '/api/interests/reminders/generate',
      {
        method: 'POST',
        body: JSON.stringify({ interest }),
      },
    )
  },

  recommendInterestCommunity(interest: Interest = 'badminton') {
    return requestJson<OpenClawInterestCommunityOutput>(
      '/api/interests/communities/recommend',
      {
        method: 'POST',
        body: JSON.stringify({ interest }),
      },
    )
  },

  generateInterestSpacePostPreview(interest: Interest = 'music') {
    return requestJson<OpenClawInterestSpacePostPreviewOutput>(
      '/api/interests/space-post-preview',
      {
        method: 'POST',
        body: JSON.stringify({ interest }),
      },
    )
  },

  publishInterestSpacePost(input: {
    previewEventId?: string
    postId?: string
    interest?: Interest
    content: string
    sourceLabel?: string
    sourceType?: string
  }) {
    return requestJson<OpenClawInterestSpacePostPublishOutput>(
      '/api/interests/space-posts/publish',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    )
  },

  updateInterestProfile(
    interest: Interest,
    input: {
      enabled?: boolean
      topics?: string[]
      city?: string
      reminderFrequency?: InterestProfile['reminderFrequency']
      mutedTopics?: string[]
    },
  ) {
    return requestJson<{
      profile: InterestProfile
      profiles: InterestProfile[]
    }>(`/api/interests/profiles/${encodeURIComponent(interest)}`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  deleteInterestProfile(interest: Interest) {
    return requestJson<{ profiles: InterestProfile[] }>(
      `/api/interests/profiles/${encodeURIComponent(interest)}`,
      {
        method: 'DELETE',
      },
    )
  },

  summarizeGroup(groupId: string) {
    return requestJson<OpenClawGroupSummaryOutput>('/api/ai/summarize-group', {
      method: 'POST',
      body: JSON.stringify({ groupId }),
    })
  },

  replyDraft(input: { groupId: string; sourceMessageId?: string }) {
    return requestJson<OpenClawReplyDraftOutput>('/api/ai/reply-draft', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  generateWorkLog(input: {
    limit?: number
    context?: Record<string, unknown>
  } = {}) {
    return requestJson<OpenClawWorkLogOutput>('/api/ai/generate-work-log', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  hiddenDiaryState() {
    return requestJson<OpenClawDiaryState>('/api/diary/hidden-first')
  },

  generateDiary(input: Record<string, unknown> = {}) {
    return requestJson<OpenClawDiaryOutput>('/api/ai/generate-diary', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  revealHiddenDiary() {
    return requestJson<OpenClawDiaryState>('/api/diary/hidden-first/reveal', {
      method: 'POST',
    })
  },

  generateDiaryImage(input: { prompt?: string; size?: string } = {}) {
    return requestJson<OpenClawDiaryImageOutput>(
      '/api/diary/hidden-first/image',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    )
  },

  spaceState() {
    return requestJson<OpenClawSpaceState>('/api/space')
  },

  generateSpacePost(input: Record<string, unknown> = {}) {
    return requestJson<OpenClawSpacePostOutput>('/api/ai/generate-space-post', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  recordSpaceAwarenessEvent(input: OpenClawSpaceAwarenessEventInput) {
    return requestJson<OpenClawSpaceAwarenessOutput>(
      '/api/space/awareness-events',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    )
  },

  recordSpaceInteraction(input: {
    postId: string
    type: 'like' | 'share'
    detail?: Record<string, unknown>
  }) {
    return requestJson<OpenClawSpaceState>('/api/space/interactions', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  addSpaceComment(input: { postId: string; content: string }) {
    return requestJson<OpenClawSpaceState>('/api/space/comments', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  replyToSpaceComment(input: { postId: string; commentId?: string }) {
    return requestJson<OpenClawSpaceCommentReplyOutput>(
      '/api/ai/space-comment-reply',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    )
  },

  agentRegistry() {
    return requestJson<OpenClawAgentRegistry>('/api/agent/registry')
  },
}
