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

export type CheckInStatus = 'locked' | 'active' | 'done'

export type CardType =
  | 'mention'
  | 'summary'
  | 'reply_draft'
  | 'work_log'
  | 'diary'
  | 'achievement'
  | 'space_post'

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
  kind: 'diary' | 'achievement' | 'status'
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

export type LobsterChatContext = SummaryCardFollowUpContext

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
      type: 'space_post_card'
      post: LobsterSpacePost
      previewRequired: boolean
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

export interface Achievement {
  id: string
  title: string
  description: string
  unlockedAt?: string
}

export interface LobsterReward {
  id: string
  title: string
  description: string
  requiredCheckIns: number
  unlocked: boolean
  unlockedAt?: string | null
}
