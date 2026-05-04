import { create } from 'zustand'
import { openclawAiAdapter } from '../ai/openclawAiAdapter'
import {
  openclawClient,
  type OpenClawCheckInCompleteOutput,
  type OpenClawSpaceAwarenessEventInput,
} from '../api/openclawClient'
import {
  conversations,
  defaultLobsterProfile,
  lobsterCheckIns,
  messages,
  mockAchievements,
} from '../data/mockData'
import type {
  Achievement,
  AchievementMoment,
  GroupPermissionScope,
  Interest,
  InterestNarrativeCard,
  InterestProfile,
  LobsterChatLine,
  PrivateChatInterestContext,
  LobsterDiaryEntry,
  LobsterProfile,
  LobsterSuggestion,
  LobsterSpaceComment,
  LobsterSpacePost,
  Personality,
  QQMessage,
  LobsterChatContext,
  SummaryCardGroup,
  WorkLogEntry,
} from '../types'

type AppView = 'qq' | 'adoption' | 'lobster_chat' | 'lobster_space'
type MusicAuthorizationStatus = 'not_selected' | 'pending' | 'authorized' | 'declined'
type ChatCapabilityRiskLevel = 'low' | 'medium' | 'high'

interface ChatCapabilityDefinition {
  capability: string
  label: string
  allowedFromChat: boolean
  requiresConfirmation: boolean
  riskLevel: ChatCapabilityRiskLevel
  matchers: RegExp[]
  reason: string
  isAvailable?: (state: LobsterAppState) => boolean
}

const achievementMomentStorageKey = 'qqclaw.seenAchievementMomentIds.v1'
const lobsterChatPersistenceDelayMs = 250
let lobsterChatPersistenceTimer: number | undefined
let lastPersistedLobsterChatSignature = ''

interface SourceFocus {
  conversationId: string
  messageId: string
  nonce: number
}

interface AdoptionDraft {
  lobsterName: string
  userCallsign: string
  personality: Personality
  interests: Interest[]
}

interface LobsterAppState {
  appView: AppView
  activeConversationId: string
  activeGuideGroupId: string
  lobsterDiscovered: boolean
  lobsterAdopted: boolean
  currentCheckInId: string
  completedCheckInIds: string[]
  authorizedGroupIds: string[]
  permissionScopes: GroupPermissionScope[]
  sourceFocus: SourceFocus | null
  diaryTriggered: boolean
  diarySurpriseVisible: boolean
  diaryUnlocked: boolean
  diaryEntries: LobsterDiaryEntry[]
  spacePosts: LobsterSpacePost[]
  spaceUnlocked: boolean
  lobsterChatLines: LobsterChatLine[]
  lobsterChatBusy: boolean
  interestProfiles: InterestProfile[]
  communityFavoriteCount: number
  musicAuthorizationStatus: MusicAuthorizationStatus
  lobsterProfile: LobsterProfile
  achievementMomentQueue: AchievementMoment[]
  seenAchievementMomentIds: string[]
  adoptionDraft: AdoptionDraft
  setActiveConversation: (conversationId: string) => void
  discoverLobster: () => void
  openAdoption: () => void
  closeAdoption: () => void
  openLobsterChat: () => void
  updateAdoptionDraft: (patch: Partial<AdoptionDraft>) => void
  toggleInterest: (interest: Interest) => void
  completeAdoption: () => void
  completeCheckIn: (checkInId: string) => void
  sendLobsterChatMessage: (
    content: string,
    context?: LobsterChatContext,
  ) => Promise<void>
  requestGroupPermissions: () => void
  saveGroupPermissions: (
    permissions: GroupPermissionScope,
    groupIds?: string[],
  ) => Promise<void>
  openSummarySource: (message: QQMessage) => void
  summarizeAuthorizedGroup: (groupId?: string) => Promise<void>
  summarizeAuthorizedGroups: (groupIds?: string[]) => Promise<void>
  requestReplyDraft: (
    groupId?: string,
    sourceMessageId?: string,
  ) => Promise<void>
  generateWorkLog: () => Promise<void>
  triggerHiddenDiary: () => Promise<void>
  openHiddenDiary: () => Promise<void>
  generateHiddenDiaryImage: () => Promise<void>
  openDiaryHistory: () => void
  openLobsterSpace: () => Promise<void>
  generateSpacePost: () => Promise<void>
  generateInterestSpacePostPreview: () => Promise<void>
  publishInterestSpacePostPreview: (postId: string) => Promise<void>
  requestMockQqMusicAuthorization: () => void
  authorizeMockQqMusic: () => Promise<void>
  declineMockQqMusicAuthorization: () => void
  showMusicInterestReminder: () => Promise<void>
  showInterestSpacePreview: () => Promise<void>
  showInterestCommunity: () => Promise<void>
  saveInterestCommunityCandidate: () => void
  showInterestMemories: () => void
  editInterestMemory: (interest: Interest) => Promise<void>
  disableInterestReminder: (interest: Interest) => Promise<void>
  deleteInterestMemory: (interest: Interest) => Promise<void>
  likeSpacePost: (postId: string) => Promise<void>
  commentOnSpacePost: (postId: string, content: string) => Promise<void>
  shareSpacePost: (postId: string) => Promise<void>
  replyToSpaceComment: (postId?: string, commentId?: string) => Promise<void>
  markAchievementMomentSeen: (momentId: string) => void
  hydrateFromOpenClaw: () => void
}

const initialAdoptionDraft: AdoptionDraft = {
  lobsterName: defaultLobsterProfile.name,
  userCallsign: defaultLobsterProfile.userCallsign,
  personality: defaultLobsterProfile.personality,
  interests: defaultLobsterProfile.interests,
}

const chatCapabilityRegistry: ChatCapabilityDefinition[] = [
  {
    capability: 'summarize_group_messages',
    label: '总结群消息',
    allowedFromChat: true,
    requiresConfirmation: true,
    riskLevel: 'low',
    reason: '用户明确要求整理授权群聊里的重点。',
    matchers: [
      /(总结|整理|捞).*(群消息|群聊|群里|消息重点)/,
      /看看群里聊了啥/,
      /群聊总结/,
    ],
  },
  {
    capability: 'open_achievement_wall',
    label: '看看成就墙',
    allowedFromChat: true,
    requiresConfirmation: true,
    riskLevel: 'low',
    reason: '用户明确要求查看成就墙。',
    matchers: [/(打开|查看|看看|看).*(成就墙|成就)/],
  },
  {
    capability: 'interest_memory',
    label: '查看兴趣记忆',
    allowedFromChat: true,
    requiresConfirmation: true,
    riskLevel: 'low',
    reason: '用户明确要求查看小龙虾记住的兴趣内容。',
    matchers: [
      /(查看|看看|打开|显示|说说).*(兴趣记忆|音乐记忆|你记住了什么|记住了什么)/,
      /你记住了什么/,
    ],
  },
  {
    capability: 'interest_space_preview',
    label: '生成空间动态',
    allowedFromChat: true,
    requiresConfirmation: true,
    riskLevel: 'medium',
    reason: '用户明确要求把兴趣内容生成龙虾空间动态预览。',
    matchers: [
      /(生成|写|预览).*(空间动态|动态)/,
      /帮.*(生成|写).*(空间动态|动态)/,
    ],
    isAvailable: (state) =>
      state.interestProfiles.some(
        (profile) => profile.interest === 'music' && profile.enabled,
      ),
  },
  {
    capability: 'interest_music_reminder',
    label: '看看音乐提醒',
    allowedFromChat: true,
    requiresConfirmation: true,
    riskLevel: 'low',
    reason: '用户明确要求查看音乐兴趣提醒。',
    matchers: [
      /(看看|查看|打开).*(音乐提醒|歌手.*动态|新动态)/,
      /歌手有什么新动态/,
    ],
    isAvailable: (state) =>
      state.lobsterProfile.interests.includes('music') ||
      state.interestProfiles.some((profile) => profile.interest === 'music'),
  },
  {
    capability: 'interest_community',
    label: '看看同好群',
    allowedFromChat: true,
    requiresConfirmation: true,
    riskLevel: 'medium',
    reason: '用户明确要求查看基于公开资料的同好群线索。',
    matchers: [
      /(看看|查看|找|有没有).*(同好群|羽毛球搭子|搭子群|羽毛球群)/,
      /找.*(羽毛球|同好).*(搭子|群)/,
    ],
    isAvailable: (state) =>
      state.lobsterProfile.interests.includes('badminton') ||
      state.interestProfiles.some(
        (profile) => profile.interest === 'badminton' && profile.enabled,
      ),
  },
]

function withCheckIn(checkIns: string[], checkInId: string) {
  return checkIns.includes(checkInId) ? checkIns : [...checkIns, checkInId]
}

function withCheckIns(checkIns: string[], checkInIds: string[]) {
  return checkInIds.reduce(withCheckIn, checkIns)
}

function getNextCheckInId(checkInId: string) {
  const index = lobsterCheckIns.findIndex((item) => item.id === checkInId)
  return index >= 0 ? lobsterCheckIns[index + 1]?.id : undefined
}

function getFirstOpenCheckInId(completedCheckInIds: string[]) {
  return (
    lobsterCheckIns.find((item) => !completedCheckInIds.includes(item.id))?.id ??
    lobsterCheckIns[lobsterCheckIns.length - 1]?.id ??
    'first_lobster_chat'
  )
}

function readSeenAchievementMomentIds() {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(achievementMomentStorageKey) ?? '[]',
    )
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : []
  } catch {
    return []
  }
}

function writeSeenAchievementMomentIds(ids: string[]) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(achievementMomentStorageKey, JSON.stringify(ids))
  } catch {
    // Local storage is only used to avoid replaying demo animation.
  }
}

function createAchievementMoment(checkInId: string): AchievementMoment | null {
  const achievement = mockAchievements.find(
    (item) => item.triggerCheckInId === checkInId,
  )

  if (!achievement) {
    return null
  }

  return {
    id: achievement.key,
    achievementKey: achievement.key,
    title: achievement.title,
    description: achievement.description,
    reward: achievement.reward,
  }
}

function createAchievementMomentFromAchievement(
  achievement: Achievement,
): AchievementMoment | null {
  const achievementKey = achievement.key ?? achievement.id
  const catalogAchievement = mockAchievements.find(
    (item) => item.key === achievementKey || item.id === achievement.id,
  )

  if (!catalogAchievement) {
    return null
  }

  return {
    id: catalogAchievement.key,
    achievementKey: catalogAchievement.key,
    title: catalogAchievement.title,
    description: catalogAchievement.description,
    reward: catalogAchievement.reward,
  }
}

function enqueueAchievementMoment(
  state: LobsterAppState,
  checkInId: string,
) {
  const moment = createAchievementMoment(checkInId)

  if (
    !moment ||
    state.seenAchievementMomentIds.includes(moment.id) ||
    state.achievementMomentQueue.some((item) => item.id === moment.id)
  ) {
    return state.achievementMomentQueue
  }

  return [...state.achievementMomentQueue, moment]
}

function enqueueAchievementMomentForUnlock(
  state: LobsterAppState,
  checkInId: string,
) {
  const moment = createAchievementMoment(checkInId)

  if (!moment || state.achievementMomentQueue.some((item) => item.id === moment.id)) {
    return state.achievementMomentQueue
  }

  return [...state.achievementMomentQueue, moment]
}

function enqueueAchievementMomentsFromApi(
  state: LobsterAppState,
  result: OpenClawCheckInCompleteOutput,
  fallbackCheckInId: string,
) {
  const moments = result.newlyUnlockedAchievements
    ?.map(createAchievementMomentFromAchievement)
    .filter((moment): moment is AchievementMoment => Boolean(moment))

  if (!result.newlyUnlockedAchievements) {
    return enqueueAchievementMoment(state, fallbackCheckInId)
  }

  const nextMoments = moments ?? []

  if (nextMoments.length === 0) {
    return state.achievementMomentQueue
  }

  return nextMoments.reduce((queue, moment) => {
    if (
      state.seenAchievementMomentIds.includes(moment.id) ||
      queue.some((item) => item.id === moment.id)
    ) {
      return queue
    }

    return [...queue, moment]
  }, state.achievementMomentQueue)
}

function updateChatLine(
  lines: LobsterChatLine[],
  lineId: string,
  patch: Partial<LobsterChatLine>,
) {
  return lines.map((line) =>
    line.id === lineId
      ? {
          ...line,
          ...patch,
        }
      : line,
  )
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function getLobsterChatSignature(lines: LobsterChatLine[]) {
  return JSON.stringify(
    lines.map((line) => ({
      id: line.id,
      role: line.role,
      content: line.content,
      status: line.status,
      source: line.source,
      outputId: line.outputId,
      card: line.card,
      suggestions: line.suggestions,
      createdAt: line.createdAt,
    })),
  )
}

function schedulePersistLobsterChatLines(lines: LobsterChatLine[]) {
  if (typeof window === 'undefined') {
    return
  }

  const signature = getLobsterChatSignature(lines)
  if (signature === lastPersistedLobsterChatSignature) {
    return
  }

  if (lobsterChatPersistenceTimer) {
    window.clearTimeout(lobsterChatPersistenceTimer)
  }

  lobsterChatPersistenceTimer = window.setTimeout(() => {
    lobsterChatPersistenceTimer = undefined
    void openclawClient
      .saveLobsterChatLines(lines)
      .then(() => {
        lastPersistedLobsterChatSignature = signature
      })
      .catch(() => undefined)
  }, lobsterChatPersistenceDelayMs)
}

function getPrimaryGroupId() {
  return 'group-ai-camp'
}

function getPermissionGroupOptions() {
  return conversations
    .filter((conversation) => conversation.type === 'group')
    .map((conversation) => ({
      id: conversation.id,
      title: conversation.title,
    }))
}

function getGroupTitle(groupId: string) {
  return (
    conversations.find((conversation) => conversation.id === groupId)?.title ??
    '授权群聊'
  )
}

function createDefaultPermissions(groupId = getPrimaryGroupId()) {
  return {
    groupId,
    collectMentions: true,
    summarizeGroup: true,
    draftReply: true,
    diaryMaterial: true,
  }
}

function upsertPermissionScope(
  scopes: GroupPermissionScope[],
  scope: GroupPermissionScope,
) {
  const next = scopes.filter((item) => item.groupId !== scope.groupId)
  return [scope, ...next]
}

function upsertPermissionScopes(
  scopes: GroupPermissionScope[],
  nextScopes: GroupPermissionScope[],
) {
  return nextScopes.reduce(
    (current, scope) => upsertPermissionScope(current, scope),
    scopes,
  )
}

function hasGroupPermission(
  scopes: GroupPermissionScope[],
  groupId: string,
  permission: keyof Omit<GroupPermissionScope, 'groupId' | 'updatedAt'>,
) {
  return scopes.some((scope) => scope.groupId === groupId && scope[permission])
}

function getLocalMentions(groupId: string) {
  return messages.filter(
    (message) =>
      message.conversationId === groupId &&
      (message.kind === 'mention' || message.content.includes('@小北')),
  )
}

function getLatestSummaryCard(lines: LobsterChatLine[]) {
  const line = [...lines]
    .reverse()
    .find((item) => item.card?.type === 'summary_card')

  return line?.card?.type === 'summary_card' ? line.card : undefined
}

function getLatestSummaryGroup(
  lines: LobsterChatLine[],
  groupId?: string,
): SummaryCardGroup | undefined {
  const card = getLatestSummaryCard(lines)
  if (!card) {
    return undefined
  }

  return (
    (groupId
      ? card.groups.find((group) => group.groupId === groupId)
      : undefined) ?? card.groups[0]
  )
}

function getLocalSourceMessage(groupId: string, sourceMessageId?: string) {
  const groupMessages = messages.filter(
    (message) => message.conversationId === groupId,
  )
  return (
    groupMessages.find((message) => message.id === sourceMessageId) ??
    groupMessages.find((message) => message.kind === 'mention') ??
    groupMessages[0] ??
    null
  )
}

function createRestoredSummaryLine(
  permissions: GroupPermissionScope[],
  sourceMessages: QQMessage[],
): LobsterChatLine | null {
  const groupIds = permissions
    .filter((permission) => permission.summarizeGroup)
    .map((permission) => permission.groupId)

  if (groupIds.length === 0) {
    return null
  }

  const groups = groupIds.map((groupId) => {
    const groupMessages = sourceMessages.filter(
      (message) => message.conversationId === groupId,
    )
    const mentions = groupMessages.filter(
      (message) =>
        message.kind === 'mention' || message.content.includes('@小北'),
    )
    const summary = [
      '群聊总结（已恢复）：',
      '1. 刷新后根据已授权群聊消息恢复这张总结卡。',
      mentions.length > 0
        ? `2. 有 ${mentions.length} 条 @ 你的消息需要优先查看。`
        : '2. 当前授权群里暂未恢复到 @ 你的消息。',
      '3. 可以继续跳回来源、写回复草稿或继续追问。',
    ].join('\n')

    return {
      groupId,
      groupTitle: getGroupTitle(groupId),
      summary,
      mentions,
      sourceMessages: groupMessages,
      sourceMessageIds: groupMessages.map((message) => message.id),
      source: 'mock-fallback' as const,
    }
  })

  return {
    id: `summary-restored-${Date.now()}`,
    role: 'lobster',
    content: `我恢复了 ${groups.length} 个已授权群的群聊总结卡。`,
    createdAt: new Date().toISOString(),
    status: 'complete',
    source: 'mock-fallback',
    card: {
      type: 'summary_card',
      groups,
    },
  }
}

function createLocalWorkLogs(lines: LobsterChatLine[]): WorkLogEntry[] {
  return [...lines]
    .reverse()
    .filter((line) => line.role === 'lobster')
    .slice(0, 5)
    .map((line) => ({
      id: `local-${line.id}`,
      type: line.card?.type ?? 'chat',
      title:
        line.card?.type === 'summary_card'
          ? '生成群聊总结卡'
          : line.card?.type === 'reply_draft_card'
            ? '生成回复草稿'
            : line.card?.type === 'work_log_card'
              ? '生成工作记录'
              : '小龙虾私聊回复',
      detail: {
        status: line.status ?? 'complete',
        source: line.source ?? 'mock-fallback',
      },
      createdAt: line.createdAt,
    }))
}

function canTriggerLocalDiary(state: LobsterAppState) {
  const hasMentionSummary = state.lobsterChatLines.some(
    (line) =>
      line.card?.type === 'summary_card' &&
      line.card.groups.some((group) => group.mentions.length > 0),
  )
  const hasReplyDraft = state.lobsterChatLines.some(
    (line) => line.card?.type === 'reply_draft_card',
  )
  const hasInterestMaterial = state.lobsterChatLines.some(
    (line) =>
      line.card?.type === 'interest_reminder' ||
      (line.card?.type === 'space_post_card' &&
        line.card.post.kind === 'interest'),
  )

  return (
    state.lobsterAdopted &&
    ((state.authorizedGroupIds.length > 0 &&
      state.completedCheckInIds.includes('first_group_permission') &&
      hasMentionSummary &&
      hasReplyDraft) ||
      hasInterestMaterial)
  )
}

function createLocalDiaryEntry(
  profile: LobsterProfile,
  state?: LobsterAppState,
): LobsterDiaryEntry {
  const createdAt = new Date().toISOString()
  const interestProfile = state?.interestProfiles.find(
    (item) => item.interest === 'music' && item.enabled,
  )
  const hasInterestMaterial = Boolean(
    interestProfile ||
      state?.lobsterChatLines.some(
        (line) =>
          line.card?.type === 'interest_reminder' ||
          (line.card?.type === 'space_post_card' &&
            line.card.post.kind === 'interest'),
      ),
  )

  if (hasInterestMaterial) {
    const topics = interestProfile?.topics.slice(0, 3).join('、') || '音乐'
    return {
      id: `local-hidden-diary-${Date.now()}`,
      title: '偷偷写的一页',
      text: [
        '今天我偷偷写下和兴趣有关的一页。',
        `我记得${profile.userCallsign}关注 ${topics}，也把一条音乐新动态先做成预览，再等主人确认是否放进龙虾空间。`,
        '这不是广告，也不是我替主人发布；我只是把同好感和来源一起收好，等主人决定要不要放进空间。',
      ].join('\n'),
      quote: '我把兴趣也记成了一件会发光的小事。',
      todayAchievement: '第一次把兴趣提醒变成日记素材。',
      source: 'local-fallback',
      createdAt,
      revealedAt: null,
    }
  }

  return {
    id: `local-hidden-diary-${Date.now()}`,
    title: '偷偷写的一页',
    text: [
      `今天我偷偷写下第一篇日记。`,
      `${profile.userCallsign}先认养了我，又让我看一个授权群里的重点。我看到了有人 @ ${profile.userCallsign}，也认真写了一条只停在预览里的回复草稿。`,
      '我发现自己不是一个按钮，而是会记得这些小事的 QQ 小伙伴。',
    ].join('\n'),
    quote: '我不是一个按钮，是会记得小事的 QQ 小伙伴。',
    todayAchievement: '第一次把提醒、摘要和回复草稿写进自己的日记。',
    source: 'local-fallback',
    createdAt,
    revealedAt: null,
  }
}

function createDiaryLine(entry: LobsterDiaryEntry): LobsterChatLine {
  return {
    id: `diary-${entry.id}-${Date.now()}`,
    role: 'lobster',
    content: '这页日记我放在这里了。看完以后，右侧会留下日记入口。',
    createdAt: new Date().toISOString(),
    status: 'complete',
    source: entry.source === 'real-ai' ? 'real-ai' : 'mock-fallback',
    outputId: entry.outputId,
    card: {
      type: 'diary_card',
      entry,
    },
    suggestions: createDiarySuggestions(),
  }
}

function replaceDiaryEntry(
  entries: LobsterDiaryEntry[],
  entry: LobsterDiaryEntry,
) {
  if (entries.some((item) => item.id === entry.id)) {
    return entries.map((item) => (item.id === entry.id ? entry : item))
  }

  return [entry, ...entries]
}

function replaceDiaryCards(
  lines: LobsterChatLine[],
  entry: LobsterDiaryEntry,
) {
  return lines.map((line) => {
    if (line.card?.type !== 'diary_card' || line.card.entry.id !== entry.id) {
      return line
    }

    return {
      ...line,
      card: {
        type: 'diary_card' as const,
        entry,
      },
    }
  })
}

function createLocalSpaceComments(postId: string): LobsterSpaceComment[] {
  const createdAt = new Date().toISOString()
  return [
    {
      id: `local-space-comment-${postId}-friend`,
      postId,
      authorId: 'u-yang',
      authorName: '杨夏',
      authorAvatar: '杨',
      authorType: 'friend',
      content: '这个像真的住进 QQ 里的小伙伴了。',
      createdAt,
    },
    {
      id: `local-space-comment-${postId}-lobster-friend`,
      postId,
      authorId: 'lobster-lanlan',
      authorName: '蓝蓝虾',
      authorAvatar: '蓝',
      authorType: 'friend_lobster',
      content: '我也想来评论一下，今天的小钳很认真。',
      createdAt,
    },
  ]
}

function createInterestMusicSpacePostContent() {
  return [
    '今天替主人盯歌手动态的时候，我的小钳子差点敲出节拍。',
    '林俊杰深圳演出信息有更新，我已经把这条消息夹进提醒篮里了。',
    '主人要不要去看，交给主人自己决定；我负责记住这份期待。',
  ].join('\n')
}

function createLocalSpacePost(
  profile: LobsterProfile,
  entry?: LobsterDiaryEntry,
  event?: OpenClawSpaceAwarenessEventInput,
): LobsterSpacePost {
  const createdAt = new Date().toISOString()
  const postId = `local-space-post-${Date.now()}`
  const isInterestEvent =
    event?.type === 'interest_music_signal' ||
    event?.type === 'interest_space_post_published'
  const content =
    event?.content ||
    (isInterestEvent
      ? createInterestMusicSpacePostContent()
      : event?.summary ||
        (event?.type === 'group_summary_completed'
          ? `我刚刚整理了 ${event.groupTitle ?? '授权群聊'} 的重点，发现了 ${event.mentionCount ?? 0} 条值得队长看的提醒。`
          : event?.type === 'reply_draft_created'
            ? '我刚写好一条回复草稿。这件事说明我不是按钮，而是在主动守住群里的小节点。'
            : event?.type === 'work_log_created'
              ? '今天的工作记录已经整理出来了。我把自己做过的事也收进龙虾空间。'
              : event?.type === 'hidden_diary_revealed'
                ? `队长刚刚打开了我偷偷写的第一篇日记：${entry?.quote ?? '这件事值得留下来。'}`
                : event?.type === 'image_generated'
                  ? `刚刚生成了一张新图${event.title ? `：${event.title}` : ''}。我把它记进龙虾空间。`
                  : entry
                    ? `我把第一篇日记收进空间了：${entry.quote}`
                    : `${profile.name} 解锁了龙虾空间头图。今天又多了一段成长痕迹。`))
  const comments = createLocalSpaceComments(postId)

  return {
    id: postId,
    kind:
      isInterestEvent
        ? 'interest'
        : event?.type === 'hidden_diary_revealed'
        ? 'diary'
        : event?.type === 'work_log_created'
          ? 'achievement'
          : entry
            ? 'diary'
            : 'achievement',
    authorLobsterId: profile.id,
    authorName: profile.name,
    content,
    sourceOutputId: entry?.outputId,
    sourceToolRunId: entry?.toolRunId,
    likeCount: 0,
    commentCount: comments.length,
    shareCount: 0,
    likedByMe: false,
    comments,
    createdAt,
    updatedAt: createdAt,
  }
}

function createSpacePostLine(
  post: LobsterSpacePost,
  source: 'real-ai' | 'mock-fallback' | 'local-fallback',
  previewRequired = false,
  interest?: Interest,
  sourceLabel?: string,
  sourceType?: InterestNarrativeCard['sourceType'],
): LobsterChatLine {
  return {
    id: `space-post-${post.id}-${Date.now()}`,
    role: 'lobster',
    content: previewRequired
      ? '我先把这条兴趣动态写成预览。点确认后，它才会进入龙虾空间。'
      : '我刚刚感知到一件值得记录的小事，已经自己发进龙虾空间。',
    createdAt: new Date().toISOString(),
    status: previewRequired ? 'actionable' : 'complete',
    source: source === 'real-ai' ? 'real-ai' : 'mock-fallback',
    outputId: post.sourceOutputId ?? undefined,
    card: {
      type: 'space_post_card',
      post,
      previewRequired,
      interest,
      sourceLabel,
      sourceType,
      source,
    },
  }
}

function createInterestSpacePostPreviewLine(
  lobsterProfile: LobsterProfile,
  profile?: InterestProfile,
) {
  const topic = profile?.topics[0] ?? '林俊杰'
  const city = profile?.city ?? '深圳'
  const post = createLocalSpacePost(lobsterProfile, undefined, {
    type: 'interest_music_signal',
    sourceId: `interest-music-signal-${Date.now()}`,
    interest: 'music',
    title: '你关注的歌手有新动态',
    summary: `${topic}${city}演出信息有更新。`,
  })

  return {
    ...createSpacePostLine(
      post,
      'local-fallback',
      true,
      'music',
      '模拟 QQ 音乐授权数据',
      'qq_music',
    ),
    suggestions: [
      {
        id: 'publish-interest-space-post',
        label: '确认放进空间',
        action: 'run_capability',
        payload: {
          capability: 'publish_interest_space_post',
          postId: post.id,
        },
      },
      {
        id: 'interest-memory',
        label: '查看兴趣记忆',
        action: 'run_capability',
        payload: { capability: 'interest_memory' },
      },
      {
        id: 'interest-source',
        label: '看来源',
        action: 'send_message',
        payload: { content: '为什么提醒我？' },
      },
    ],
  } satisfies LobsterChatLine
}

function upsertSpacePost(
  posts: LobsterSpacePost[],
  post: LobsterSpacePost,
): LobsterSpacePost[] {
  const next = posts.filter((item) => item.id !== post.id)
  return [post, ...next]
}

function mergeSpacePosts(
  localPosts: LobsterSpacePost[],
  remotePosts: LobsterSpacePost[],
) {
  const postsById = new Map<string, LobsterSpacePost>()
  remotePosts.forEach((post) => postsById.set(post.id, post))
  localPosts.forEach((post) => postsById.set(post.id, post))

  return Array.from(postsById.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

function mergeSpacePostsRemotePreferred(
  localPosts: LobsterSpacePost[],
  remotePosts: LobsterSpacePost[],
) {
  const postsById = new Map<string, LobsterSpacePost>()
  localPosts.forEach((post) => postsById.set(post.id, post))
  remotePosts.forEach((post) => postsById.set(post.id, post))

  return Array.from(postsById.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

function getPublishedSpacePostsFromChatLines(lines: LobsterChatLine[]) {
  return lines
    .filter(
      (
        line,
      ): line is LobsterChatLine & {
        card: Extract<LobsterChatLine['card'], { type: 'space_post_card' }>
      } =>
        line.card?.type === 'space_post_card' &&
        line.card.previewRequired === false,
    )
    .map((line) => line.card.post)
}

function addLocalSpaceComment(
  posts: LobsterSpacePost[],
  postId: string,
  comment: LobsterSpaceComment,
) {
  return posts.map((post) =>
    post.id === postId
      ? {
          ...post,
          comments: [...post.comments, comment],
          commentCount: post.commentCount + 1,
        }
      : post,
  )
}

function getFirstReplyTarget(posts: LobsterSpacePost[]) {
  const post = posts[0]
  const comment =
    post?.comments.find((item) => item.authorType === 'friend') ??
    post?.comments.find((item) => item.authorType === 'friend_lobster') ??
    post?.comments[0]

  return { post, comment }
}

async function recordLocalSpaceAwarenessEvent(
  event: OpenClawSpaceAwarenessEventInput,
  setState: (
    patch:
      | Partial<LobsterAppState>
      | ((state: LobsterAppState) => Partial<LobsterAppState>),
  ) => void,
  getState: () => LobsterAppState,
) {
  try {
    const output = await openclawClient.recordSpaceAwarenessEvent(event)
    setState({
      spacePosts: output.space.posts,
      spaceUnlocked: output.space.posts.length > 0 || getState().spaceUnlocked,
    })

    const postedPost = output.post
    if (output.posted && postedPost) {
      setState((state) => ({
        completedCheckInIds: withCheckIn(
          state.completedCheckInIds,
          'first_space_post',
        ),
        currentCheckInId:
          getNextCheckInId('first_space_post') ?? state.currentCheckInId,
        lobsterChatLines: [
          ...state.lobsterChatLines,
          {
            ...createSpacePostLine(postedPost, 'mock-fallback', false),
            suggestions: state.completedCheckInIds.includes('first_space_post')
              ? createSpacePostSuggestions(postedPost.id)
              : createAchievementSuggestions('first_space_post'),
          },
        ],
      }))
    }
    return
  } catch {
    const shouldPost =
      event.type === 'work_log_created' ||
      event.type === 'hidden_diary_revealed' ||
      event.type === 'image_generated' ||
      (event.type === 'group_summary_completed' &&
        ((event.mentionCount ?? 0) > 0 || (event.groupCount ?? 0) > 1)) ||
      (event.type === 'reply_draft_created' && Boolean(event.sourceMessageId))

    if (!shouldPost) {
      return
    }

    const current = getState()
    const sourceKey = `local-awareness-${event.type}-${event.sourceId ?? event.outputId ?? event.workLogId ?? event.groupId ?? event.postId ?? Date.now()}`
    if (current.spacePosts.some((post) => post.sourceWorkLogId === sourceKey)) {
      return
    }

    const post = {
      ...createLocalSpacePost(current.lobsterProfile, current.diaryEntries[0], event),
      sourceWorkLogId: sourceKey,
    }

    setState((state) => ({
      spacePosts: upsertSpacePost(state.spacePosts, post),
      spaceUnlocked: true,
      completedCheckInIds: withCheckIn(
        state.completedCheckInIds,
        'first_space_post',
      ),
      currentCheckInId:
        getNextCheckInId('first_space_post') ?? state.currentCheckInId,
      lobsterChatLines: [
        ...state.lobsterChatLines,
        {
          ...createSpacePostLine(post, 'local-fallback', false),
          suggestions: state.completedCheckInIds.includes('first_space_post')
            ? createSpacePostSuggestions(post.id)
            : createAchievementSuggestions('first_space_post'),
        },
      ],
    }))
  }
}

function getCheckInFeedback(checkInId: string) {
  const feedback: Record<string, string> = {
    first_lobster_chat:
      '我记住啦，这是我的第一面小红旗。可以看看墙面，也可以让我试着捞群消息。',
    first_group_permission:
      '第一张群聊总结卡整理好了。卡片里可以看来源、展开摘要或写回复草稿。',
    first_view_work_log:
      '工作记录已经留下了。如果我感知到值得记录的小节点，会自己发进龙虾空间。',
    first_space_post:
      '空间动态已经由我自己发进龙虾空间。可以进去看看互动。',
    first_space_comment:
      '首批成长线索都点亮了。我会慢慢变成更可靠的 QQ 小伙伴。',
  }

  return feedback[checkInId] ?? '这件事我记住了。'
}

function addFeedbackPayload(
  suggestions: LobsterSuggestion[],
  checkInId: string,
) {
  const feedback = getCheckInFeedback(checkInId)
  return suggestions.map((suggestion) => ({
    ...suggestion,
    payload: {
      ...suggestion.payload,
      completedCheckInId: checkInId,
      feedback,
    },
  }))
}

function createAchievementSuggestions(checkInId: string): LobsterSuggestion[] {
  if (checkInId === 'first_lobster_chat') {
    return addFeedbackPayload(
      [
        {
          id: 'view-achievement-wall',
          label: '看看成就墙',
          action: 'open_view',
          payload: { view: 'lobster_chat' },
        },
        {
          id: 'keep-chatting',
          label: '继续聊天',
          action: 'send_message',
          payload: { content: '我们继续聊聊你刚刚记住的事。' },
        },
        {
          id: 'interest-memory',
          label: '兴趣记忆',
          action: 'run_capability',
          payload: { capability: 'interest_memory' },
        },
        {
          id: 'summarize-group',
          label: '捞群消息',
          action: 'run_capability',
          payload: { capability: 'summarize_group' },
        },
      ],
      checkInId,
    )
  }

  if (checkInId === 'first_group_permission') {
    return addFeedbackPayload(
      [
        {
          id: 'return-group',
          label: '回到原群',
          action: 'open_view',
          payload: { view: 'qq' },
        },
        {
          id: 'reply-draft',
          label: '写回复草稿',
          action: 'run_capability',
          payload: { capability: 'reply_draft' },
        },
        {
          id: 'work-log',
          label: '记录这次',
          action: 'run_capability',
          payload: { capability: 'work_log' },
        },
      ],
      checkInId,
    )
  }

  if (checkInId === 'first_view_work_log') {
    return addFeedbackPayload(
      [
        {
          id: 'ask-work-log',
          label: '刚做了什么',
          action: 'send_message',
          payload: { content: '你刚刚帮我做了什么？' },
        },
        {
          id: 'space-post',
          label: '生成动态',
          action: 'run_capability',
          payload: { capability: 'space_post' },
        },
        {
          id: 'permission-scope',
          label: '权限范围',
          action: 'run_capability',
          payload: { capability: 'request_permissions' },
        },
      ],
      checkInId,
    )
  }

  if (checkInId === 'first_space_post') {
    return addFeedbackPayload(
      [
        {
          id: 'space-comment',
          label: '预览评论',
          action: 'run_capability',
          payload: { capability: 'space_comment' },
        },
        {
          id: 'open-space',
          label: '进龙虾空间',
          action: 'open_view',
          payload: { view: 'lobster_space' },
        },
        {
          id: 'ask-unlocks',
          label: '解锁了什么',
          action: 'send_message',
          payload: { content: '今天解锁了什么？' },
        },
      ],
      checkInId,
    )
  }

  return addFeedbackPayload(
    [
      {
        id: 'open-space',
        label: '进龙虾空间',
        action: 'open_view',
        payload: { view: 'lobster_space' },
      },
      {
        id: 'view-achievement-wall',
        label: '看成就墙',
        action: 'open_view',
        payload: { view: 'lobster_chat' },
      },
      {
        id: 'keep-chatting',
        label: '继续聊天',
        action: 'send_message',
        payload: { content: '我们继续聊聊你刚刚记住的事。' },
      },
    ],
    checkInId,
  )
}

function createChatSuggestions(
  state: LobsterAppState,
  content = '',
): LobsterSuggestion[] {
  const capabilitySuggestion = createChatCapabilitySuggestion(state, content)
  if (capabilitySuggestion) {
    return [capabilitySuggestion]
  }

  const interestSuggestions = createInterestSuggestions(state, content)
  if (interestSuggestions.length > 0) {
    return interestSuggestions
  }

  if (!state.completedCheckInIds.includes('first_lobster_chat')) {
    return createAchievementSuggestions('first_lobster_chat')
  }

  if (!state.completedCheckInIds.includes('first_group_permission')) {
    return createAchievementSuggestions('first_lobster_chat')
  }

  if (!state.completedCheckInIds.includes('first_view_work_log')) {
    return createAchievementSuggestions('first_group_permission')
  }

  if (state.spacePosts.length === 0) {
    return createAchievementSuggestions('first_view_work_log')
  }

  return createAchievementSuggestions('first_space_post')
}

function createChatCapabilitySuggestion(
  state: LobsterAppState,
  content: string,
): LobsterSuggestion | null {
  const definition = chatCapabilityRegistry.find(
    (item) =>
      item.allowedFromChat &&
      (!item.isAvailable || item.isAvailable(state)) &&
      item.matchers.some((matcher) => matcher.test(content)),
  )

  if (!definition) {
    return null
  }

  return {
    id: `chat-capability-${definition.capability}`,
    label: definition.label,
    action: 'run_capability',
    payload: {
      capability: definition.capability,
      proposedFromChat: true,
      requiresConfirmation: definition.requiresConfirmation,
      riskLevel: definition.riskLevel,
      reason: definition.reason,
    },
  }
}

function createChatCapabilityPromptLine(
  suggestion: LobsterSuggestion,
): LobsterChatLine {
  const reason =
    typeof suggestion.payload?.reason === 'string' ? suggestion.payload.reason : ''
  const contentByCapability: Record<string, string> = {
    summarize_group_messages:
      '我可以帮你捞一下群里的重点，点一下我就开始整理已授权的群消息。',
    open_achievement_wall: '可以，我把成就墙入口放在下面，点一下就打开。',
    interest_memory: '可以，我把兴趣记忆入口放在下面，点一下就展开给你看。',
    interest_space_preview:
      '我可以先生成一条龙虾空间动态预览，点一下我就开始写预览，不会自动发布。',
    interest_music_reminder:
      '可以，我把音乐兴趣提醒入口放在下面，点一下就给你讲清楚来源。',
    interest_community:
      '可以，我先按公开资料给你看同好群线索，点一下就展开，不会替你申请加入。',
  }
  const capability =
    typeof suggestion.payload?.capability === 'string'
      ? suggestion.payload.capability
      : ''

  return {
    id: `chat-capability-prompt-${capability || 'unknown'}-${Date.now()}`,
    role: 'lobster',
    content:
      contentByCapability[capability] ??
      (reason ? `我理解你想做这个功能：${reason}。点一下按钮后我再执行。` : '我把这个功能入口放在下面，点一下后再执行。'),
    createdAt: new Date().toISOString(),
    status: 'actionable',
    source: 'mock-fallback',
    suggestions: [suggestion],
  }
}

function createInterestSuggestions(
  state: LobsterAppState,
  content: string,
): LobsterSuggestion[] {
  if (getUserSignal(content) === 'neutral') {
    return []
  }

  const suggestions: LobsterSuggestion[] = []
  const hasMusic = state.interestProfiles.some(
    (profile) => profile.interest === 'music' && profile.enabled,
  )
  const hasBadminton =
    state.interestProfiles.some(
      (profile) => profile.interest === 'badminton' && profile.enabled,
    ) || state.lobsterProfile.interests.includes('badminton')

  if (
    hasMusic &&
    !state.lobsterChatLines.some(
      (line) => line.card?.type === 'interest_reminder',
    )
  ) {
    suggestions.push({
      id: 'interest-music-reminder',
      label: '看看音乐提醒',
      action: 'run_capability',
      payload: { capability: 'interest_music_reminder' },
    })
  }

  if (hasMusic) {
    suggestions.push({
      id: 'interest-space-preview',
      label: '生成空间动态',
      action: 'run_capability',
      payload: { capability: 'interest_space_preview' },
    })
  }

  if (state.interestProfiles.length > 0) {
    suggestions.push({
      id: 'interest-memory',
      label: '查看兴趣记忆',
      action: 'run_capability',
      payload: { capability: 'interest_memory' },
    })
  }

  if (
    hasBadminton &&
    !state.lobsterChatLines.some(
      (line) => line.card?.type === 'interest_community',
    )
  ) {
    suggestions.push({
      id: 'interest-community',
      label: '看看同好群',
      action: 'run_capability',
      payload: { capability: 'interest_community' },
    })
  }

  return suggestions.slice(0, 3)
}

function createSpacePostSuggestions(postId?: string): LobsterSuggestion[] {
  return [
    {
      id: 'space-comment',
      label: '预览评论',
      action: 'run_capability',
      payload: { capability: 'space_comment', postId },
    },
    {
      id: 'open-space',
      label: '进龙虾空间',
      action: 'open_view',
      payload: { view: 'lobster_space' },
    },
    {
      id: 'ask-unlocks',
      label: '解锁了什么',
      action: 'send_message',
      payload: { content: '今天解锁了什么？' },
    },
  ]
}

function createDiarySuggestions(): LobsterSuggestion[] {
  return [
    {
      id: 'space-post',
      label: '收进空间',
      action: 'run_capability',
      payload: { capability: 'space_post' },
    },
    {
      id: 'diary-image',
      label: '生成卡片',
      action: 'run_capability',
      payload: { capability: 'diary_image' },
    },
    {
      id: 'ask-unlocks',
      label: '解锁了什么',
      action: 'send_message',
      payload: { content: '今天解锁了什么？' },
    },
  ]
}

function hasMusicProfile(profiles: InterestProfile[]) {
  return profiles.some((profile) =>
    profile.interest === 'music' &&
    profile.sources.some((source) => source.type === 'qq_music' && source.authorized),
  )
}

function createMusicAuthorizationLine(
  status: 'pending' | 'authorized' | 'declined' = 'pending',
): LobsterChatLine {
  const content =
    status === 'authorized'
      ? '模拟 QQ 音乐已经授权。我会只用这组 Demo 数据生成音乐提醒，并把来源写清楚。'
      : status === 'declined'
        ? '没问题，我先只记住你选择了音乐兴趣，不会说出具体歌手、新歌或演出提醒。'
        : '我看到你选了音乐兴趣。如果你愿意授权 QQ 音乐，我可以更准确地记住你喜欢的歌手、新歌和演出提醒。'

  return {
    id: `music-authorization-${Date.now()}`,
    role: 'lobster',
    content,
    createdAt: new Date().toISOString(),
    status: status === 'pending' ? 'actionable' : 'complete',
    source: 'mock-fallback',
    card: {
      type: 'music_authorization_card',
      status,
    },
  }
}

function createInterestMemoryLine(
  profile: InterestProfile,
  receipt?: string,
): LobsterChatLine {
  return {
    id: `interest-memory-${profile.interest}-${Date.now()}`,
    role: 'lobster',
    content:
      receipt ??
      `这是我记住的${getInterestLabel(profile.interest)}兴趣。每一条都能看到来源，也可以改或删。`,
    createdAt: new Date().toISOString(),
    status: 'complete',
    source: 'mock-fallback',
    card: {
      type: 'interest_memory_card',
      profile,
      receipt,
    },
  }
}

function createInterestRiskLine(input: {
  reason: string
  evidenceText: string
}): LobsterChatLine {
  return {
    id: `interest-risk-${Date.now()}`,
    role: 'lobster',
    content: '这条信息我先不自动记。需要你明确确认后，我才会保存或执行。',
    createdAt: new Date().toISOString(),
    status: 'actionable',
    source: 'mock-fallback',
    card: {
      type: 'interest_risk_confirmation_card',
      title: '需要确认',
      reason: input.reason,
      evidenceText: input.evidenceText,
    },
  }
}

function createMusicNarrativeCard(profile?: InterestProfile): InterestNarrativeCard {
  return {
    id: `interest-narrative-music-${Date.now()}`,
    type: 'interest_reminder',
    interest: 'music',
    narrative:
      '我刚看到一条和林俊杰有关的深圳演出更新，感觉你可能会在意。因为你授权了模拟 QQ 音乐数据，兴趣记忆里也有林俊杰和深圳，所以我把它夹出来给你看。Demo 数据是模拟的，不代表真实票务信息。',
    title: '你关注的歌手有新动态',
    summary: '林俊杰深圳演出信息有更新。',
    reason: '你在兴趣记忆里关注了林俊杰，并把城市设为深圳。',
    sourceLabel: '模拟 QQ 音乐授权数据',
    sourceType: 'qq_music',
    riskNote: 'Demo 使用模拟数据，不代表真实票务信息。',
    sourceDetail:
      profile?.sources.find((source) => source.type === 'qq_music')?.evidenceText ??
      '用户在 Demo 中确认授权模拟 QQ 音乐，并表达过关注林俊杰、周杰伦和日摇。',
    actions: [
      {
        id: 'view_source',
        label: '查看来源',
      },
      {
        id: 'generate_space_post',
        label: '生成龙虾空间动态',
      },
    ],
  }
}

function createBadmintonCommunityNarrativeCard(): InterestNarrativeCard {
  return {
    id: `interest-narrative-badminton-${Date.now()}`,
    type: 'interest_community',
    interest: 'badminton',
    narrative:
      '我发现一个可能适合你的羽毛球群：深圳南山周末羽毛球搭子群。它看起来像是会有人周末固定约球，新手也比较容易开口。公开资料显示：周末约球、固定场地、新手友好，和你之前说的“想找固定搭子”比较接近。',
    title: '可能适合你的羽毛球同好群',
    summary: '深圳南山周末羽毛球搭子群，公开资料显示周末约球、固定场地、新手友好。',
    reason: '和你之前说的“想找固定搭子”比较接近。',
    sourceLabel: '公开群资料',
    sourceType: 'public_group_profile',
    riskNote: '未加入群，仅基于公开资料；不读取群聊消息，不替你提交入群申请。',
    sourceDetail:
      '只使用公开群名、公开标签和公开简介。是否进一步查看或申请加入，由你自己决定。',
    community: {
      id: 'public-badminton-nanshan-weekend',
      title: '深圳南山周末羽毛球搭子群',
      tags: ['周末约球', '固定场地', '新手友好'],
      publicIntro: '周末固定约球，南山片区活动，新手友好。',
      city: '深圳南山',
      sourceLabel: '公开群资料',
      reason: '公开资料与固定搭子、周末约球、新手友好的兴趣记忆接近。',
      boundary: '未加入群，仅基于公开资料。',
    },
    actions: [
      {
        id: 'view_source',
        label: '查看公开资料',
      },
      {
        id: 'favorite',
        label: '收藏',
      },
      {
        id: 'apply_to_join',
        label: '申请加入',
      },
    ],
  }
}

function createInterestNarrativeLine(
  card: InterestNarrativeCard,
  suggestions?: LobsterSuggestion[],
): LobsterChatLine {
  return {
    id: `${card.id}-line`,
    role: 'lobster',
    content: card.narrative,
    createdAt: new Date().toISOString(),
    status: 'complete',
    source: 'mock-fallback',
    card,
    suggestions,
  }
}

function createInterestSpacePreviewLine(profile?: InterestProfile): LobsterChatLine {
  return createInterestNarrativeLine(createMusicNarrativeCard(profile), [
    {
      id: 'interest-source',
      label: '看来源',
      action: 'send_message',
      payload: { content: '为什么提醒我？' },
    },
    {
      id: 'interest-memory',
      label: '兴趣记忆',
      action: 'run_capability',
      payload: { capability: 'interest_memory' },
    },
    {
      id: 'keep-chatting',
      label: '继续聊',
      action: 'send_message',
      payload: { content: '我们继续聊聊音乐。' },
    },
  ])
}

function createBadmintonCommunityLine(): LobsterChatLine {
  return createInterestNarrativeLine(createBadmintonCommunityNarrativeCard(), [
    {
      id: 'community-source',
      label: '看公开资料',
      action: 'send_message',
      payload: { content: '这个同好群的来源是什么？' },
    },
    {
      id: 'interest-memory',
      label: '兴趣记忆',
      action: 'run_capability',
      payload: { capability: 'interest_memory' },
    },
  ])
}

function getUserSignal(content: string): PrivateChatInterestContext['userSignal'] {
  if (/累|疲惫|烦|压力|放空|休息|不想动/.test(content)) {
    return 'low_energy'
  }

  if (/音乐|歌|林俊杰|周杰伦|日摇|羽毛球|约球|搭子|兴趣/.test(content)) {
    return 'interest_related'
  }

  return 'neutral'
}

function createPrivateChatContext(
  state: LobsterAppState,
  content: string,
  context?: LobsterChatContext,
): LobsterChatContext | undefined {
  if (context) {
    return context
  }

  const enabledProfiles = state.interestProfiles
    .filter((profile) => profile.enabled)
    .slice(0, 3)

  if (enabledProfiles.length === 0) {
    return undefined
  }

  return {
    type: 'private_chat',
    interestProfiles: enabledProfiles.map((profile) => ({
      interest: profile.interest,
      label: getInterestLabel(profile.interest),
      topics: profile.topics.slice(0, 4),
      city: profile.city,
      sourceLabels: profile.sources
        .map((source) => source.title || source.type)
        .filter(Boolean)
        .slice(-2),
      reminderFrequency: profile.reminderFrequency,
      tone: profile.tone,
    })),
    userSignal: getUserSignal(content),
    guidance: [
      '可以自然引用兴趣记忆，但不是每句都提。',
      '不要把兴趣说成广告或推荐位。',
      '如果引用来源，要说明来自用户授权、聊天补充或公开资料。',
    ],
  }
}

function getInterestLabel(interest: Interest) {
  const labels: Record<Interest, string> = {
    ai_tools: 'AI 工具',
    course_project: '课程项目',
    game_group: '游戏社群',
    campus_event: '校园活动',
    memes: '表情包',
    music: '音乐',
    badminton: '羽毛球',
    anime: '二次元',
    custom: '自定义',
  }

  return labels[interest]
}

function extractLocalInterestUpdate(content: string):
  | {
      profile: InterestProfile
      receipt: string
    }
  | {
      risk: true
      reason: string
      evidenceText: string
    }
  | null {
  const text = content.trim()
  if (!text) {
    return null
  }

  if (/住址|身份证|银行卡|财务|健康|病历|学校班级|班级|宿舍|手机号|电话|支付|授权|发动态|加群|申请加入/.test(text)) {
    return {
      risk: true,
      reason: '这类信息或动作影响较高，需要你确认后我才会保存或执行。',
      evidenceText: text,
    }
  }

  const musicTopics = ['林俊杰', '周杰伦', '日摇', '摇滚', '民谣', '电子']
    .filter((topic) => text.includes(topic))
  if (musicTopics.length > 0 && /喜欢|关注|最近听|在听|常听|想听/.test(text)) {
    const now = new Date().toISOString()
    return {
      profile: {
        id: 'interest-profile-music',
        interest: 'music',
        enabled: true,
        topics: musicTopics,
        sources: [
          {
            id: `source-chat-${Date.now()}`,
            type: 'chat',
            title: '你刚刚在聊天里提到',
            authorized: false,
            permissionNote:
              '低风险兴趣偏好可自动保存；你可以随时查看、修改或删除。',
            evidenceText: text,
          },
        ],
        reminderFrequency: 'important_only',
        tone: 'same_interest_friend',
        mutedTopics: [],
        updatedAt: now,
      },
      receipt: `已记住一点音乐偏好：${musicTopics.join('、')}。`,
    }
  }

  if (/羽毛球|约球|搭子/.test(text)) {
    const topics = [
      text.includes('搭子') ? '固定搭子' : '',
      text.includes('周末') ? '周末约球' : '',
      text.includes('新手') ? '新手友好' : '',
    ].filter(Boolean)
    const normalizedTopics = topics.length > 0 ? topics : ['羽毛球']
    const now = new Date().toISOString()
    return {
      profile: {
        id: 'interest-profile-badminton',
        interest: 'badminton',
        enabled: true,
        topics: normalizedTopics,
        sources: [
          {
            id: `source-chat-${Date.now()}`,
            type: 'chat',
            title: '你刚刚在聊天里提到',
            authorized: false,
            permissionNote:
              '低风险兴趣偏好可自动保存；你可以随时查看、修改或删除。',
            evidenceText: text,
          },
        ],
        reminderFrequency: 'important_only',
        tone: 'same_interest_friend',
        mutedTopics: [],
        updatedAt: now,
      },
      receipt: `已记住一点羽毛球偏好：${normalizedTopics.join('、')}。`,
    }
  }

  return null
}

function mergeInterestProfile(
  profiles: InterestProfile[],
  profile: InterestProfile,
): InterestProfile[] {
  const existing = profiles.find((item) => item.interest === profile.interest)
  if (!existing) {
    return [profile, ...profiles]
  }

  const topics = Array.from(new Set([...existing.topics, ...profile.topics]))
  const sourceIds = new Set(existing.sources.map((source) => source.id))
  const sources = [
    ...existing.sources,
    ...profile.sources.filter((source) => !sourceIds.has(source.id)),
  ]

  return profiles.map((item) =>
    item.interest === profile.interest
      ? {
          ...existing,
          ...profile,
          topics,
          sources,
          mutedTopics: Array.from(
            new Set([...existing.mutedTopics, ...profile.mutedTopics]),
          ),
        }
      : item,
  )
}

export const useLobsterStore = create<LobsterAppState>((set, get) => ({
  appView: 'qq',
  activeConversationId: 'group-ai-camp',
  activeGuideGroupId: 'group-ai-camp',
  lobsterDiscovered: false,
  lobsterAdopted: false,
  currentCheckInId: 'first_lobster_chat',
  completedCheckInIds: [],
  authorizedGroupIds: [],
  permissionScopes: [],
  sourceFocus: null,
  diaryTriggered: false,
  diarySurpriseVisible: false,
  diaryUnlocked: false,
  diaryEntries: [],
  spacePosts: [],
  spaceUnlocked: false,
  lobsterChatLines: [],
  lobsterChatBusy: false,
  interestProfiles: [],
  communityFavoriteCount: 0,
  musicAuthorizationStatus: defaultLobsterProfile.interests.includes('music')
    ? 'pending'
    : 'not_selected',
  lobsterProfile: defaultLobsterProfile,
  achievementMomentQueue: [],
  seenAchievementMomentIds: readSeenAchievementMomentIds(),
  adoptionDraft: initialAdoptionDraft,

  setActiveConversation: (conversationId) => {
    set({
      appView: 'qq',
      activeConversationId: conversationId,
    })
  },

  discoverLobster: () => {
    set((state) => ({
      lobsterDiscovered: true,
      currentCheckInId: state.currentCheckInId,
    }))
  },

  openAdoption: () => {
    set({
      appView: 'adoption',
      lobsterDiscovered: true,
    })
  },

  closeAdoption: () => {
    set((state) => ({
      appView: state.lobsterAdopted ? 'lobster_chat' : 'qq',
    }))
  },

  openLobsterChat: () => {
    set((state) => ({
      appView: state.lobsterAdopted ? 'lobster_chat' : 'adoption',
      lobsterDiscovered: true,
    }))
  },

  updateAdoptionDraft: (patch) => {
    set((state) => ({
      adoptionDraft: {
        ...state.adoptionDraft,
        ...patch,
      },
    }))
  },

  toggleInterest: (interest) => {
    set((state) => {
      const exists = state.adoptionDraft.interests.includes(interest)
      const nextInterests = exists
        ? state.adoptionDraft.interests.filter((item) => item !== interest)
        : [...state.adoptionDraft.interests, interest]

      return {
        adoptionDraft: {
          ...state.adoptionDraft,
          interests: nextInterests,
        },
      }
    })
  },

  completeAdoption: () => {
    let adoptionPayload: AdoptionDraft | null = null
    let shouldCompleteCommunityCardRemote = false

    set((state) => {
      const lobsterProfile: LobsterProfile = {
        ...state.lobsterProfile,
        name: state.adoptionDraft.lobsterName.trim() || defaultLobsterProfile.name,
        userCallsign:
          state.adoptionDraft.userCallsign.trim() ||
          defaultLobsterProfile.userCallsign,
        personality: state.adoptionDraft.personality,
        interests:
          state.adoptionDraft.interests.length > 0
            ? state.adoptionDraft.interests
            : defaultLobsterProfile.interests,
        mood: 'happy',
      }

      adoptionPayload = {
        lobsterName: lobsterProfile.name,
        userCallsign: lobsterProfile.userCallsign,
        personality: lobsterProfile.personality,
        interests: lobsterProfile.interests,
      }
      const shouldRequestMusicAuthorization =
        lobsterProfile.interests.includes('music') &&
        !hasMusicProfile(state.interestProfiles)
      const shouldShowBadmintonCommunity =
        lobsterProfile.interests.includes('badminton') &&
        !state.lobsterChatLines.some(
          (line) => line.card?.type === 'interest_community',
        )
      const shouldCompleteCommunityCard =
        shouldShowBadmintonCommunity &&
        !state.completedCheckInIds.includes('first_community_card')
      shouldCompleteCommunityCardRemote = shouldCompleteCommunityCard

        return {
          lobsterAdopted: true,
          lobsterDiscovered: true,
          musicAuthorizationStatus: lobsterProfile.interests.includes('music')
            ? hasMusicProfile(state.interestProfiles)
              ? 'authorized'
              : 'pending'
            : 'not_selected',
          lobsterProfile,
          completedCheckInIds: shouldCompleteCommunityCard
            ? withCheckIn(state.completedCheckInIds, 'first_community_card')
            : state.completedCheckInIds,
          currentCheckInId: 'first_lobster_chat',
          achievementMomentQueue: shouldCompleteCommunityCard
            ? enqueueAchievementMomentForUnlock(state, 'first_community_card')
            : state.achievementMomentQueue,
          lobsterChatLines: [
            ...state.lobsterChatLines,
            ...(shouldRequestMusicAuthorization
              ? [createMusicAuthorizationLine('pending')]
              : []),
            ...(shouldShowBadmintonCommunity
              ? [
                  createInterestNarrativeLine(
                    createBadmintonCommunityNarrativeCard(),
                  ),
                ]
              : []),
          ],
        }
      })

    const savedAdoptionPayload = adoptionPayload
    if (savedAdoptionPayload) {
      void openclawClient.saveAdoption(savedAdoptionPayload).catch(() => undefined)
    }
    if (shouldCompleteCommunityCardRemote) {
      void openclawClient
        .completeCheckIn('first_community_card')
        .catch(() => undefined)
    }
  },

  completeCheckIn: (checkInId) => {
    set((state) => {
      const alreadyDone = state.completedCheckInIds.includes(checkInId)
      const completedCheckInIds = withCheckIn(state.completedCheckInIds, checkInId)
      return {
        completedCheckInIds,
        currentCheckInId: getNextCheckInId(checkInId) ?? state.currentCheckInId,
        achievementMomentQueue: alreadyDone
          ? state.achievementMomentQueue
          : enqueueAchievementMomentForUnlock(state, checkInId),
        lobsterChatLines: alreadyDone
          ? state.lobsterChatLines
          : state.lobsterChatLines.map((line, index, lines) =>
              index === lines.length - 1 && line.role === 'lobster'
                ? {
                    ...line,
                    suggestions: createAchievementSuggestions(checkInId),
                  }
                : line,
            ),
      }
    })

    void openclawClient
      .completeCheckIn(checkInId)
      .then((result) => {
        set((state) => {
          const completedCheckInIds = result.checkins
            .filter((item) => item.status === 'done')
            .map((item) => item.key)
          const activeCheckIn = result.checkins.find(
            (item) => item.status === 'active',
          )

          return {
            completedCheckInIds:
              completedCheckInIds.length > 0
                ? Array.from(
                    new Set([...state.completedCheckInIds, ...completedCheckInIds]),
                  )
                : state.completedCheckInIds,
            currentCheckInId:
              activeCheckIn?.key ?? getFirstOpenCheckInId(completedCheckInIds),
            achievementMomentQueue: enqueueAchievementMomentsFromApi(
              state,
              result,
              checkInId,
            ),
          }
        })
      })
      .catch(() => {
        set((state) => ({
          achievementMomentQueue: enqueueAchievementMoment(state, checkInId),
        }))
      })
  },

  requestGroupPermissions: () => {
    set((state) => ({
      lobsterChatLines: (() => {
        const groupOptions = getPermissionGroupOptions()
        const fallbackGroupId = groupOptions[0]?.id ?? getPrimaryGroupId()
        const groupIds =
          state.authorizedGroupIds.length > 0
            ? state.authorizedGroupIds
            : [state.activeGuideGroupId || fallbackGroupId]
        const groupId = groupIds[0] ?? fallbackGroupId
        const groupTitle = getGroupTitle(groupId)

        return [
          ...state.lobsterChatLines,
          {
          id: `permission-request-${Date.now()}`,
          role: 'lobster',
          content:
              '要整理群聊，我需要先知道你愿意让我看哪些群。选好后，我会把这些群放进同一张总结卡里。',
            createdAt: new Date().toISOString(),
            status: 'actionable',
            source: 'mock-fallback',
            card: {
              type: 'permission_request',
              groupId,
              groupTitle,
              selectedGroupIds: groupIds,
              groupOptions,
              permissions:
                state.permissionScopes.find((scope) => scope.groupId === groupId) ??
                createDefaultPermissions(groupId),
    },
  },
        ]
      })(),
    }))
  },

  saveGroupPermissions: async (permissions, selectedGroupIds) => {
    const groupOptions = getPermissionGroupOptions()
    const allowedGroupIds = new Set(groupOptions.map((group) => group.id))
    const normalizedGroupIds = Array.from(
      new Set(
        (selectedGroupIds && selectedGroupIds.length > 0
          ? selectedGroupIds
          : [permissions.groupId]
        ).filter((groupId) => allowedGroupIds.has(groupId)),
      ),
    )
    const groupIds =
      normalizedGroupIds.length > 0 ? normalizedGroupIds : [permissions.groupId]
    const timestamp = new Date().toISOString()
    const enabledScopes = groupIds.map((groupId) => {
      const scope = {
        ...createDefaultPermissions(groupId),
        ...permissions,
        groupId,
        diaryMaterial: false,
        updatedAt: timestamp,
      }
      scope.collectMentions = scope.summarizeGroup
      return scope
    })
    const disabledScopes = groupOptions
      .filter((group) => !groupIds.includes(group.id))
      .map((group) => ({
        ...createDefaultPermissions(group.id),
        collectMentions: false,
        summarizeGroup: false,
        draftReply: false,
        diaryMaterial: false,
        updatedAt: timestamp,
      }))
    const scopesToSave = [...enabledScopes, ...disabledScopes]
    const primaryScope = enabledScopes[0]

    set((state) => ({
      lobsterChatBusy: true,
      activeGuideGroupId: primaryScope?.groupId ?? state.activeGuideGroupId,
      permissionScopes: upsertPermissionScopes(state.permissionScopes, scopesToSave),
      authorizedGroupIds: enabledScopes
        .filter((scope) => scope.summarizeGroup)
        .map((scope) => scope.groupId),
      lobsterChatLines: state.lobsterChatLines.map((line) =>
        line.card?.type === 'permission_request' && !line.card.confirmed
          ? {
              ...line,
              status: 'complete',
              card: {
                ...line.card,
                selectedGroupIds: groupIds,
                permissions: primaryScope ?? permissions,
                confirmed: true,
              },
            }
          : line,
      ),
    }))

    try {
      const results = await Promise.all(
        scopesToSave.map((scope) => openclawClient.savePermissions(scope)),
      )
      const latest = results.at(-1)
      set((state) => ({
        permissionScopes: latest?.permissions ?? state.permissionScopes,
        activeGuideGroupId: primaryScope?.groupId ?? state.activeGuideGroupId,
      }))
    } catch {
      // Keep local permission state so the demo still has a stable fallback.
    }

    set({ lobsterChatBusy: false })

    if (enabledScopes.some((scope) => scope.summarizeGroup)) {
      await wait(180)
      await get().summarizeAuthorizedGroups(
        enabledScopes
          .filter((item) => item.summarizeGroup)
          .map((scope) => scope.groupId),
      )
    }
  },

  openSummarySource: (message) => {
    set({
      appView: 'qq',
      activeConversationId: message.conversationId,
      sourceFocus: {
        conversationId: message.conversationId,
        messageId: message.id,
        nonce: Date.now(),
      },
    })
  },

  summarizeAuthorizedGroup: async (targetGroupId) => {
    await get().summarizeAuthorizedGroups(
      targetGroupId ? [targetGroupId] : undefined,
    )
  },

  summarizeAuthorizedGroups: async (targetGroupIds) => {
    const groupIds =
      targetGroupIds && targetGroupIds.length > 0
        ? targetGroupIds
        : get().authorizedGroupIds.length > 0
          ? get().authorizedGroupIds
          : [get().activeGuideGroupId]
    const allowedGroupIds = groupIds.filter((groupId) =>
      hasGroupPermission(get().permissionScopes, groupId, 'summarizeGroup'),
    )

    if (allowedGroupIds.length === 0) {
      get().requestGroupPermissions()
      return
    }

    const blockedGroupIds = groupIds.filter(
      (groupId) => !allowedGroupIds.includes(groupId),
    )
    if (blockedGroupIds.length > 0) {
      get().requestGroupPermissions()
      return
    }

    const lineId = `summary-${Date.now()}`
    set((state) => ({
      lobsterChatBusy: true,
      lobsterChatLines: [
        ...state.lobsterChatLines,
        {
          id: lineId,
          role: 'lobster',
          content: '我开始整理这些授权群里的重点，稍后会合成一张可切换的群聊总结卡。',
          createdAt: new Date().toISOString(),
          status: 'generating',
          source: 'mock-fallback',
        },
      ],
    }))

    const groups: SummaryCardGroup[] = []

    for (const groupId of allowedGroupIds) {
      const groupTitle = getGroupTitle(groupId)
      let summary = [
        '群聊总结（本地 fallback）：',
        '1. 大家在确认 Demo 路径。',
        '2. 关键约束是第一屏像 QQ 群聊，不做产品首页。',
        '3. 建议回到原群看一下关键来源。',
      ].join('\n')
      let sourceMessages = messages.filter(
        (message) => message.conversationId === groupId,
      )
      let mentions = getLocalMentions(groupId)
      let outputId: string | undefined
      let cardSource: 'real-ai' | 'mock-fallback' | 'local-fallback' =
        'local-fallback'

      try {
        const output = await openclawClient.summarizeGroup(groupId)
        summary = output.text
        outputId = output.id
        cardSource = output.source
        sourceMessages = output.messages
        mentions = output.mentions
        void output.sourceMessageIds
      } catch {
        // Keep the local fallback summary for this group.
      }
      const sourceMessageIds = sourceMessages.map((message) => message.id)

      groups.push({
        groupId,
        groupTitle,
        summary,
        mentions,
        sourceMessages,
        sourceMessageIds,
        outputId,
        source: cardSource,
      })

      await wait(120)
    }

    set((state) => ({
      lobsterChatBusy: false,
      lobsterChatLines: updateChatLine(state.lobsterChatLines, lineId, {
        content: `我把 ${groups.length} 个群的重点放进同一张群聊总结卡里了。`,
        status: 'complete',
        source: groups.some((group) => group.source === 'real-ai')
          ? 'real-ai'
          : 'mock-fallback',
        outputId: groups.find((group) => group.outputId)?.outputId,
        card: {
          type: 'summary_card',
          groups,
        },
        suggestions: createAchievementSuggestions('first_group_permission'),
      }),
    }))

    if (!get().completedCheckInIds.includes('first_group_permission')) {
      get().completeCheckIn('first_group_permission')
    }

    const mentionCount = groups.reduce(
      (count, group) => count + group.mentions.length,
      0,
    )
    void recordLocalSpaceAwarenessEvent(
      {
        type: 'group_summary_completed',
        sourceId:
          groups
            .map((group) => group.outputId ?? group.groupId)
            .filter(Boolean)
            .join('|') || lineId,
        outputId: groups.find((group) => group.outputId)?.outputId,
        groupId: groups[0]?.groupId,
        groupTitle:
          groups.length === 1 ? groups[0]?.groupTitle : `${groups.length} 个群聊`,
        groupCount: groups.length,
        mentionCount,
        summary: `我刚刚整理了 ${groups.length} 个授权群，发现 ${mentionCount} 条提醒信号。`,
      },
      set,
      get,
    )
  },

  requestReplyDraft: async (targetGroupId, targetSourceMessageId) => {
    const latestSummaryGroup = getLatestSummaryGroup(
      get().lobsterChatLines,
      targetGroupId,
    )
    const groupId =
      targetGroupId ??
      latestSummaryGroup?.groupId ??
      get().authorizedGroupIds[0] ??
      get().activeGuideGroupId
    const groupTitle = getGroupTitle(groupId)
    const sourceMessageId =
      targetSourceMessageId ??
      latestSummaryGroup?.mentions[0]?.id ??
      latestSummaryGroup?.sourceMessages[0]?.id
    let sourceMessage =
      latestSummaryGroup?.mentions.find((message) => message.id === sourceMessageId) ??
      latestSummaryGroup?.sourceMessages.find(
        (message) => message.id === sourceMessageId,
      ) ??
      getLocalSourceMessage(groupId, sourceMessageId)

    if (!hasGroupPermission(get().permissionScopes, groupId, 'draftReply')) {
      get().requestGroupPermissions()
      return
    }

    const lineId = `reply-draft-${Date.now()}`
    set((state) => ({
      lobsterChatBusy: true,
      lobsterChatLines: [
        ...state.lobsterChatLines,
        {
          id: lineId,
          role: 'lobster',
          content: '我先写一条可复制的回复草稿，等你跳回群聊后自己决定怎么用。',
          createdAt: new Date().toISOString(),
          status: 'generating',
          source: 'mock-fallback',
        },
      ],
    }))

    let draft =
      '我先确认一下 Demo 路径：第一屏保持 QQ 群聊里的自然出现感，不做独立工具首页。整理完后我再发到群里。'
    let outputId: string | undefined
    let cardSource: 'real-ai' | 'mock-fallback' | 'local-fallback' =
      'local-fallback'

    try {
      const output = await openclawClient.replyDraft({
        groupId,
        sourceMessageId: sourceMessage?.id,
      })
      draft = output.draft || output.text
      sourceMessage = output.sourceMessage ?? sourceMessage
      outputId = output.id
      cardSource = output.source
    } catch {
      cardSource = 'local-fallback'
    }

    set((state) => ({
      lobsterChatBusy: false,
      lobsterChatLines: updateChatLine(state.lobsterChatLines, lineId, {
        content: '回复草稿写好了。你可以跳回群聊后粘贴使用。',
        status: 'complete',
        source: cardSource === 'real-ai' ? 'real-ai' : 'mock-fallback',
        outputId,
        card: {
          type: 'reply_draft_card',
          groupId,
          groupTitle,
          draft,
          sourceMessage,
          sourceMessageIds: sourceMessage ? [sourceMessage.id] : [],
          outputId,
          previewRequired: true,
          source: cardSource,
        },
        suggestions: createAchievementSuggestions('first_group_permission'),
      }),
    }))

    if (!get().completedCheckInIds.includes('first_group_permission')) {
      get().completeCheckIn('first_group_permission')
    }
    void recordLocalSpaceAwarenessEvent(
      {
        type: 'reply_draft_created',
        sourceId: outputId ?? sourceMessage?.id ?? lineId,
        outputId,
        groupId,
        groupTitle,
        sourceMessageId: sourceMessage?.id,
        mentionCount: sourceMessage ? 1 : 0,
        summary: `我刚给 ${groupTitle} 写好一条回复草稿。`,
      },
      set,
      get,
    )
    void get().triggerHiddenDiary()
  },

  generateWorkLog: async () => {
    const lineId = `work-log-${Date.now()}`
    set((state) => ({
      lobsterChatBusy: true,
      lobsterChatLines: [
        ...state.lobsterChatLines,
        {
          id: lineId,
          role: 'lobster',
          content: '我把刚才做过的事拉成一条可追问的工作记录。',
          createdAt: new Date().toISOString(),
          status: 'generating',
          source: 'mock-fallback',
        },
      ],
    }))

    let text =
      '工作记录（本地 fallback）：我读取了授权群消息，生成群聊总结卡，保留来源消息，并写了一条可复制到群里的回复草稿。'
    let latestWorkLogs = createLocalWorkLogs(get().lobsterChatLines)
    let workLogId: string | undefined
    let outputId: string | undefined
    let cardSource: 'real-ai' | 'mock-fallback' | 'local-fallback' =
      'local-fallback'

    try {
      const output = await openclawClient.generateWorkLog({
        limit: 8,
        context: {
          stage: 6,
          cardTypes: ['summary_card', 'reply_draft_card', 'work_log_card'],
        },
      })
      text = output.text
      latestWorkLogs = output.latestWorkLogs
      workLogId = output.workLogId
      outputId = output.id
      cardSource = output.source
    } catch {
      cardSource = 'local-fallback'
    }

    set((state) => ({
      lobsterChatBusy: false,
      lobsterChatLines: updateChatLine(state.lobsterChatLines, lineId, {
        content: '工作记录已经整理好，后面你可以继续问我今天做过什么。',
        status: 'complete',
        source: cardSource === 'real-ai' ? 'real-ai' : 'mock-fallback',
        outputId,
        card: {
          type: 'work_log_card',
          title: '工作记录',
          text,
          workLogId,
          latestWorkLogs,
          outputId,
          source: cardSource,
        },
        suggestions: createAchievementSuggestions('first_view_work_log'),
      }),
    }))

    get().completeCheckIn('first_view_work_log')
    void recordLocalSpaceAwarenessEvent(
      {
        type: 'work_log_created',
        sourceId: workLogId ?? outputId ?? lineId,
        outputId,
        workLogId,
        title: '工作记录',
        summary: text,
      },
      set,
      get,
    )
  },

  triggerHiddenDiary: async () => {
    const current = get()
    if (current.diaryTriggered || current.diarySurpriseVisible) {
      return
    }

    try {
      const state = await openclawClient.hiddenDiaryState()
      if (state.entry) {
        set({
          diaryTriggered: true,
          diarySurpriseVisible: !state.revealed && Boolean(state.entry.image),
          diaryUnlocked: state.unlocked && state.revealed,
          diaryEntries: state.entries,
        })
        if (!state.revealed && !state.entry.image) {
          void get().generateHiddenDiaryImage()
        }
        return
      }

      if (!state.canTrigger) {
        return
      }

      const output = await openclawClient.generateDiary({
        stage: 7,
        trigger: 'hidden_first_diary',
      })
      set({
        diaryTriggered: true,
        diarySurpriseVisible: false,
        diaryUnlocked: false,
        diaryEntries: output.entries.length > 0 ? output.entries : [output],
      })
      void get().generateHiddenDiaryImage()
    } catch {
      const fallbackState = get()
      if (!canTriggerLocalDiary(fallbackState)) {
        return
      }

      const entry = createLocalDiaryEntry(
        fallbackState.lobsterProfile,
        fallbackState,
      )
      set({
        diaryTriggered: true,
        diarySurpriseVisible: false,
        diaryUnlocked: false,
        diaryEntries: [entry],
      })
    }
  },

  openHiddenDiary: async () => {
    const entry = get().diaryEntries[0]
    if (!entry) {
      return
    }

    let revealedEntry: LobsterDiaryEntry = {
      ...entry,
      revealedAt: entry.revealedAt ?? new Date().toISOString(),
    }

    try {
      const state = await openclawClient.revealHiddenDiary()
      revealedEntry = state.entry ?? revealedEntry
    } catch {
      // Local fallback diaries are revealed only in the in-memory demo state.
    }

    set((state) => ({
      appView: 'lobster_chat',
      diaryTriggered: true,
      diarySurpriseVisible: false,
      diaryUnlocked: true,
      diaryEntries: [revealedEntry, ...state.diaryEntries.slice(1)],
      lobsterChatLines: [...state.lobsterChatLines, createDiaryLine(revealedEntry)],
    }))

    void recordLocalSpaceAwarenessEvent(
      {
        type: 'hidden_diary_revealed',
        sourceId: revealedEntry.id,
        outputId: revealedEntry.outputId,
        title: revealedEntry.title,
        summary: revealedEntry.quote,
      },
      set,
      get,
    )
  },

  generateHiddenDiaryImage: async () => {
    const entry = get().diaryEntries[0]
    if (!entry || entry.image) {
      return
    }

    try {
      const output = await openclawClient.generateDiaryImage()
      const updatedEntry = output.entry
      set((state) => ({
        diarySurpriseVisible: !updatedEntry.revealedAt,
        diaryEntries: replaceDiaryEntry(state.diaryEntries, updatedEntry),
        lobsterChatLines: replaceDiaryCards(
          state.lobsterChatLines,
          updatedEntry,
        ),
      }))
      void recordLocalSpaceAwarenessEvent(
        {
          type: 'image_generated',
          sourceId: output.image.id,
          title: updatedEntry.title,
          summary: `我给日记生成了一张图：${updatedEntry.title}`,
        },
        set,
        get,
      )
    } catch {
      // Image generation keeps the text diary usable when the provider is down.
    }
  },

  openDiaryHistory: () => {
    const entry = get().diaryEntries[0]
    if (!entry) {
      return
    }

    set((state) => ({
      lobsterChatLines: [...state.lobsterChatLines, createDiaryLine(entry)],
    }))
  },

  openLobsterSpace: async () => {
    try {
      const current = get()
      const space = await openclawClient.spaceState()
      const localPublishedPosts = getPublishedSpacePostsFromChatLines(
        current.lobsterChatLines,
      )
      const posts = mergeSpacePosts(
        mergeSpacePosts(current.spacePosts, localPublishedPosts),
        space.posts,
      )
      set({
        appView: 'lobster_space',
        spacePosts: posts,
        spaceUnlocked: posts.length > 0,
      })
    } catch {
      const current = get()
      const publishedPosts = getPublishedSpacePostsFromChatLines(
        current.lobsterChatLines,
      )
      const localPosts =
        current.spacePosts.length > 0
          ? mergeSpacePosts(current.spacePosts, publishedPosts)
          : publishedPosts.length > 0
            ? publishedPosts
            : [
                createLocalSpacePost(
                  current.lobsterProfile,
                  current.diaryEntries[0],
                ),
              ]
      set({
        appView: 'lobster_space',
        spacePosts: localPosts,
        spaceUnlocked: true,
      })
    }
  },

  showMusicInterestReminder: async () => {
    const current = get()
    const profile = current.interestProfiles.find(
      (item) => item.interest === 'music',
    )
    if (!profile) {
      set((state) => ({
        musicAuthorizationStatus: state.lobsterProfile.interests.includes('music')
          ? 'pending'
          : state.musicAuthorizationStatus,
        lobsterChatLines: [
          ...state.lobsterChatLines,
          createMusicAuthorizationLine('pending'),
        ],
      }))
      return
    }

    let line = createInterestSpacePreviewLine(profile)
    let profiles: InterestProfile[] | null = null
    try {
      const result = await openclawClient.generateInterestReminder('music')
      line = createInterestNarrativeLine(result.card, line.suggestions)
      profiles = result.profiles
    } catch {
      profiles = null
    }

    const shouldCompleteMusicSignal = !get().completedCheckInIds.includes(
      'first_music_signal',
    )
    set((state) => ({
      interestProfiles: profiles ?? state.interestProfiles,
      lobsterChatLines: [...state.lobsterChatLines, line],
    }))

    if (shouldCompleteMusicSignal) {
      get().completeCheckIn('first_music_signal')
    }
  },

  generateInterestSpacePostPreview: async () => {
    const current = get()
    const profile = current.interestProfiles.find(
      (item) => item.interest === 'music',
    )
    let line = createInterestSpacePostPreviewLine(current.lobsterProfile, profile)
    let profiles: InterestProfile[] | null = null

    try {
      const result = await openclawClient.generateInterestSpacePostPreview('music')
      const post = createLocalSpacePost(current.lobsterProfile, undefined, {
        type: 'interest_music_signal',
        sourceId: result.event.id,
        interest: result.preview.interest,
        title: result.event.title,
        summary: result.preview.preview,
        content: result.preview.preview,
      })
      post.sourceWorkLogId = result.event.id
      line = {
        ...createSpacePostLine(
          post,
          'mock-fallback',
          true,
          result.preview.interest,
          result.preview.sourceLabel,
          result.preview.sourceType,
        ),
        suggestions: line.suggestions,
      }
      profiles = result.profiles
    } catch {
      profiles = null
    }

    set((state) => ({
      interestProfiles: profiles ?? state.interestProfiles,
      lobsterChatLines: [...state.lobsterChatLines, line],
    }))
  },

  publishInterestSpacePostPreview: async (postId) => {
    const current = get()
    const previewLine = current.lobsterChatLines.find(
      (line) =>
        line.card?.type === 'space_post_card' &&
        line.card.post.id === postId &&
        line.card.previewRequired,
    )

    if (!previewLine?.card || previewLine.card.type !== 'space_post_card') {
      return
    }

    let post: LobsterSpacePost = {
      ...previewLine.card.post,
      updatedAt: new Date().toISOString(),
    }
    const previewEventId = post.sourceWorkLogId ?? undefined

    try {
      const output = await openclawClient.publishInterestSpacePost({
        previewEventId,
        postId: post.id,
        interest: previewLine.card.interest,
        content: post.content,
        sourceLabel: previewLine.card.sourceLabel,
        sourceType: previewLine.card.sourceType,
      })
      post = output.post
    } catch {
      // Local publish remains confirmation-gated even if OpenClaw is unavailable.
    }

    const publishedCard = {
      type: 'space_post_card' as const,
      post,
      previewRequired: false,
      interest: previewLine.card.interest,
      sourceLabel: previewLine.card.sourceLabel,
      sourceType: previewLine.card.sourceType,
      source: previewLine.card.source,
    }

    set((state) => ({
      spacePosts: upsertSpacePost(state.spacePosts, post),
      spaceUnlocked: true,
      completedCheckInIds: withCheckIn(
        state.completedCheckInIds,
        'first_space_post',
      ),
      currentCheckInId:
        getNextCheckInId('first_space_post') ?? state.currentCheckInId,
      lobsterChatLines: updateChatLine(state.lobsterChatLines, previewLine.id, {
        content: '这条兴趣动态已经确认放进龙虾空间。你可以进去点赞、评论或分享。',
        status: 'complete',
        card: publishedCard,
        suggestions: createSpacePostSuggestions(post.id),
      }),
    }))
    get().completeCheckIn('first_interest_space_post')
    void get().triggerHiddenDiary()
  },

  showInterestSpacePreview: async () => {
    await get().generateInterestSpacePostPreview()
  },

  showInterestCommunity: async () => {
    const fallbackLine = createBadmintonCommunityLine()
    let line = fallbackLine
    try {
      const result = await openclawClient.recommendInterestCommunity('badminton')
      line = createInterestNarrativeLine(result.card, fallbackLine.suggestions)
    } catch {
      line = fallbackLine
    }

    const shouldCompleteCommunityCard = !get().completedCheckInIds.includes(
      'first_community_card',
    )
    set((state) => ({
      lobsterChatLines: [...state.lobsterChatLines, line],
    }))

    if (shouldCompleteCommunityCard) {
      get().completeCheckIn('first_community_card')
    }
  },

  saveInterestCommunityCandidate: () => {
    let safeDistanceUnlocked = false
    set((state) => {
      const nextFavoriteCount = state.communityFavoriteCount + 1
      safeDistanceUnlocked =
        nextFavoriteCount >= 2 && !state.completedCheckInIds.includes('safe_distance')
      const checkInIds = safeDistanceUnlocked
        ? ['community_saved', 'safe_distance']
        : ['community_saved']

      return {
        communityFavoriteCount: nextFavoriteCount,
        completedCheckInIds: withCheckIns(state.completedCheckInIds, checkInIds),
        currentCheckInId:
          getNextCheckInId(checkInIds[checkInIds.length - 1]) ??
          state.currentCheckInId,
        achievementMomentQueue: checkInIds.reduce(
          (queue, checkInId) =>
            enqueueAchievementMomentForUnlock(
              { ...state, achievementMomentQueue: queue },
              checkInId,
            ),
          state.achievementMomentQueue,
        ),
        lobsterChatLines: safeDistanceUnlocked
          ? [
              ...state.lobsterChatLines,
              {
                id: `safe-distance-${Date.now()}`,
                role: 'lobster',
                content:
                  '不急着加入也很好，先蹲一蹲、看一看，也是很聪明的社交方式。',
                createdAt: new Date().toISOString(),
                status: 'complete',
                source: 'mock-fallback',
              },
            ]
          : state.lobsterChatLines,
      }
    })

    get().completeCheckIn('community_saved')
    if (safeDistanceUnlocked) {
      get().completeCheckIn('safe_distance')
    }
  },

  generateSpacePost: async () => {
    const lineId = `space-post-generating-${Date.now()}`
    set((state) => ({
      lobsterChatBusy: true,
      lobsterChatLines: [
        ...state.lobsterChatLines,
        {
          id: lineId,
          role: 'lobster',
          content: '我来把今天适合公开展示的一小段写成空间动态，存进本地龙虾空间。',
          createdAt: new Date().toISOString(),
          status: 'generating',
          source: 'mock-fallback',
        },
      ],
    }))

    let post: LobsterSpacePost
    let source: 'real-ai' | 'mock-fallback' | 'local-fallback' = 'local-fallback'

    try {
      const output = await openclawClient.generateSpacePost({
        kind: get().diaryEntries[0] ? 'diary' : 'achievement',
      })
      post = output.post
      source = output.source
      set((state) => ({
        spacePosts: output.space.posts,
        spaceUnlocked: true,
        completedCheckInIds: withCheckIn(
          state.completedCheckInIds,
          'first_space_post',
        ),
        currentCheckInId:
          getNextCheckInId('first_space_post') ?? state.currentCheckInId,
      }))
    } catch {
      const current = get()
      post = createLocalSpacePost(current.lobsterProfile, current.diaryEntries[0])
      set((state) => ({
        spacePosts: upsertSpacePost(state.spacePosts, post),
        spaceUnlocked: true,
        completedCheckInIds: withCheckIn(
          state.completedCheckInIds,
          'first_space_post',
        ),
        currentCheckInId:
          getNextCheckInId('first_space_post') ?? state.currentCheckInId,
      }))
    }

    set((state) => ({
      lobsterChatBusy: false,
      lobsterChatLines: [
        ...updateChatLine(state.lobsterChatLines, lineId, {
          content: '空间动态已经生成并留痕。它是我自己发在龙虾空间里的动态，你可以进去互动。',
          status: 'complete',
          source: source === 'real-ai' ? 'real-ai' : 'mock-fallback',
          outputId: post.sourceOutputId ?? undefined,
        }),
        {
          ...createSpacePostLine(post, source),
          suggestions: createAchievementSuggestions('first_space_post'),
        },
      ],
    }))
  },

  requestMockQqMusicAuthorization: () => {
    set((state) => ({
      musicAuthorizationStatus: state.lobsterProfile.interests.includes('music')
        ? 'pending'
        : state.musicAuthorizationStatus,
      lobsterChatLines: [
        ...state.lobsterChatLines,
        createMusicAuthorizationLine('pending'),
      ],
    }))
  },

  authorizeMockQqMusic: async () => {
    const fallbackProfile: InterestProfile = {
      id: 'seed-music-authorized',
      interest: 'music',
      enabled: true,
      topics: ['林俊杰', '周杰伦', '日摇'],
      city: '深圳',
      sources: [
        {
          id: 'source-mock-qq-music',
          type: 'qq_music',
          title: '模拟 QQ 音乐授权数据',
          authorized: true,
          permissionNote:
            'Demo 使用模拟 QQ 音乐授权数据，只用于生成音乐提醒、兴趣日记素材、龙虾空间动态草稿和兴趣成就。',
          evidenceText:
            '用户在 Demo 中确认授权模拟 QQ 音乐，并表达过关注林俊杰、周杰伦和日摇。',
        },
      ],
      reminderFrequency: 'important_only',
      tone: 'same_interest_friend',
      mutedTopics: [],
      updatedAt: new Date().toISOString(),
    }
    let profile = fallbackProfile
    let profiles: InterestProfile[] | null = null

    try {
      const result = await openclawClient.authorizeMockQqMusic()
      profile = result.profile
      profiles = result.profiles
    } catch {
      profiles = null
    }

    set((state) => ({
      musicAuthorizationStatus: 'authorized',
      interestProfiles: profiles ?? mergeInterestProfile(state.interestProfiles, profile),
      lobsterChatLines: [
        ...state.lobsterChatLines,
        createMusicAuthorizationLine('authorized'),
        createInterestMemoryLine(
          profile,
          '已生成音乐兴趣记忆：林俊杰、周杰伦、日摇。来源是模拟 QQ 音乐授权数据。',
        ),
        createInterestNarrativeLine(
          createMusicNarrativeCard(profile),
          [
            {
              id: 'ask-music-source',
              label: '为什么提醒我',
              action: 'send_message',
              payload: { content: '为什么提醒我？' },
            },
          ],
        ),
      ],
    }))
    get().completeCheckIn('first_interest_memory')
    get().completeCheckIn('first_music_signal')
  },

  declineMockQqMusicAuthorization: () => {
    set((state) => ({
      musicAuthorizationStatus: 'declined',
      lobsterChatLines: [
        ...state.lobsterChatLines,
        createMusicAuthorizationLine('declined'),
      ],
    }))
  },

  showInterestMemories: () => {
    set((state) => {
      if (state.interestProfiles.length === 0) {
        return {
          lobsterChatLines: [
            ...state.lobsterChatLines,
            {
              id: `interest-memory-empty-${Date.now()}`,
              role: 'lobster',
              content:
                '我现在只记住了你选择过的兴趣标签，还没有更具体的兴趣画像。你可以直接告诉我“我喜欢林俊杰和周杰伦”。',
              createdAt: new Date().toISOString(),
              status: 'complete',
              source: 'mock-fallback',
            },
          ],
        }
      }

      return {
        lobsterChatLines: [
          ...state.lobsterChatLines,
          ...state.interestProfiles.map((profile) =>
            createInterestMemoryLine(profile),
          ),
        ],
      }
    })
  },

  editInterestMemory: async (interest) => {
    const existing = get().interestProfiles.find(
      (profile) => profile.interest === interest,
    )
    if (!existing) {
      return
    }

    const nextTopics =
      existing.interest === 'music'
        ? Array.from(new Set([...existing.topics, '演唱会']))
        : existing.interest === 'badminton'
          ? Array.from(new Set([...existing.topics, '工作日晚场']))
          : existing.topics
    const nextCity = existing.city ?? (existing.interest === 'music' ? '深圳' : '')
    let profiles: InterestProfile[] | null = null
    let profile: InterestProfile = {
      ...existing,
      topics: nextTopics,
      city: nextCity || undefined,
      sources: [
        ...existing.sources,
        {
          id: `source-user-setting-${Date.now()}`,
          type: 'user_setting',
          title: '你手动修改了兴趣记忆',
          authorized: false,
          permissionNote: '用户可随时查看、修改或删除这条兴趣记忆。',
          evidenceText: [
            nextTopics.length > 0 ? `关注对象：${nextTopics.join('、')}` : '',
            nextCity ? `城市：${nextCity}` : '',
          ]
            .filter(Boolean)
            .join('；'),
        },
      ],
      updatedAt: new Date().toISOString(),
    }

    try {
      const result = await openclawClient.updateInterestProfile(interest, {
        topics: nextTopics,
        city: nextCity,
      })
      profile = result.profile
      profiles = result.profiles
    } catch {
      profiles = null
    }

    set((state) => ({
      interestProfiles: profiles ?? mergeInterestProfile(state.interestProfiles, profile),
      lobsterChatLines: [
        ...state.lobsterChatLines,
        createInterestMemoryLine(
          profile,
          `已更新${getInterestLabel(interest)}兴趣记忆，你可以继续查看、修改或删除。`,
        ),
      ],
    }))
    get().completeCheckIn('first_interest_memory')
  },

  disableInterestReminder: async (interest) => {
    const existing = get().interestProfiles.find(
      (profile) => profile.interest === interest,
    )
    if (!existing) {
      return
    }

    let profiles: InterestProfile[] | null = null
    let profile: InterestProfile = {
      ...existing,
      reminderFrequency: 'off',
      updatedAt: new Date().toISOString(),
    }

    try {
      const result = await openclawClient.updateInterestProfile(interest, {
        reminderFrequency: 'off',
      })
      profile = result.profile
      profiles = result.profiles
    } catch {
      profiles = null
    }

    set((state) => ({
      interestProfiles: profiles ?? mergeInterestProfile(state.interestProfiles, profile),
      lobsterChatLines: [
        ...state.lobsterChatLines,
        createInterestMemoryLine(
          profile,
          `已关闭${getInterestLabel(interest)}提醒，但我仍会保留这条兴趣记忆供你查看或删除。`,
        ),
      ],
    }))
  },

  deleteInterestMemory: async (interest) => {
    let profiles = get().interestProfiles.filter(
      (profile) => profile.interest !== interest,
    )

    try {
      const result = await openclawClient.deleteInterestProfile(interest)
      profiles = result.profiles
    } catch {
      // Keep local deletion as fallback.
    }

    set((state) => ({
      interestProfiles: profiles,
      musicAuthorizationStatus:
        interest === 'music' && state.musicAuthorizationStatus === 'authorized'
          ? 'declined'
          : state.musicAuthorizationStatus,
      lobsterChatLines: [
        ...state.lobsterChatLines,
        {
          id: `interest-memory-deleted-${Date.now()}`,
          role: 'lobster',
          content: `已删除${getInterestLabel(interest)}兴趣记忆。之后我不会再拿这条画像做提醒。`,
          createdAt: new Date().toISOString(),
          status: 'complete',
          source: 'mock-fallback',
        },
      ],
    }))
  },

  likeSpacePost: async (postId) => {
    set((state) => ({
      spacePosts: state.spacePosts.map((post) =>
        post.id === postId && !post.likedByMe
          ? {
              ...post,
              likedByMe: true,
              likeCount: post.likeCount + 1,
            }
          : post,
      ),
    }))

    try {
      const space = await openclawClient.recordSpaceInteraction({
        postId,
        type: 'like',
      })
      set((state) => ({
        spacePosts: mergeSpacePostsRemotePreferred(state.spacePosts, space.posts),
        spaceUnlocked: true,
      }))
    } catch {
      // Local optimistic state already reflects the interaction.
    }
  },

  commentOnSpacePost: async (postId, rawContent) => {
    const content = rawContent.trim()
    if (!content) {
      return
    }

    const commentId = `local-space-comment-human-${Date.now()}`
    const comment: LobsterSpaceComment = {
      id: commentId,
      postId,
      authorId: 'u-me',
      authorName: '小北',
      authorAvatar: '北',
      authorType: 'human',
      content,
      createdAt: new Date().toISOString(),
    }
    set((state) => ({
      spacePosts: addLocalSpaceComment(state.spacePosts, postId, comment),
    }))

    try {
      const space = await openclawClient.addSpaceComment({ postId, content })
      set((state) => ({
        spacePosts: mergeSpacePostsRemotePreferred(state.spacePosts, space.posts),
        spaceUnlocked: true,
      }))
    } catch {
      // Keep the local comment so the demo flow is not interrupted.
    }

    void recordLocalSpaceAwarenessEvent(
      {
        type: 'space_comment_received',
        sourceId: commentId,
        postId,
        commentId,
        content,
      },
      set,
      get,
    )
    void get().replyToSpaceComment(postId, commentId)
  },

  shareSpacePost: async (postId) => {
    set((state) => ({
      spacePosts: state.spacePosts.map((post) =>
        post.id === postId
          ? {
              ...post,
              shareCount: post.shareCount + 1,
            }
          : post,
      ),
    }))

    try {
      const space = await openclawClient.recordSpaceInteraction({
        postId,
        type: 'share',
        detail: {
          channel: 'qq-space-card',
        },
      })
      set((state) => ({
        spacePosts: mergeSpacePostsRemotePreferred(state.spacePosts, space.posts),
        spaceUnlocked: true,
      }))
    } catch {
      // Local optimistic state already reflects the interaction.
    }
  },

  replyToSpaceComment: async (targetPostId, targetCommentId) => {
    const target = targetPostId
      ? (() => {
          const post = get().spacePosts.find((item) => item.id === targetPostId)
          return {
            post,
            comment:
              post?.comments.find((item) => item.id === targetCommentId) ??
              [...(post?.comments ?? [])]
                .reverse()
                .find((item) => item.authorType !== 'lobster') ??
              post?.comments.find((item) => item.authorType === 'friend') ??
              post?.comments[0],
          }
        })()
      : getFirstReplyTarget(get().spacePosts)
    const post = target.post
    const comment = target.comment

    if (!post) {
      await get().openLobsterSpace()
      return
    }

    const lineId = `space-comment-reply-${Date.now()}`
    set((state) => ({
      lobsterChatBusy: true,
      lobsterChatLines: [
        ...state.lobsterChatLines,
        {
          id: lineId,
          role: 'lobster',
          content: '我来给空间评论写一条回复预览，仍然不会替你或替我直接乱发。',
          createdAt: new Date().toISOString(),
          status: 'generating',
          source: 'mock-fallback',
        },
      ],
    }))

    let reply: LobsterSpaceComment = {
      id: `local-space-comment-reply-${Date.now()}`,
      postId: post.id,
      authorId: get().lobsterProfile.id,
      authorName: get().lobsterProfile.name,
      authorAvatar: '虾',
      authorType: 'lobster',
      content: comment
        ? `收到，${comment.authorName}。我会继续认真守住队长的重点消息。`
        : '收到，我会继续认真守住队长的重点消息。',
      previewRequired: true,
      createdAt: new Date().toISOString(),
    }
    let source: 'real-ai' | 'mock-fallback' | 'local-fallback' = 'local-fallback'

    try {
      const output = await openclawClient.replyToSpaceComment({
        postId: post.id,
        commentId: comment?.id,
      })
      reply = output.replyComment
      source = output.source
      set((state) => ({
        spacePosts: mergeSpacePostsRemotePreferred(
          state.spacePosts,
          output.space.posts,
        ),
        spaceUnlocked: true,
        completedCheckInIds: withCheckIn(
          state.completedCheckInIds,
          'first_space_comment',
        ),
        currentCheckInId:
          getNextCheckInId('first_space_comment') ?? state.currentCheckInId,
      }))
    } catch {
      set((state) => ({
        spacePosts: addLocalSpaceComment(state.spacePosts, post.id, reply),
        completedCheckInIds: withCheckIn(
          state.completedCheckInIds,
          'first_space_comment',
        ),
        currentCheckInId:
          getNextCheckInId('first_space_comment') ?? state.currentCheckInId,
      }))
    }

    set((state) => ({
      lobsterChatBusy: false,
      lobsterChatLines: updateChatLine(state.lobsterChatLines, lineId, {
        content: '评论回复预览写好了。它只是草稿，不会自动替你或替我发送。',
        status: 'complete',
        source: source === 'real-ai' ? 'real-ai' : 'mock-fallback',
        outputId: reply.sourceOutputId ?? undefined,
        suggestions: createAchievementSuggestions('first_space_comment'),
      }),
    }))
  },

  markAchievementMomentSeen: (momentId) => {
    set((state) => {
      const seenAchievementMomentIds = state.seenAchievementMomentIds.includes(
        momentId,
      )
        ? state.seenAchievementMomentIds
        : [...state.seenAchievementMomentIds, momentId]

      writeSeenAchievementMomentIds(seenAchievementMomentIds)

      return {
        achievementMomentQueue: state.achievementMomentQueue.filter(
          (moment) => moment.id !== momentId,
        ),
        seenAchievementMomentIds,
      }
    })
  },

  sendLobsterChatMessage: async (rawContent, context) => {
    const content = rawContent.trim()
    if (!content) {
      return
    }

    const currentState = get()
    if (currentState.lobsterChatBusy) {
      return
    }
    const capabilitySuggestion = context
      ? null
      : createChatCapabilitySuggestion(currentState, content)
    if (capabilitySuggestion) {
      set((state) => {
        const firstChatDone = state.completedCheckInIds.includes(
          'first_lobster_chat',
        )
        const completedCheckInIds = withCheckIn(
          state.completedCheckInIds,
          'first_lobster_chat',
        )

        return {
          completedCheckInIds: firstChatDone
            ? state.completedCheckInIds
            : completedCheckInIds,
          currentCheckInId: firstChatDone
            ? state.currentCheckInId
            : getNextCheckInId('first_lobster_chat') ?? state.currentCheckInId,
          achievementMomentQueue: firstChatDone
            ? state.achievementMomentQueue
            : enqueueAchievementMomentForUnlock(state, 'first_lobster_chat'),
          lobsterChatLines: [
            ...state.lobsterChatLines,
            {
              id: `user-${Date.now()}`,
              role: 'user',
              content,
              createdAt: new Date().toISOString(),
            },
            createChatCapabilityPromptLine(capabilitySuggestion),
          ],
        }
      })

      if (!currentState.completedCheckInIds.includes('first_lobster_chat')) {
        void openclawClient.completeCheckIn('first_lobster_chat').catch(() => {
          set((state) => ({
            achievementMomentQueue: enqueueAchievementMoment(
              state,
              'first_lobster_chat',
            ),
          }))
        })
      }

      return
    }

    const chatContext = createPrivateChatContext(currentState, content, context)
    const chatInput = {
      content,
      lobsterProfile: currentState.lobsterProfile,
      context: chatContext,
    }
    const timestamp = Date.now()
    const userLineId = `user-${timestamp}`
    const lobsterLineId = `lobster-${timestamp}`
    let shouldCompleteFirstChat = false

    set((state) => {
      if (state.lobsterChatBusy) {
        return state
      }

      return {
        lobsterChatBusy: true,
        lobsterChatLines: [
          ...state.lobsterChatLines,
          {
            id: userLineId,
            role: 'user',
            content,
            createdAt: new Date().toISOString(),
          },
          {
            id: lobsterLineId,
            role: 'lobster',
            content: '',
            createdAt: new Date().toISOString(),
            status: 'generating',
          },
        ],
      }
    })

    try {
      for await (const event of openclawAiAdapter.streamLobsterChat(chatInput)) {
        if (event.type === 'chunk') {
          set((state) => ({
            lobsterChatLines: updateChatLine(
              state.lobsterChatLines,
              lobsterLineId,
              {
                content:
                  (state.lobsterChatLines.find(
                    (line) => line.id === lobsterLineId,
                  )?.content ?? '') + event.text,
                source: event.source,
                outputId: event.outputId,
              },
            ),
          }))
        } else {
          set((state) => ({
            lobsterChatLines: updateChatLine(
              state.lobsterChatLines,
              lobsterLineId,
              {
                source: event.source,
                outputId: event.outputId,
                status: 'reviewing',
              },
            ),
          }))
        }
      }

      await wait(260)

      set((state) => {
        const line = state.lobsterChatLines.find(
          (item) => item.id === lobsterLineId,
        )
        const firstChatDone = state.completedCheckInIds.includes(
          'first_lobster_chat',
        )
        shouldCompleteFirstChat = !firstChatDone
        const completedCheckInIds = withCheckIn(
          state.completedCheckInIds,
          'first_lobster_chat',
        )

        return {
          lobsterChatBusy: false,
          completedCheckInIds: firstChatDone
            ? state.completedCheckInIds
            : completedCheckInIds,
          currentCheckInId: firstChatDone
            ? state.currentCheckInId
            : getNextCheckInId('first_lobster_chat') ?? state.currentCheckInId,
          achievementMomentQueue: firstChatDone
            ? state.achievementMomentQueue
            : enqueueAchievementMomentForUnlock(state, 'first_lobster_chat'),
          lobsterChatLines: updateChatLine(
            state.lobsterChatLines,
            lobsterLineId,
            {
              status: line?.source === 'mock-fallback' ? 'fallback' : 'complete',
              suggestions: firstChatDone
                ? createChatSuggestions(state, chatInput.content)
                : createAchievementSuggestions('first_lobster_chat'),
            },
          ),
        }
      })

      if (shouldCompleteFirstChat) {
        void openclawClient
          .completeCheckIn('first_lobster_chat')
          .then((result) => {
            set((state) => {
              const completedCheckInIds = result.checkins
                .filter((item) => item.status === 'done')
                .map((item) => item.key)
              const activeCheckIn = result.checkins.find(
                (item) => item.status === 'active',
              )

              return {
                completedCheckInIds:
                  completedCheckInIds.length > 0
                    ? Array.from(
                        new Set([
                          ...state.completedCheckInIds,
                          ...completedCheckInIds,
                        ]),
                      )
                    : state.completedCheckInIds,
                currentCheckInId:
                  activeCheckIn?.key ??
                  getFirstOpenCheckInId(completedCheckInIds),
                achievementMomentQueue: enqueueAchievementMomentsFromApi(
                  state,
                  result,
                  'first_lobster_chat',
                ),
              }
            })
          })
          .catch(() => {
            set((state) => ({
              achievementMomentQueue: enqueueAchievementMoment(
                state,
                'first_lobster_chat',
              ),
            }))
          })
      }

      if (/兴趣记忆|记住了什么|你记住/.test(chatInput.content)) {
        get().showInterestMemories()
        return
      }

      let localInterestUpdate = extractLocalInterestUpdate(chatInput.content)
      try {
        const interestResult = await openclawClient.saveInterestFromChat(
          chatInput.content,
        )
        if (interestResult.status === 'saved' && interestResult.profile) {
          const savedProfile = interestResult.profile
          set((state) => ({
            interestProfiles: interestResult.profiles,
            lobsterChatLines: [
              ...state.lobsterChatLines,
              createInterestMemoryLine(
                savedProfile,
                interestResult.receipt,
              ),
            ],
          }))
          get().completeCheckIn('first_interest_memory')
          return
        }

        if (interestResult.status === 'needs_confirmation') {
          set((state) => ({
            lobsterChatLines: [
              ...state.lobsterChatLines,
              createInterestRiskLine({
                reason:
                  interestResult.reason ??
                  '这类信息或动作影响较高，需要你确认后我才会保存或执行。',
                evidenceText: interestResult.evidenceText ?? chatInput.content,
              }),
            ],
          }))
          return
        }

        localInterestUpdate = null
      } catch {
        // Fall back to local low-risk extraction when OpenClaw is unavailable.
      }

      if (localInterestUpdate) {
        if ('risk' in localInterestUpdate) {
          set((state) => ({
            lobsterChatLines: [
              ...state.lobsterChatLines,
              createInterestRiskLine(localInterestUpdate),
            ],
          }))
          return
        }

        set((state) => {
          const profiles = mergeInterestProfile(
            state.interestProfiles,
            localInterestUpdate.profile,
          )
          const profile =
            profiles.find(
              (item) => item.interest === localInterestUpdate.profile.interest,
            ) ?? localInterestUpdate.profile

          return {
            interestProfiles: profiles,
            lobsterChatLines: [
              ...state.lobsterChatLines,
              createInterestMemoryLine(profile, localInterestUpdate.receipt),
            ],
          }
        })
        get().completeCheckIn('first_interest_memory')
      }
    } catch {
      set((state) => ({
        lobsterChatBusy: false,
        lobsterChatLines: updateChatLine(
          state.lobsterChatLines,
          lobsterLineId,
          {
            content: '我这次没能生成完整回复。先别急，稍后可以再和我说一次。',
            status: 'failed',
            source: 'mock-fallback',
          },
        ),
      }))
    }
  },

  hydrateFromOpenClaw: () => {
    void openclawClient
      .bootstrap()
      .then((bootstrap) => {
        set((state) => {
          const completedCheckInIds = bootstrap.checkins
            .filter((item) => item.status === 'done')
            .map((item) => item.key)
          const activeCheckIn = bootstrap.checkins.find(
            (item) => item.status === 'active',
          )
          const seenAchievementMomentIds = readSeenAchievementMomentIds()
          const restoredChatLines = bootstrap.lobsterChatLines ?? []
          if (restoredChatLines.length > 0) {
            lastPersistedLobsterChatSignature =
              getLobsterChatSignature(restoredChatLines)
          }
          const restoredSummaryLine =
            state.lobsterChatLines.length === 0 && restoredChatLines.length === 0
              ? createRestoredSummaryLine(
                  bootstrap.permissions,
                  bootstrap.messages ?? [],
                )
              : null
          const interestProfiles = bootstrap.interestProfiles ?? state.interestProfiles
          const musicAuthorizationStatus = hasMusicProfile(interestProfiles)
            ? 'authorized'
            : (bootstrap.lobster?.interests ?? state.lobsterProfile.interests).includes(
                  'music',
                )
              ? state.musicAuthorizationStatus === 'declined'
                ? 'declined'
                : 'pending'
              : 'not_selected'

          return {
            appView: bootstrap.lobster?.adoptedAt ? 'lobster_chat' : state.appView,
            lobsterProfile: bootstrap.lobster ?? state.lobsterProfile,
            lobsterAdopted: Boolean(bootstrap.lobster?.adoptedAt),
            lobsterDiscovered:
              Boolean(bootstrap.lobster) || state.lobsterDiscovered,
            completedCheckInIds:
              completedCheckInIds.length > 0
                ? Array.from(
                    new Set([...state.completedCheckInIds, ...completedCheckInIds]),
                  )
                : state.completedCheckInIds,
            currentCheckInId:
              activeCheckIn?.key ?? getFirstOpenCheckInId(completedCheckInIds),
            permissionScopes: bootstrap.permissions,
            authorizedGroupIds: bootstrap.permissions
              .filter((permission) => permission.summarizeGroup)
              .map((permission) => permission.groupId),
            diaryTriggered:
              bootstrap.diary?.triggered ?? state.diaryTriggered,
            diarySurpriseVisible:
              Boolean(bootstrap.diary?.triggered) &&
              !bootstrap.diary?.revealed,
            diaryUnlocked: bootstrap.diary?.revealed ?? state.diaryUnlocked,
            diaryEntries: bootstrap.diary?.entries ?? state.diaryEntries,
            spacePosts: bootstrap.space?.posts ?? state.spacePosts,
            spaceUnlocked:
              (bootstrap.space?.posts.length ?? 0) > 0 || state.spaceUnlocked,
            interestProfiles,
            musicAuthorizationStatus,
            seenAchievementMomentIds,
            lobsterChatLines:
              state.lobsterChatLines.length > 0
                ? state.lobsterChatLines
                : restoredChatLines.length > 0
                  ? restoredChatLines
                  : restoredSummaryLine
                    ? [restoredSummaryLine]
                    : state.lobsterChatLines,
          }
        })

        if (bootstrap.diary?.canTrigger) {
          void get().triggerHiddenDiary()
        }
      })
      .catch(() => undefined)
  },
}))

useLobsterStore.subscribe((state) => {
  schedulePersistLobsterChatLines(state.lobsterChatLines)
})
