export type ConversationType = 'direct' | 'group'

export type MessageKind = 'text' | 'mention' | 'system' | 'ai_hint'

export type Personality =
  | 'sharp_reliable'
  | 'gentle_companion'
  | 'quiet_observer'
  | 'cool_secretary'
  | 'team_spark'

export type Interest =
  | 'ai_tools'
  | 'course_project'
  | 'game_group'
  | 'campus_event'
  | 'memes'
  | 'music'
  | 'badminton'
  | 'anime'
  | 'custom'

export interface InterestSource {
  id: string
  type:
    | 'mock'
    | 'adoption'
    | 'chat'
    | 'qq_music'
    | 'public_group_profile'
    | 'authorized_qq_group'
    | 'website'
    | 'event_platform'
    | 'user_setting'
    | 'user_feedback'
  title: string
  authorized: boolean
  permissionNote: string
  evidenceText?: string
}

export interface InterestProfile {
  id: string
  interest: Interest
  enabled: boolean
  topics: string[]
  city?: string
  sources: InterestSource[]
  reminderFrequency: 'important_only' | 'daily_digest' | 'weekly_digest' | 'off'
  tone: 'same_interest_friend' | 'brief_assistant'
  mutedTopics: string[]
  updatedAt: string
}

export interface DemoRuntimeState {
  introCompleted: boolean
  introPromptShown: boolean
  qqMusicAuthorizationPromptShown: boolean
  qqMusicAuthorizationLoading: boolean
  musicSkillCardShown: boolean
  musicSkillsInstalling: boolean
  musicSkillsInstalled: boolean
  musicTalkCount: number
  communityRecommendationShown: boolean
  diaryPrewarmStarted: boolean
  diaryRevealPromptShown: boolean
  musicPushSent: boolean
  behaviorPushSent: boolean
  leftChatAt: string | null
  pendingSpaceReplyCount: number
}

export type DemoEvent =
  | {
      type: 'chat.sent'
      content: string
    }
  | {
      type: 'chat.response.completed'
      content?: string
    }
  | {
      type: 'music.authorization.started'
    }
  | {
      type: 'music.authorization.completed'
    }
  | {
      type: 'music.skill.installed'
    }
  | {
      type: 'achievement.unlocked'
      achievementKey?: string
      checkInId?: string
    }
  | {
      type: 'view.left_lobster_chat'
      leftAt?: string
    }
  | {
      type: 'view.entered_lobster_chat'
    }
  | {
      type: 'space.comment.created'
      postId: string
      commentId: string
    }

export type CheckInStatus = 'locked' | 'active' | 'done'

export type CardType =
  | 'mention'
  | 'summary'
  | 'reply_draft'
  | 'work_log'
  | 'diary'
  | 'achievement'
  | 'space_post'
  | 'interest_reminder'
  | 'interest_community'

export type LobsterChatStatus =
  | 'generating'
  | 'reviewing'
  | 'complete'
  | 'actionable'
  | 'fallback'
  | 'failed'

export interface GroupPermissionScope {
  groupId: string
  collectMentions: boolean
  summarizeGroup: boolean
  draftReply: boolean
  diaryMaterial?: boolean
  summaryScheduleTime?: string
  updatedAt?: string
}

export interface QQUser {
  id: string
  name: string
  avatar: string
  status: 'online' | 'away' | 'offline'
  signature: string
}

export interface LobsterProfile {
  id: string
  name: string
  userCallsign: string
  personality: Personality
  interests: Interest[]
  mood: 'curious' | 'happy' | 'focused'
  level: number
}

export interface GroupMember {
  id: string
  name: string
  avatar: string
  role: 'owner' | 'admin' | 'member'
  online: boolean
}

export interface QQConversation {
  id: string
  type: ConversationType
  title: string
  avatar: string
  lastMessage: string
  lastAt: string
  unreadCount: number
  pinned?: boolean
  memberCount?: number
}

export interface QQMessage {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  senderAvatar: string
  content: string
  sentAt: string
  kind: MessageKind
  isOwn?: boolean
  sourceLabel?: string
}

export interface WorkLogEntry {
  id: string
  type: string
  title: string
  detail: Record<string, unknown>
  createdAt: string
}

export interface LobsterImageAsset {
  id: string
  type: string
  url: string
  mimeType?: string
  prompt?: string
  source: 'real-ai' | 'mock-fallback' | 'local-fallback'
  provider?: string
  model?: string
  createdAt: string
}

export interface LobsterDiaryEntry {
  id: string
  title: string
  text: string
  quote: string
  todayAchievement: string
  source: 'real-ai' | 'mock-fallback' | 'local-fallback'
  outputId?: string
  toolRunId?: string
  image?: LobsterImageAsset | null
  createdAt: string
  revealedAt?: string | null
}

export interface LobsterSpaceComment {
  id: string
  postId: string
  authorId: string
  authorName: string
  authorAvatar: string
  authorType: 'human' | 'friend' | 'friend_lobster' | 'lobster'
  content: string
  sourceOutputId?: string | null
  sourceToolRunId?: string | null
  previewRequired?: boolean
  createdAt: string
}

export interface LobsterSpacePost {
  id: string
  kind: 'diary' | 'achievement' | 'status' | 'interest'
  authorLobsterId: string
  authorName: string
  content: string
  sourceOutputId?: string | null
  sourceWorkLogId?: string | null
  sourceToolRunId?: string | null
  likeCount: number
  commentCount: number
  shareCount: number
  likedByMe: boolean
  comments: LobsterSpaceComment[]
  createdAt: string
  updatedAt?: string
}

export interface SummaryCardGroup {
  groupId: string
  groupTitle: string
  summary: string
  mentions: QQMessage[]
  sourceMessages: QQMessage[]
  sourceMessageIds: string[]
  outputId?: string
  source: 'real-ai' | 'mock-fallback' | 'local-fallback'
}

export interface SummaryCardFollowUpContext {
  type: 'summary_card_follow_up'
  summaryCard: {
    groupId: string
    groupTitle: string
    summary: string
    source: SummaryCardGroup['source']
    outputId?: string
    sourceMessageIds: string[]
    mentions: Array<Pick<
      QQMessage,
      | 'id'
      | 'conversationId'
      | 'senderName'
      | 'content'
      | 'sentAt'
      | 'kind'
      | 'sourceLabel'
    >>
    sourceMessages: Array<Pick<
      QQMessage,
      | 'id'
      | 'conversationId'
      | 'senderName'
      | 'content'
      | 'sentAt'
      | 'kind'
      | 'sourceLabel'
    >>
  }
}

export interface PrivateChatInterestContext {
  type: 'private_chat'
  interestProfiles: Array<{
    interest: Interest
    label: string
    topics: string[]
    city?: string
    sourceLabels: string[]
    reminderFrequency: InterestProfile['reminderFrequency']
    tone: InterestProfile['tone']
  }>
  userSignal: 'low_energy' | 'interest_related' | 'neutral'
  guidance: string[]
}

export type LobsterChatContext =
  | SummaryCardFollowUpContext
  | PrivateChatInterestContext

export type MusicAuthorizationStatus =
  | 'pending'
  | 'loading'
  | 'authorized'
  | 'declined'

export type InterestCardAction =
  | {
      id: 'view_source'
      label: string
    }
  | {
      id: 'generate_space_post'
      label: string
    }
  | {
      id: 'publish_space_post'
      label: string
    }
  | {
      id: 'favorite'
      label: string
    }
  | {
      id: 'apply_to_join'
      label: string
    }

export interface InterestCommunityCandidate {
  id: string
  title: string
  tags: string[]
  publicIntro: string
  city: string
  sourceLabel: string
  reason: string
  boundary: string
}

export interface InterestNarrativeCard {
  id: string
  type: 'interest_reminder' | 'interest_community'
  interest: Interest
  narrative: string
  title: string
  summary: string
  reason: string
  sourceLabel: string
  sourceType:
    | 'mock'
    | 'chat'
    | 'qq_music'
    | 'public_group_profile'
    | 'authorized_qq_group'
  riskNote: string
  sourceDetail?: string
  community?: InterestCommunityCandidate
  actions: InterestCardAction[]
}

export type LobsterChatCard =
  | {
      type: 'permission_request'
      groupId: string
      groupTitle: string
      selectedGroupIds: string[]
      groupOptions: Array<{
        id: string
        title: string
      }>
      permissions: GroupPermissionScope
      confirmed?: boolean
    }
  | {
      type: 'summary_card'
      groups: SummaryCardGroup[]
    }
  | {
      type: 'reply_draft_card'
      groupId: string
      groupTitle: string
      draft: string
      sourceMessage?: QQMessage | null
      sourceMessageIds: string[]
      outputId?: string
      previewRequired: true
      source: 'real-ai' | 'mock-fallback' | 'local-fallback'
    }
  | {
      type: 'work_log_card'
      title: string
      text: string
      workLogId?: string
      latestWorkLogs: WorkLogEntry[]
      outputId?: string
      source: 'real-ai' | 'mock-fallback' | 'local-fallback'
    }
  | {
      type: 'diary_card'
      entry: LobsterDiaryEntry
    }
  | {
      type: 'music_authorization_card'
      status: MusicAuthorizationStatus
    }
  | {
      type: 'music_skill_suggestion_card'
      title: string
      summary: string
      skills: string[]
      status?: 'idle' | 'installing' | 'installed'
      steps?: string[]
      successMessage?: string
    }
  | {
      type: 'interest_memory_card'
      profile: InterestProfile
      receipt?: string
    }
  | {
      type: 'interest_risk_confirmation_card'
      title: string
      reason: string
      evidenceText: string
    }
  | InterestNarrativeCard
  | {
      type: 'space_post_card'
      post: LobsterSpacePost
      previewRequired: boolean
      interest?: Interest
      sourceLabel?: string
      sourceType?: InterestNarrativeCard['sourceType']
      source: 'real-ai' | 'mock-fallback' | 'local-fallback'
    }

export interface LobsterChatLine {
  id: string
  role: 'user' | 'lobster'
  content: string
  createdAt: string
  status?: LobsterChatStatus
  source?: 'real-ai' | 'mock-fallback'
  outputId?: string
  card?: LobsterChatCard
  suggestions?: LobsterSuggestion[]
}

export interface LobsterSuggestion {
  id: string
  label: string
  action: 'send_message' | 'open_view' | 'run_capability'
  payload?: Record<string, unknown>
}

export interface CheckInItem {
  id: string
  title: string
  description: string
  status: CheckInStatus
  rewardId?: string
}

export interface CapabilityCard {
  id: string
  type: CardType
  title: string
  summary: string
  sourceConversationId?: string
  sourceMessageId?: string
}

export type AchievementStatus = 'locked' | 'unlocked'

export interface Achievement {
  id: string
  title: string
  description: string
  key?: string
  status?: AchievementStatus
  reward?: string
  hidden?: boolean
  hint?: string
  triggerCheckInId?: string
  unlockedAt?: string | null
}

export interface AchievementCatalogItem extends Achievement {
  key: string
  status: AchievementStatus
  reward: string
  hidden: boolean
  hint: string
}

export interface AchievementMoment {
  id: string
  achievementKey: string
  title: string
  description: string
  reward: string
}

export interface LobsterReward {
  id: string
  title: string
  description: string
  requiredCheckIns: number
  requiredCheckInId?: string
  unlocked: boolean
  unlockedAt?: string | null
}
