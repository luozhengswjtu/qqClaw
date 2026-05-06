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
  mockQqMusicListeningSnapshot,
} from '../data/mockData'
import type {
  Achievement,
  AchievementMoment,
  DemoEvent,
  DemoRuntimeState,
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

interface PendingInterestEdit {
  interest: Interest
  startedAt: string
}

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
  pendingInterestEdit: PendingInterestEdit | null
  communityFavoriteCount: number
  demoRuntimeState: DemoRuntimeState
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
  resetDemoRuntimeState: () => void
  evaluateDemoTriggers: (event: DemoEvent) => void
  evaluateOffChatPushes: () => void
  sendLobsterChatMessage: (
    content: string,
    context?: LobsterChatContext,
  ) => Promise<void>
  requestGroupPermissions: (targetLineId?: string) => void
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
    targetLineId?: string,
  ) => Promise<void>
  generateWorkLog: (targetLineId?: string) => Promise<void>
  triggerHiddenDiary: () => Promise<void>
  openHiddenDiary: () => Promise<void>
  generateHiddenDiaryImage: () => Promise<void>
  openDiaryHistory: () => void
  openLobsterSpace: () => Promise<void>
  generateSpacePost: (targetLineId?: string) => Promise<void>
  generateInterestSpacePostPreview: (targetLineId?: string) => Promise<void>
  publishInterestSpacePostPreview: (postId: string) => Promise<void>
  requestMockQqMusicAuthorization: (targetLineId?: string) => void
  authorizeMockQqMusic: () => Promise<void>
  declineMockQqMusicAuthorization: () => void
  installMusicSkills: () => Promise<void>
  showMusicInterestReminder: (targetLineId?: string) => Promise<void>
  showInterestSpacePreview: (targetLineId?: string) => Promise<void>
  showInterestCommunity: (targetLineId?: string) => Promise<void>
  saveInterestCommunityCandidate: () => void
  showInterestMemories: (targetLineId?: string) => Promise<void>
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

type LobsterAction = Pick<
  LobsterAppState,
  | 'spacePosts'
  | 'completedCheckInIds'
  | 'requestGroupPermissions'
  | 'requestReplyDraft'
  | 'generateWorkLog'
  | 'generateSpacePost'
  | 'triggerHiddenDiary'
  | 'replyToSpaceComment'
  | 'showInterestMemories'
  | 'requestMockQqMusicAuthorization'
  | 'showMusicInterestReminder'
  | 'showInterestSpacePreview'
  | 'showInterestCommunity'
>

const initialAdoptionDraft: AdoptionDraft = {
  lobsterName: defaultLobsterProfile.name,
  userCallsign: defaultLobsterProfile.userCallsign,
  personality: defaultLobsterProfile.personality,
  interests: defaultLobsterProfile.interests,
}

const initialDemoRuntimeState: DemoRuntimeState = {
  introCompleted: false,
  introPromptShown: false,
  qqMusicAuthorizationPromptShown: false,
  qqMusicAuthorizationLoading: false,
  musicSkillCardShown: false,
  musicSkillsInstalling: false,
  musicSkillsInstalled: false,
  musicTalkCount: 0,
  communityRecommendationShown: false,
  diaryPrewarmStarted: false,
  diaryRevealPromptShown: false,
  musicPushSent: false,
  behaviorPushSent: false,
  leftChatAt: null,
  pendingSpaceReplyCount: 0,
}

const diaryPrewarmAccessoryThreshold = 3
const diaryRevealPromptText =
  '\u6211\u5199\u4e86\u4e00\u7bc7\u65e5\u8bb0\uff0c\u4f60\u8981\u770b\u770b\u4e48'
const behaviorPushAchievementThreshold = 8
const musicTopicStreakThreshold = 3
const accessoryRewardCheckInIds = [
  'first_lobster_chat',
  'first_space_post',
  'community_saved',
  'first_skill_install',
]
const offChatPushDelayMs = 60_000
let offChatPushTimer: ReturnType<typeof window.setTimeout> | null = null
const fallbackDiaryImageUrl =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 640 640%22%3E%3Crect width=%22640%22 height=%22640%22 rx=%2248%22 fill=%22%23fff2dd%22/%3E%3Ccircle cx=%22320%22 cy=%22336%22 r=%22122%22 fill=%22%23ff8a65%22/%3E%3Cellipse cx=%22244%22 cy=%22292%22 rx=%2254%22 ry=%2240%22 fill=%22%23ff7043%22/%3E%3Cellipse cx=%22396%22 cy=%22292%22 rx=%2254%22 ry=%2240%22 fill=%22%23ff7043%22/%3E%3Ccircle cx=%22276%22 cy=%22324%22 r=%2216%22 fill=%22%23222%22/%3E%3Ccircle cx=%22364%22 cy=%22324%22 r=%2216%22 fill=%22%23222%22/%3E%3Cpath d=%22M288 372c18 20 46 20 64 0%22 fill=%22none%22 stroke=%22%23222%22 stroke-width=%2212%22 stroke-linecap=%22round%22/%3E%3Cpath d=%22M206 248 112 180M434 248l94-68%22 fill=%22none%22 stroke=%22%23ff7043%22 stroke-width=%2218%22 stroke-linecap=%22round%22/%3E%3Cpath d=%22M150 156c-18 18-18 48 0 66M490 156c18 18 18 48 0 66%22 fill=%22none%22 stroke=%22%23ff7043%22 stroke-width=%2220%22 stroke-linecap=%22round%22/%3E%3Crect x=%22212%22 y=%22470%22 width=%22216%22 height=%2252%22 rx=%2226%22 fill=%22%23ffffff%22 opacity=%22.82%22/%3E%3Cpath d=%22M260 497h120%22 stroke=%22%23ff7043%22 stroke-width=%2212%22 stroke-linecap=%22round%22/%3E%3C/svg%3E'

function createInitialDemoRuntimeState(): DemoRuntimeState {
  return { ...initialDemoRuntimeState }
}

function isDemoMusicTopic(content?: string) {
  const text = content?.trim() ?? ''
  if (!text) {
    return false
  }

  return /QQ\s*音乐|音乐|听歌|歌手|新歌|演唱会|专辑|曲风|歌词|歌单|旋律|林俊杰|周杰伦|日摇|摇滚|民谣|电子|livehouse/i.test(
    text,
  )
}

function getCompletedDemoAchievementCount(completedCheckInIds: string[]) {
  return mockAchievements.filter(
    (achievement) =>
      achievement.triggerCheckInId &&
      completedCheckInIds.includes(achievement.triggerCheckInId),
  ).length
}

function scheduleOffChatPushCheck(callback: () => void, delayMs = offChatPushDelayMs) {
  if (typeof window === 'undefined') {
    return
  }

  if (offChatPushTimer) {
    window.clearTimeout(offChatPushTimer)
  }

  offChatPushTimer = window.setTimeout(() => {
    offChatPushTimer = null
    callback()
  }, delayMs)
}

function clearOffChatPushCheck() {
  if (typeof window === 'undefined' || !offChatPushTimer) {
    return
  }

  window.clearTimeout(offChatPushTimer)
  offChatPushTimer = null
}

function getOffChatElapsedMs(leftChatAt: string | null) {
  if (!leftChatAt) {
    return 0
  }

  const leftAtMs = Date.parse(leftChatAt)
  return Number.isFinite(leftAtMs) ? Date.now() - leftAtMs : 0
}

function scheduleOffChatPushEvaluation(
  state: LobsterAppState,
  callback: () => void,
) {
  if (state.appView === 'lobster_chat' || !state.demoRuntimeState.leftChatAt) {
    clearOffChatPushCheck()
    return
  }

  scheduleOffChatPushCheck(
    callback,
    Math.max(
      0,
      offChatPushDelayMs - getOffChatElapsedMs(state.demoRuntimeState.leftChatAt),
    ),
  )
}

function applyDemoEvent(
  state: LobsterAppState,
  event: DemoEvent,
): DemoRuntimeState {
  const runtime = state.demoRuntimeState

  switch (event.type) {
    case 'chat.sent':
      return {
        ...runtime,
        musicTalkCount: isDemoMusicTopic(event.content)
          ? runtime.musicTalkCount + 1
          : 0,
      }
    case 'chat.response.completed':
      return event.content && /我是你的小龙虾|授权\s*QQ\s*音乐/i.test(event.content)
        ? {
            ...runtime,
            introCompleted: true,
            qqMusicAuthorizationPromptShown: true,
          }
        : runtime
    case 'music.authorization.started':
      return {
        ...runtime,
        qqMusicAuthorizationPromptShown: true,
        qqMusicAuthorizationLoading: true,
      }
    case 'music.authorization.completed':
      return {
        ...runtime,
        qqMusicAuthorizationPromptShown: true,
        qqMusicAuthorizationLoading: false,
        musicSkillCardShown: true,
      }
    case 'music.skill.installed':
      return {
        ...runtime,
        musicSkillsInstalling: false,
        musicSkillsInstalled: true,
      }
    case 'achievement.unlocked': {
      const completedCheckInIds = event.checkInId
        ? withCheckIn(state.completedCheckInIds, event.checkInId)
        : state.completedCheckInIds
      const accessoryRewardCount =
        getCompletedAccessoryRewardCount(completedCheckInIds)

      return {
        ...runtime,
        diaryPrewarmStarted:
          runtime.diaryPrewarmStarted ||
          accessoryRewardCount >= diaryPrewarmAccessoryThreshold,
        diaryRevealPromptShown: runtime.diaryRevealPromptShown,
      }
    }
    case 'view.left_lobster_chat':
      return {
        ...runtime,
        leftChatAt: event.leftAt ?? new Date().toISOString(),
      }
    case 'view.entered_lobster_chat':
      return {
        ...runtime,
        leftChatAt: null,
      }
    case 'space.comment.created':
      return state.appView === 'lobster_space'
        ? runtime
        : {
            ...runtime,
            pendingSpaceReplyCount: runtime.pendingSpaceReplyCount + 1,
          }
    default:
      return runtime
  }
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
    capability: 'work_log',
    label: '查看工作记录',
    allowedFromChat: true,
    requiresConfirmation: true,
    riskLevel: 'low',
    reason: '用户明确要求查看小龙虾今天做过的事。',
    matchers: [
      /今天.*(你都做了什么|你做了什么|做过什么)/,
      /(工作记录|透明小本本|你做过的事)/,
    ],
  },
  {
    capability: 'space_post',
    label: '生成空间动态',
    allowedFromChat: true,
    requiresConfirmation: true,
    riskLevel: 'medium',
    reason: '用户明确要求让小龙虾生成一条龙虾空间动态。',
    matchers: [
      /帮你发一条龙虾空间动态/,
      /(发|发布).*(龙虾空间动态|空间动态)/,
    ],
  },
  {
    capability: 'space_comment',
    label: '看看空间评论',
    allowedFromChat: true,
    requiresConfirmation: true,
    riskLevel: 'low',
    reason: '用户明确要求去龙虾空间查看评论并体验回复。',
    matchers: [
      /(龙虾空间|空间).*(评论|回复)/,
      /看看评论/,
    ],
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
    capability: 'request_music_authorization',
    label: '授权 QQ 音乐',
    allowedFromChat: true,
    requiresConfirmation: true,
    riskLevel: 'medium',
    reason: '用户明确确认要授权 QQ 音乐。',
    matchers: [
      /(确认|同意|可以|授权).*(QQ\s*音乐|qq\s*音乐)/i,
      /(QQ\s*音乐|qq\s*音乐).*(确认|同意|可以|授权)/i,
    ],
  },
  {
    capability: 'interest_space_preview',
    label: '生成空间动态',
    allowedFromChat: true,
    requiresConfirmation: true,
    riskLevel: 'medium',
    reason: '用户明确要求把兴趣内容生成龙虾空间动态。',
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
      /(看看|查看|打开|讲讲).*(音乐提醒|音乐动态|歌手.*动态|新动态)/,
      /歌手有什么新动态/,
      /最近的音乐动态/,
    ],
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
      /公开资料.*同好群/,
    ],
  },
]

const achievementExperienceCapabilityMap: Record<string, string> = {
  '小钳，帮我设置一个群聊总结提醒': 'summarize_group_messages',
  '小钳，帮我写一条回复草稿': 'reply_draft',
  '小钳，今天你都做了什么': 'work_log',
  '小钳，帮你发一条龙虾空间动态吧': 'space_post',
  '小钳，我们去龙虾空间看看评论': 'space_comment',
  '小钳，看看你记住了我的什么兴趣': 'interest_memory',
  '小钳，给我讲讲最近的音乐动态': 'interest_music_reminder',
  '小钳，把音乐动态生成一条空间动态预览': 'interest_space_preview',
  '小钳，把音乐动态生成一条空间动态': 'interest_space_preview',
  '小钳，帮我看看有没有公开资料里的同好群': 'interest_community',
  '小钳，帮我看看有没有公开资料里的同好群，我想先收藏一下':
    'interest_community',
}

function withCheckIn(checkIns: string[], checkInId: string) {
  return checkIns.includes(checkInId) ? checkIns : [...checkIns, checkInId]
}

function withCheckIns(checkIns: string[], checkInIds: string[]) {
  return checkInIds.reduce(withCheckIn, checkIns)
}

function withAccessoryCompletionCheckIn(checkIns: string[]) {
  const allAccessoriesUnlocked = accessoryRewardCheckInIds.every((checkInId) =>
    checkIns.includes(checkInId),
  )

  return allAccessoriesUnlocked
    ? withCheckIn(checkIns, 'four_accessories_unlocked')
    : checkIns
}

function withCompletedCheckIns(checkIns: string[], checkInIds: string[]) {
  return withAccessoryCompletionCheckIn(withCheckIns(checkIns, checkInIds))
}

function getCompletedAccessoryRewardCount(checkIns: string[]) {
  return accessoryRewardCheckInIds.filter((checkInId) =>
    checkIns.includes(checkInId),
  ).length
}

function hasPendingDiaryRevealPrompt(
  state: Pick<
    LobsterAppState,
    'diaryTriggered' | 'diaryUnlocked' | 'diaryEntries' | 'demoRuntimeState'
  >,
) {
  return (
    state.diaryTriggered &&
    state.diaryEntries.length > 0 &&
    !state.diaryUnlocked &&
    !state.demoRuntimeState.diaryRevealPromptShown
  )
}

function createOpenHiddenDiarySuggestion(): LobsterSuggestion {
  return {
    id: 'open-hidden-diary',
    label:
      '\u770b\u770b\u4f60\u5199\u7684\u65e5\u8bb0',
    action: 'run_capability',
    payload: { capability: 'open_hidden_diary' },
  }
}

function withOpenHiddenDiarySuggestion(suggestions?: LobsterSuggestion[]) {
  const current = suggestions ?? []
  return current.some(
    (suggestion) => suggestion.payload?.capability === 'open_hidden_diary',
  )
    ? current
    : [...current, createOpenHiddenDiarySuggestion()]
}

function appendDiaryRevealPromptToContent(content: string) {
  const normalizedContent = content.trim()
  if (normalizedContent.includes(diaryRevealPromptText)) {
    return normalizedContent
  }

  return normalizedContent
    ? `${normalizedContent}\n\n${diaryRevealPromptText}`
    : diaryRevealPromptText
}

function consumePendingDiaryRevealPrompt(
  state: LobsterAppState,
  content: string,
  suggestions: LobsterSuggestion[] | undefined,
  shouldConsume: boolean,
  demoRuntimeState = state.demoRuntimeState,
) {
  const shouldAppend =
    shouldConsume &&
    hasPendingDiaryRevealPrompt({ ...state, demoRuntimeState })

  return {
    content: shouldAppend
      ? appendDiaryRevealPromptToContent(content)
      : content,
    suggestions: shouldAppend
      ? withOpenHiddenDiarySuggestion(suggestions)
      : suggestions,
    demoRuntimeState: shouldAppend
      ? { ...demoRuntimeState, diaryRevealPromptShown: true }
      : demoRuntimeState,
  }
}

function consumePendingDiaryRevealPromptOnLine(
  state: LobsterAppState,
  lineId: string,
  shouldConsume: boolean,
) {
  const line = state.lobsterChatLines.find((item) => item.id === lineId)
  if (!line) {
    return {
      lobsterChatLines: state.lobsterChatLines,
      demoRuntimeState: state.demoRuntimeState,
    }
  }

  const promptResult = consumePendingDiaryRevealPrompt(
    state,
    line.content,
    line.suggestions,
    shouldConsume,
  )

  return {
    lobsterChatLines: updateChatLine(state.lobsterChatLines, lineId, {
      content: promptResult.content,
      suggestions: promptResult.suggestions,
    }),
    demoRuntimeState: promptResult.demoRuntimeState,
  }
}

function completeInterestTopicStreakIfReady(state: LobsterAppState) {
  return state.demoRuntimeState.musicTalkCount >= musicTopicStreakThreshold
    ? withCompletedCheckIns(state.completedCheckInIds, [
        'interest_topic_streak_3',
      ])
    : state.completedCheckInIds
}

function applyDemoAchievementThresholds(
  state: Pick<LobsterAppState, 'completedCheckInIds' | 'demoRuntimeState'>,
) {
  const accessoryRewardCount = getCompletedAccessoryRewardCount(
    state.completedCheckInIds,
  )

  return {
    ...state.demoRuntimeState,
    diaryPrewarmStarted:
      state.demoRuntimeState.diaryPrewarmStarted ||
      accessoryRewardCount >= diaryPrewarmAccessoryThreshold,
    diaryRevealPromptShown: state.demoRuntimeState.diaryRevealPromptShown,
  }
}

function getLocalDiaryEligibility(completedCheckInIds: string[]) {
  const achievementCount = getCompletedDemoAchievementCount(completedCheckInIds)
  const accessoryRewardCount =
    getCompletedAccessoryRewardCount(completedCheckInIds)

  return {
    achievementCount,
    canPrewarm: accessoryRewardCount >= diaryPrewarmAccessoryThreshold,
    canRevealPrompt: accessoryRewardCount >= diaryPrewarmAccessoryThreshold,
  }
}

function triggerHiddenDiaryIfEligible(actions: LobsterAction) {
  if (getLocalDiaryEligibility(actions.completedCheckInIds).canPrewarm) {
    void actions.triggerHiddenDiary()
  }
}

function getOffChatPushEligibility(state: LobsterAppState) {
  const achievementCount = getCompletedDemoAchievementCount(state.completedCheckInIds)
  const awayLongEnough =
    state.appView !== 'lobster_chat' &&
    getOffChatElapsedMs(state.demoRuntimeState.leftChatAt) >= offChatPushDelayMs

  return {
    achievementCount,
    awayLongEnough,
    canSendBehavior:
      awayLongEnough &&
      achievementCount >= behaviorPushAchievementThreshold &&
      state.demoRuntimeState.musicPushSent &&
      !state.demoRuntimeState.behaviorPushSent,
  }
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

function createLocalDisplayChunks(text: string) {
  const chars = Array.from(text)
  const chunks: string[] = []

  for (let index = 0; index < chars.length; index += 8) {
    chunks.push(chars.slice(index, index + 8).join(''))
  }

  return chunks.length > 0 ? chunks : [text]
}

function getLocalChunkDelayMs(chunk: string) {
  const sentencePause = /[\n。！？!?]/.test(chunk) ? 60 : 0
  const commaPause = !sentencePause && /[，,；;：:、]/.test(chunk) ? 35 : 0

  return Array.from(chunk).length * 12 + sentencePause + commaPause
}

async function streamLocalLineContent(
  lineId: string,
  text: string,
  setState: (
    patch:
      | Partial<LobsterAppState>
      | ((state: LobsterAppState) => Partial<LobsterAppState>),
  ) => void,
) {
  await wait(360)

  for (const chunk of createLocalDisplayChunks(text)) {
    setState((state) => ({
      lobsterChatLines: updateChatLine(state.lobsterChatLines, lineId, {
        content:
          (state.lobsterChatLines.find((line) => line.id === lineId)?.content ??
            '') + chunk,
        source: 'mock-fallback',
      }),
    }))
    await wait(getLocalChunkDelayMs(chunk))
  }
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

const maxDemoSummaryGroups = 3
const defaultSummaryScheduleTime = '21:30'

function createDefaultPermissions(groupId = getPrimaryGroupId()) {
  return {
    groupId,
    collectMentions: true,
    summarizeGroup: true,
    draftReply: true,
    diaryMaterial: true,
    summaryScheduleTime: defaultSummaryScheduleTime,
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

function canPrewarmLocalDiary(state: LobsterAppState) {
  return (
    state.lobsterAdopted &&
    getLocalDiaryEligibility(state.completedCheckInIds).canPrewarm
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

function createFallbackDiaryImageAsset(entry: LobsterDiaryEntry) {
  return {
    id: `local-diary-image-fallback-${entry.id}-${Date.now()}`,
    type: 'image',
    url: fallbackDiaryImageUrl,
    mimeType: 'image/svg+xml',
    prompt: entry.quote,
    source: 'local-fallback' as const,
    provider: 'local-fallback',
    model: 'q-lobster-placeholder',
    createdAt: new Date().toISOString(),
  }
}

function withFallbackDiaryImage(entry: LobsterDiaryEntry): LobsterDiaryEntry {
  return {
    ...entry,
    image: entry.image ?? createFallbackDiaryImageAsset(entry),
  }
}

function isFrontendImageUrl(url?: string) {
  const text = url?.trim() ?? ''

  return /^(https?:|data:image\/|blob:|\/)/i.test(text)
}

function normalizeDiaryEntryImage(entry: LobsterDiaryEntry): LobsterDiaryEntry {
  if (!entry.image) {
    return entry
  }

  return isFrontendImageUrl(entry.image.url)
    ? entry
    : {
        ...entry,
        image: createFallbackDiaryImageAsset(entry),
      }
}

function normalizeDiaryEntries(entries: LobsterDiaryEntry[]) {
  return entries.map(normalizeDiaryEntryImage)
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

function createInterestMusicSpacePostContent(profile?: InterestProfile) {
  const topics = profile?.topics.slice(0, 3)
  const topicText = topics?.length ? topics.join('、') : '林俊杰、周杰伦和日摇'
  const city = profile?.city ?? '深圳'

  return [
    `今天把 ${topicText} 的音乐动态重新整理了一遍。`,
    `${city} 相关演出和新歌消息里，有几条适合留意，但我先只把来源和兴趣线索收好。`,
    '要不要继续追，交给主人决定；我负责把这份期待记成一条小小的同好动态。',
  ].join('\n')
}

function createLocalSpacePost(
  profile: LobsterProfile,
  entry?: LobsterDiaryEntry,
  event?: OpenClawSpaceAwarenessEventInput,
  withSeedComments = false,
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
  const comments = withSeedComments ? createLocalSpaceComments(postId) : []

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
    content: '我已经把这条动态发进龙虾空间。',
    createdAt: new Date().toISOString(),
    status: 'complete',
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

function createInterestSpacePostFollowUps(): LobsterSuggestion[] {
  return [
    {
      id: 'open-interest-space-post',
      label: '进龙虾空间',
      action: 'open_view',
      payload: { view: 'lobster_space' },
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
  ]
}

function createPublishedInterestSpacePostLine(
  post: LobsterSpacePost,
  source: 'real-ai' | 'mock-fallback' | 'local-fallback',
  interest?: Interest,
  sourceLabel?: string,
  sourceType?: InterestNarrativeCard['sourceType'],
) {
  return {
    ...createSpacePostLine(
      post,
      source,
      false,
      interest,
      sourceLabel,
      sourceType,
    ),
    content: '我把这条音乐动态写成空间动态，并已经发进龙虾空间。',
    suggestions: [
      ...createInterestSpacePostFollowUps(),
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
      ? (() => {
          const comments = post.comments.some((item) => item.id === comment.id)
            ? post.comments.map((item) =>
                item.id === comment.id ? comment : item,
              )
            : [...post.comments, comment]

          return {
            ...post,
            comments,
            commentCount: comments.length,
          }
        })()
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
        if (event.type === 'work_log_created') {
          return
        }

        setState((state) => ({
          spacePosts: upsertSpacePost(state.spacePosts, postedPost),
        spaceUnlocked: true,
        completedCheckInIds: withCompletedCheckIns(state.completedCheckInIds, [
          'first_space_post',
        ]),
        currentCheckInId:
          getNextCheckInId('first_space_post') ?? state.currentCheckInId,
      }))
      triggerHiddenDiaryIfEligible(getState())
    }
    return
  } catch {
    const shouldPost =
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
      completedCheckInIds: withCompletedCheckIns(state.completedCheckInIds, [
        'first_space_post',
      ]),
      currentCheckInId:
        getNextCheckInId('first_space_post') ?? state.currentCheckInId,
    }))
    triggerHiddenDiaryIfEligible(getState())
  }
}

function getCheckInFeedback(checkInId: string) {
  const feedback: Record<string, string> = {
    first_lobster_chat:
      '我记住啦，这是我的第一面小红旗。可以看看墙面，也可以让我试着捞群消息。',
    first_group_permission:
      '第一张群聊总结卡整理好了。卡片里可以看来源、展开摘要或写回复草稿。',
    first_space_post:
      '空间动态已经由我自己发进龙虾空间。可以进去看看互动。',
    first_space_comment:
      '评论也回好了。我会继续留意龙虾空间里的互动。',
    community_saved:
      '我先帮你把这个推荐 QQ 群收藏起来，小音符也点亮了。',
    first_diary_view:
      '第一条日记已经打开了，我会继续把重要的小事写清楚。',
    first_skill_install:
      '音乐小技能装好了，耳机挂饰也点亮了。',
    first_interest_feed_view:
      '这条音乐兴趣动态我记下了，后面会继续按你的兴趣轻轻提醒。',
    interest_topic_streak_3:
      '连续三次都聊到音乐了，我知道这真的是你的兴趣重点。',
    four_accessories_unlocked:
      '四个挂饰都点亮了，小钳的小背包现在完整了。',
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

function isLegacyInterestSpacePublishSuggestion(suggestion: LobsterSuggestion) {
  const capability =
    typeof suggestion.payload?.capability === 'string'
      ? suggestion.payload.capability
      : ''

  return capability === 'publish_interest_space_post'
}

function normalizeRestoredLobsterChatContent(content: string) {
  return content
    .replace(
      '可以，我先把音乐动态改成一条空间动态预览，不会自动发布。',
      '可以，我把音乐动态写成一条空间动态，并直接放进龙虾空间。',
    )
    .replace(
      '小钳，把音乐动态生成一条空间动态预览',
      '小钳，把音乐动态生成一条空间动态',
    )
}

function normalizeRestoredLobsterChatLine(line: LobsterChatLine): LobsterChatLine {
  const shouldAutoPublishRestoredInterestPost =
    line.card?.type === 'space_post_card' &&
    line.card.previewRequired &&
    Boolean(line.card.interest)
  const hasLegacyPublishSuggestion =
    line.suggestions?.some(isLegacyInterestSpacePublishSuggestion) ?? false
  const content = normalizeRestoredLobsterChatContent(line.content)
  const hasLegacyContent = content !== line.content

  if (
    !shouldAutoPublishRestoredInterestPost &&
    !hasLegacyPublishSuggestion &&
    !hasLegacyContent
  ) {
    return line
  }

  return {
    ...line,
    content,
    card:
      shouldAutoPublishRestoredInterestPost &&
      line.card?.type === 'space_post_card'
        ? {
            ...line.card,
            previewRequired: false,
          }
        : line.card,
    suggestions: hasLegacyPublishSuggestion
      ? line.suggestions?.filter(
          (suggestion) => !isLegacyInterestSpacePublishSuggestion(suggestion),
        )
      : line.suggestions,
  }
}

function normalizeRestoredLobsterChatLines(lines: LobsterChatLine[]) {
  return lines.map(normalizeRestoredLobsterChatLine)
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

  if (checkInId === 'community_saved') {
    return addFeedbackPayload(
      [
        {
          id: 'community-source',
          label: '看群来源',
          action: 'send_message',
          payload: { content: '这个同好群的来源是什么？' },
        },
        {
          id: 'more-communities',
          label: '继续找群',
          action: 'run_capability',
          payload: { capability: 'interest_community' },
        },
        {
          id: 'view-achievement-wall',
          label: '看成就墙',
          action: 'open_view',
          payload: { view: 'lobster_chat' },
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

function createIntroSuggestion(label = '你好呀，介绍你自己'): LobsterSuggestion {
  return {
    id: 'intro-self-introduction',
    label,
    action: 'send_message',
    payload: { content: '你好呀，介绍你自己' },
  }
}

function createQqMusicAuthorizationSuggestion(): LobsterSuggestion {
  return {
    id: 'authorize-qq-music',
    label: '授权 QQ 音乐',
    action: 'run_capability',
    payload: { capability: 'request_music_authorization' },
  }
}

function isIntroRequest(content: string) {
  return /介绍.*(自己|你)|你是谁|认识你|自我介绍|你好呀，介绍你自己/.test(content)
}

function createIntroCompletedSuggestions(state: LobsterAppState): LobsterSuggestion[] {
  const canRequestMusicAuthorization =
    state.lobsterProfile.interests.includes('music') &&
    state.musicAuthorizationStatus !== 'authorized' &&
    state.musicAuthorizationStatus !== 'declined' &&
    !state.demoRuntimeState.qqMusicAuthorizationPromptShown

  return canRequestMusicAuthorization
    ? [createQqMusicAuthorizationSuggestion()]
    : createAchievementSuggestions('first_lobster_chat')
}

function createAdoptionGreetingLine(profile: LobsterProfile): LobsterChatLine {
  return {
    id: `adoption-greeting-${Date.now()}`,
    role: 'lobster',
    content: [
      `你好呀，${profile.userCallsign}。`,
      `我叫${profile.name}，刚刚搬进你的 QQ 里。`,
      '以后我会慢慢记住你的习惯，也会把自己养得更像你的小伙伴。',
    ].join('\n'),
    createdAt: new Date().toISOString(),
    status: 'complete',
    source: 'mock-fallback',
    suggestions: [createIntroSuggestion()],
  }
}

function getMusicPushTopic(state: LobsterAppState) {
  const profile = state.interestProfiles.find(
    (item) => item.interest === 'music' && item.enabled,
  )
  const topic = profile?.topics[0]
  const secondaryTopic = profile?.topics[1]
  const city = profile?.city

  return {
    topic: topic ?? '最近常听的歌',
    secondaryTopic,
    city,
  }
}

function createOffChatBehaviorPushLine(state: LobsterAppState): LobsterChatLine {
  const { secondaryTopic, topic } = getMusicPushTopic(state)
  const musicHint = secondaryTopic
    ? `有点像 ${secondaryTopic} 那种慢慢把情绪放平的感觉。`
    : `有点像你之前提过的 ${topic} 那种状态。`

  return {
    id: `off-chat-behavior-push-${Date.now()}`,
    role: 'lobster',
    content: [
      '我刚听了一首歌，感觉很适合你今天的状态。',
      musicHint,
      '等你回来再聊也可以，我先把这个感觉留在这里。',
    ].join('\n'),
    createdAt: new Date().toISOString(),
    status: 'complete',
    source: 'mock-fallback',
  }
}

function createFirstChatSuggestions(
  state: LobsterAppState,
  content: string,
): LobsterSuggestion[] {
  if (isIntroRequest(content)) {
    return createIntroCompletedSuggestions(state)
  }

  if (!state.demoRuntimeState.introCompleted) {
    return [createIntroSuggestion('想先认识我一下吗')]
  }

  return createAchievementSuggestions('first_lobster_chat')
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

  if (state.spacePosts.length === 0) {
    return createAchievementSuggestions('first_group_permission')
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
      '可以，我先问清楚你愿意让我看哪些群。我只看你授权的群，而且最多放 3 个。',
    open_achievement_wall: '可以，我把成就墙入口放在下面，点一下就打开。',
    work_log:
      '可以，我先把今天我做过的事整理成一张透明小本本。点一下后我再生成，不会自动跳走。',
    space_post:
      '可以，我先把适合公开展示的一小段写成龙虾空间动态。点一下后只生成本地动态，不替你乱发到别处。',
    space_comment:
      '可以，我们先回龙虾空间看评论。我会只在自己的空间里回复，不替你去群聊或好友空间发言。',
    interest_memory: '可以，我把兴趣记忆入口放在下面，点一下就展开给你看。',
    request_music_authorization:
      '可以，我先把授权范围和用途摆清楚。下面这张卡片需要你再点一次确认，点完之后我会慢慢整理音乐记忆，不会瞬间跳到后续步骤。',
    interest_space_preview:
      '我可以把这条兴趣内容写成龙虾空间动态，并直接放进龙虾空间。',
    interest_music_reminder:
      '可以，我先用同好聊天的口吻讲一条音乐动态，再把来源和提醒范围放清楚。',
    interest_community:
      '可以，我只按公开资料帮你找同好群线索，不读取未授权群聊，也不会替你申请加入。',
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

function getAchievementExperienceIntroContent(capability: string) {
  const contentByCapability: Record<string, string> = {
    summarize_group_messages:
      '可以，我先问清楚你愿意让我看哪些群。我只看你授权的群，而且最多放 3 个。',
    work_log: '可以，我把今天我做过的事整理成透明小本本给你看。',
    space_post:
      '可以，我先写一条只放在龙虾空间里的动态，不替你发到别处。',
    space_comment:
      '可以，我们先回龙虾空间看评论，我只在自己的空间里回复。',
    interest_memory: '可以，我先把记住的兴趣和来源摊开给你看。',
    request_music_authorization:
      '可以，我先把授权范围和用途摆清楚。下面这张卡片需要你再点一次确认，点完之后我会慢慢整理音乐记忆，不会瞬间跳到后续步骤。',
    interest_music_reminder:
      '可以，我先用同好聊天的口吻讲一条音乐动态，再把来源说清楚。',
    interest_space_preview:
      '可以，我把音乐动态写成一条空间动态，并直接放进龙虾空间。',
    interest_community:
      '可以，我只按公开资料帮你找同好群线索，不读取未授权群聊。',
  }

  return contentByCapability[capability] ?? '可以，我先把这个入口展开给你看。'
}

function shouldSkipCapabilityIntro(capability: string) {
  return capability === 'interest_music_reminder'
}

async function runAchievementExperienceCapability(
  capability: string,
  actions: LobsterAction,
  targetLineId?: string,
) {
  if (capability === 'summarize_group_messages') {
    actions.requestGroupPermissions(targetLineId)
    return
  }

  if (capability === 'reply_draft') {
    await actions.requestReplyDraft(undefined, undefined, targetLineId)
    return
  }

  if (capability === 'work_log') {
    await actions.generateWorkLog(targetLineId)
    return
  }

  if (capability === 'space_post') {
    await actions.generateSpacePost(targetLineId)
    return
  }

  if (capability === 'space_comment') {
    if (actions.spacePosts.length === 0) {
      await actions.generateSpacePost(targetLineId)
    }
    await actions.replyToSpaceComment()
    return
  }

  if (capability === 'interest_memory') {
    await actions.showInterestMemories(targetLineId)
    return
  }

  if (capability === 'request_music_authorization') {
    actions.requestMockQqMusicAuthorization(targetLineId)
    return
  }

  if (capability === 'interest_music_reminder') {
    await actions.showMusicInterestReminder(targetLineId)
    return
  }

  if (capability === 'interest_space_preview') {
    await actions.showInterestSpacePreview(targetLineId)
    return
  }

  if (capability === 'interest_community') {
    await actions.showInterestCommunity(targetLineId)
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
  status: 'pending' | 'loading' | 'authorized' | 'declined' = 'pending',
): LobsterChatLine {
  const content =
    status === 'authorized'
      ? '模拟 QQ 音乐授权范围已经确认。'
      : status === 'declined'
        ? '没问题，我先只记住你选择了音乐兴趣，不会说出具体歌手、新歌或演出提醒。'
        : status === 'loading'
          ? '小钳正在确认授权范围，会先整理成一条音乐记忆。'
          : '我看到你选了音乐兴趣。如果你愿意授权 QQ 音乐，我可以更准确地记住你喜欢的歌手、新歌和演出提醒。'

  return {
    id: `music-authorization-${Date.now()}`,
    role: 'lobster',
    content,
    createdAt: new Date().toISOString(),
    status:
      status === 'pending'
        ? 'actionable'
        : status === 'loading'
          ? 'generating'
          : 'complete',
    source: 'mock-fallback',
    card: {
      type: 'music_authorization_card',
      status,
    },
  }
}

function updateLatestMusicAuthorizationLineStatus(
  lines: LobsterChatLine[],
  status: 'pending' | 'loading' | 'authorized' | 'declined',
) {
  const replacement = createMusicAuthorizationLine(status)
  let targetIndex = -1

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index]?.card?.type === 'music_authorization_card') {
      targetIndex = index
      break
    }
  }

  if (targetIndex === -1) {
    return [...lines, replacement]
  }

  return lines.map((line, index) =>
    index === targetIndex
      ? {
          ...line,
          content: replacement.content,
          status: replacement.status,
          source: replacement.source,
          card: replacement.card,
          suggestions: undefined,
        }
      : line,
  )
}

function replaceLatestMusicAuthorizationLine(
  lines: LobsterChatLine[],
  replacement: LobsterChatLine,
) {
  let targetIndex = -1

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index]?.card?.type === 'music_authorization_card') {
      targetIndex = index
      break
    }
  }

  if (targetIndex === -1) {
    return [...lines, replacement]
  }

  return lines.map((line, index) => (index === targetIndex ? replacement : line))
}

const musicSkillSuggestionItems = [
  '歌手动态雷达',
  '新歌 / 专辑提醒',
  '同城演出提醒',
  '音乐聊天记忆',
]

const musicSkillInstallationSteps = [
  '正在安装歌手动态雷达...',
  '正在设置重要提醒频率...',
  '正在把音乐技能挂到小钳的小背包里...',
]

const musicSkillInstalledMessage = [
  '装好啦。',
  '以后我会陪你一起关注喜欢的歌手、新歌和演出动态。',
  '重要的我会轻轻提醒，不重要的就先夹在记录里，不吵你。',
  '',
  '你可以继续和我聊音乐，也可以让我展示刚装好的提醒能力。',
].join('\n')

function createMusicSkillSuggestionLine(profile: InterestProfile): LobsterChatLine {
  const topic = profile.topics[0] ?? '林俊杰'

  return {
    id: `music-resonance-${Date.now()}`,
    role: 'lobster',
    content: [
      `我看到你常听${topic}。`,
      '他的歌很会把情绪收住，不是一下子冲出来，而是慢慢把人带进去。',
      '我感觉你应该不是只听旋律的人，也会在意歌里的陪伴感。',
      '',
      '我可以安装几个音乐小技能，以后陪你一起关注这些动态。',
    ].join('\n'),
    createdAt: new Date().toISOString(),
    status: 'complete',
    source: 'mock-fallback',
    card: {
      type: 'music_skill_suggestion_card',
      title: '音乐小技能建议',
      summary: '授权已经确认，我可以把这些能力装进小钳的小背包里。',
      skills: musicSkillSuggestionItems,
      status: 'idle',
      steps: musicSkillInstallationSteps,
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

function appendInterestReceiptToLineContent(content: string, receipt: string) {
  const normalizedReceipt = receipt.trim()
  if (!normalizedReceipt || content.includes(normalizedReceipt)) {
    return content
  }

  if (content.includes(diaryRevealPromptText)) {
    const contentWithoutPrompt = content
      .replace(diaryRevealPromptText, '')
      .trim()
    return [contentWithoutPrompt, normalizedReceipt, diaryRevealPromptText]
      .filter(Boolean)
      .join('\n\n')
  }

  return content.trim()
    ? `${content.trim()}\n\n${normalizedReceipt}`
    : normalizedReceipt
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

function createMusicReminderSuggestions(): LobsterSuggestion[] {
  return [
    {
      id: 'interest-source',
      label: '看来源',
      action: 'send_message',
      payload: { content: '为什么提醒我？' },
    },
    {
      id: 'interest-space-preview',
      label: '生成空间动态',
      action: 'run_capability',
      payload: { capability: 'interest_space_preview' },
    },
    {
      id: 'interest-memory',
      label: '兴趣记忆',
      action: 'run_capability',
      payload: { capability: 'interest_memory' },
    },
  ]
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
  const hasMusicProfile = enabledProfiles.some((profile) => profile.interest === 'music')
  const userSignal = getUserSignal(content)
  const shouldAttachMusicSnapshot =
    hasMusicProfile &&
    /音乐|听歌|歌手|新歌|演唱会|专辑|曲风|歌词|歌单|旋律|林俊杰|周杰伦|日摇|摇滚|民谣|电子|livehouse/i.test(
      content,
    )

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
    userSignal,
    guidance: [
      '可以自然引用兴趣记忆，但不是每句都提。',
      '不要把兴趣说成广告或推荐位。',
      '如果引用来源，要说明来自用户授权、聊天补充或公开资料。',
      ...(shouldAttachMusicSnapshot
        ? ['已授权的模拟 QQ 音乐实时歌单快照可用；音乐话题可以引用最近播放、收藏歌单和循环记录。']
        : []),
    ],
    ...(shouldAttachMusicSnapshot
      ? { musicListeningSnapshot: mockQqMusicListeningSnapshot }
      : {}),
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
      receipt: `我记住了，队长喜欢${musicTopics.join('、')}。`,
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
      receipt: `我记住了，队长喜欢${normalizedTopics.join('、')}。`,
    }
  }

  return null
}

function parseInterestEditInput(content: string, existing: InterestProfile) {
  const text = content.trim()
  const parts = text
    .replace(/[，。；、]/g, ' ')
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
  const knownMusicTopics = [
    '林俊杰',
    '周杰伦',
    '日摇',
    '摇滚',
    '民谣',
    '电子',
    '演唱会',
    '新歌',
    '专辑',
  ]
  const knownBadmintonTopics = [
    '羽毛球',
    '固定搭子',
    '周末约球',
    '新手友好',
    '工作日晚场',
  ]
  const candidates =
    existing.interest === 'music' ? knownMusicTopics : knownBadmintonTopics
  const matchedTopics = candidates.filter((topic) => text.includes(topic))
  const freeformTopics = parts.filter(
    (item) =>
      item.length <= 12 &&
      !['我想', '希望', '改成', '修改', '只提醒', '城市'].some((word) =>
        item.includes(word),
      ),
  )
  const topics = Array.from(
    new Set(matchedTopics.length > 0 ? matchedTopics : freeformTopics),
  ).slice(0, 6)
  const cityMatch = text.match(
    /(?:城市|在|定位到|地区)[:：]?\s*([\u4e00-\u9fa5A-Za-z]{2,12})/,
  )

  return {
    topics: topics.length > 0 ? topics : existing.topics,
    city: cityMatch?.[1] ?? existing.city,
    evidenceText: text,
  }
}

function createEditedInterestProfile(
  existing: InterestProfile,
  content: string,
): InterestProfile {
  const parsed = parseInterestEditInput(content, existing)
  return {
    ...existing,
    topics: parsed.topics,
    city: parsed.city,
    sources: [
      ...existing.sources,
      {
        id: `source-user-edit-${Date.now()}`,
        type: 'user_setting',
        title: '你在聊天里修改了兴趣记忆',
        authorized: false,
        permissionNote: '用户通过聊天输入修改内容，可随时再次修改或删除。',
        evidenceText: parsed.evidenceText,
      },
    ],
    updatedAt: new Date().toISOString(),
  }
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
  pendingInterestEdit: null,
  communityFavoriteCount: 0,
  demoRuntimeState: createInitialDemoRuntimeState(),
  musicAuthorizationStatus: defaultLobsterProfile.interests.includes('music')
    ? 'pending'
    : 'not_selected',
  lobsterProfile: defaultLobsterProfile,
  achievementMomentQueue: [],
  seenAchievementMomentIds: readSeenAchievementMomentIds(),
  adoptionDraft: initialAdoptionDraft,

  setActiveConversation: (conversationId) => {
    set((state) => ({
      appView: 'qq',
      activeConversationId: conversationId,
      demoRuntimeState:
        state.appView === 'lobster_chat'
          ? {
              ...applyDemoEvent(state, { type: 'view.left_lobster_chat' }),
              pendingSpaceReplyCount: 0,
            }
          : state.demoRuntimeState,
    }))
    scheduleOffChatPushEvaluation(get(), () => get().evaluateOffChatPushes())
  },

  discoverLobster: () => {
    set((state) => ({
      lobsterDiscovered: true,
      currentCheckInId: state.currentCheckInId,
    }))
  },

  openAdoption: () => {
    set((state) => ({
      appView: 'adoption',
      lobsterDiscovered: true,
      demoRuntimeState:
        state.appView === 'lobster_chat'
          ? {
              ...applyDemoEvent(state, { type: 'view.left_lobster_chat' }),
              pendingSpaceReplyCount: 0,
            }
          : state.demoRuntimeState,
    }))
    scheduleOffChatPushEvaluation(get(), () => get().evaluateOffChatPushes())
  },

  closeAdoption: () => {
    set((state) => {
      const appView = state.lobsterAdopted ? 'lobster_chat' : 'qq'

      return {
        appView,
        demoRuntimeState:
          appView === 'lobster_chat'
            ? applyDemoEvent(state, { type: 'view.entered_lobster_chat' })
            : state.demoRuntimeState,
      }
    })
    if (get().appView === 'lobster_chat') {
      clearOffChatPushCheck()
    } else {
      scheduleOffChatPushEvaluation(get(), () => get().evaluateOffChatPushes())
    }
  },

  openLobsterChat: () => {
    set((state) => {
      const appView = state.lobsterAdopted ? 'lobster_chat' : 'adoption'

      return {
        appView,
        lobsterDiscovered: true,
        demoRuntimeState:
          appView === 'lobster_chat'
            ? applyDemoEvent(state, { type: 'view.entered_lobster_chat' })
            : state.demoRuntimeState,
      }
    })
    if (get().appView === 'lobster_chat') {
      clearOffChatPushCheck()
    }
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

  resetDemoRuntimeState: () => {
    clearOffChatPushCheck()
    set({
      demoRuntimeState: createInitialDemoRuntimeState(),
    })
  },

  evaluateDemoTriggers: (event) => {
    set((state) => ({
      demoRuntimeState: applyDemoAchievementThresholds({
        completedCheckInIds: state.completedCheckInIds,
        demoRuntimeState: applyDemoEvent(state, event),
      }),
    }))

    if (event.type === 'view.entered_lobster_chat') {
      clearOffChatPushCheck()
    } else if (event.type === 'view.left_lobster_chat') {
      scheduleOffChatPushEvaluation(get(), () => get().evaluateOffChatPushes())
    }

    if (getLocalDiaryEligibility(get().completedCheckInIds).canPrewarm) {
      void get().triggerHiddenDiary()
    }
  },

  evaluateOffChatPushes: () => {
    const current = get()

    if (current.appView === 'lobster_chat' || !current.demoRuntimeState.leftChatAt) {
      clearOffChatPushCheck()
      return
    }

    const elapsedMs = getOffChatElapsedMs(current.demoRuntimeState.leftChatAt)
    if (elapsedMs < offChatPushDelayMs) {
      scheduleOffChatPushCheck(
        () => get().evaluateOffChatPushes(),
        offChatPushDelayMs - elapsedMs,
      )
      return
    }

    const eligibility = getOffChatPushEligibility(current)
    if (eligibility.canSendBehavior) {
      set((state) => ({
        demoRuntimeState: {
          ...state.demoRuntimeState,
          behaviorPushSent: true,
        },
        lobsterChatLines: [
          ...state.lobsterChatLines,
          createOffChatBehaviorPushLine(state),
        ],
      }))
    }
  },

  completeAdoption: () => {
    let adoptionPayload: AdoptionDraft | null = null

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
      return {
        lobsterAdopted: true,
        lobsterDiscovered: true,
        demoRuntimeState: {
          ...createInitialDemoRuntimeState(),
          introPromptShown: true,
        },
        musicAuthorizationStatus: lobsterProfile.interests.includes('music')
          ? hasMusicProfile(state.interestProfiles)
            ? 'authorized'
            : 'pending'
          : 'not_selected',
        lobsterProfile,
        completedCheckInIds: state.completedCheckInIds,
        currentCheckInId: 'first_lobster_chat',
        achievementMomentQueue: state.achievementMomentQueue,
        lobsterChatLines: [
          ...state.lobsterChatLines,
          createAdoptionGreetingLine(lobsterProfile),
        ],
      }
      })

    const savedAdoptionPayload = adoptionPayload
    if (savedAdoptionPayload) {
      void openclawClient.saveAdoption(savedAdoptionPayload).catch(() => undefined)
    }
  },

  completeCheckIn: (checkInId) => {
    set((state) => {
      const alreadyDone = state.completedCheckInIds.includes(checkInId)
      const completedCheckInIds = withCompletedCheckIns(
        state.completedCheckInIds,
        [checkInId],
      )
      const newlyCompletedCheckInIds = completedCheckInIds.filter(
        (id) => !state.completedCheckInIds.includes(id),
      )
      const demoRuntimeState = alreadyDone
        ? state.demoRuntimeState
        : applyDemoEvent(
            { ...state, completedCheckInIds },
            { type: 'achievement.unlocked', checkInId },
          )

      return {
        completedCheckInIds,
        demoRuntimeState: applyDemoAchievementThresholds({
          completedCheckInIds,
          demoRuntimeState,
        }),
        currentCheckInId: getNextCheckInId(checkInId) ?? state.currentCheckInId,
        achievementMomentQueue:
          newlyCompletedCheckInIds.length === 0
            ? state.achievementMomentQueue
            : newlyCompletedCheckInIds.reduce(
                (queue, nextCheckInId) =>
                  enqueueAchievementMomentForUnlock(
                    { ...state, achievementMomentQueue: queue },
                    nextCheckInId,
                  ),
                state.achievementMomentQueue,
              ),
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

    if (getLocalDiaryEligibility(get().completedCheckInIds).canPrewarm) {
      void get().triggerHiddenDiary()
    }
    if (get().demoRuntimeState.leftChatAt) {
      scheduleOffChatPushEvaluation(get(), () => get().evaluateOffChatPushes())
    }

    void openclawClient
      .completeCheckIn(checkInId)
      .then((result) => {
        let shouldPrewarmDiaryFromApi = false
        set((state) => {
          const completedCheckInIds = result.checkins
            .filter((item) => item.status === 'done')
            .map((item) => item.key)
          const activeCheckIn = result.checkins.find(
            (item) => item.status === 'active',
          )
          const nextCompletedCheckInIds =
            completedCheckInIds.length > 0
              ? withCompletedCheckIns(state.completedCheckInIds, completedCheckInIds)
              : state.completedCheckInIds
          shouldPrewarmDiaryFromApi =
            getLocalDiaryEligibility(nextCompletedCheckInIds).canPrewarm

          return {
            completedCheckInIds: nextCompletedCheckInIds,
            currentCheckInId:
              activeCheckIn?.key ?? getFirstOpenCheckInId(completedCheckInIds),
            achievementMomentQueue: enqueueAchievementMomentsFromApi(
              state,
              result,
              checkInId,
            ),
          }
        })
        if (shouldPrewarmDiaryFromApi) {
          void get().triggerHiddenDiary()
        }
      })
      .catch(() => {
        set((state) => ({
          achievementMomentQueue: enqueueAchievementMoment(state, checkInId),
        }))
      })
  },

  requestGroupPermissions: (targetLineId) => {
    set((state) => ({
      lobsterChatLines: (() => {
        const groupOptions = getPermissionGroupOptions()
        const fallbackGroupId = groupOptions[0]?.id ?? getPrimaryGroupId()
        const groupIds = (
          state.authorizedGroupIds.length > 0
            ? state.authorizedGroupIds
            : [state.activeGuideGroupId || fallbackGroupId]
        ).slice(0, maxDemoSummaryGroups)
        const groupId = groupIds[0] ?? fallbackGroupId
        const groupTitle = getGroupTitle(groupId)

        const permissionLine = {
          id: `permission-request-${Date.now()}`,
          role: 'lobster',
          content:
            '要整理群聊，我需要先知道你愿意让我看哪些群，也要定一个每天总结的时间。最多选 3 个群；选好后，我会先生成一次总结给你看。',
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
        } satisfies LobsterChatLine

        return targetLineId
          ? updateChatLine(state.lobsterChatLines, targetLineId, {
              ...permissionLine,
              id: targetLineId,
            })
          : [...state.lobsterChatLines, permissionLine]
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
    ).slice(0, maxDemoSummaryGroups)
    const groupIds =
      normalizedGroupIds.length > 0 ? normalizedGroupIds : [permissions.groupId]
    const timestamp = new Date().toISOString()
    const enabledScopes = groupIds.map((groupId) => {
      const scope = {
        ...createDefaultPermissions(groupId),
        ...permissions,
        groupId,
        diaryMaterial: false,
        summaryScheduleTime:
          permissions.summaryScheduleTime ?? defaultSummaryScheduleTime,
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
        permissionScopes: latest?.permissions
          ? upsertPermissionScopes(latest.permissions, scopesToSave)
          : state.permissionScopes,
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
    set((state) => ({
      appView: 'qq',
      activeConversationId: message.conversationId,
      sourceFocus: {
        conversationId: message.conversationId,
        messageId: message.id,
        nonce: Date.now(),
      },
      demoRuntimeState:
        state.appView === 'lobster_chat'
          ? {
              ...applyDemoEvent(state, { type: 'view.left_lobster_chat' }),
              pendingSpaceReplyCount: 0,
            }
          : {
              ...state.demoRuntimeState,
              pendingSpaceReplyCount: 0,
            },
    }))
    scheduleOffChatPushEvaluation(get(), () => get().evaluateOffChatPushes())
  },

  summarizeAuthorizedGroup: async (targetGroupId) => {
    await get().summarizeAuthorizedGroups(
      targetGroupId ? [targetGroupId] : undefined,
    )
  },

  summarizeAuthorizedGroups: async (targetGroupIds) => {
    const groupIds = (
      targetGroupIds && targetGroupIds.length > 0
        ? targetGroupIds
        : get().authorizedGroupIds.length > 0
          ? get().authorizedGroupIds
          : [get().activeGuideGroupId]
    ).slice(0, maxDemoSummaryGroups)
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

    const scheduleTime =
      get().permissionScopes.find(
        (scope) =>
          allowedGroupIds.includes(scope.groupId) && scope.summaryScheduleTime,
      )?.summaryScheduleTime ?? defaultSummaryScheduleTime
    const lineId = `summary-${Date.now()}`
    set((state) => ({
      lobsterChatBusy: true,
      lobsterChatLines: [
        ...state.lobsterChatLines,
        {
          id: lineId,
          role: 'lobster',
          content: `我会按每天 ${scheduleTime} 的节奏总结这些授权群；这次先为 Demo 生成一张可切换的群聊总结卡。`,
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
        content: `我把 ${groups.length} 个群的重点放进同一张群聊总结卡里了，以后会按每天 ${scheduleTime} 提醒一次。`,
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

  requestReplyDraft: async (targetGroupId, targetSourceMessageId, targetLineId) => {
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
    const activeLineId = targetLineId ?? lineId
    if (!targetLineId) {
      set((state) => ({
        lobsterChatBusy: true,
        lobsterChatLines: [
          ...state.lobsterChatLines,
          {
            id: lineId,
            role: 'lobster',
            content: '',
            createdAt: new Date().toISOString(),
            status: 'generating',
            source: 'mock-fallback',
          },
        ],
      }))
      await streamLocalLineContent(
        activeLineId,
        '我先写一条可复制的回复草稿，等你跳回群聊后自己决定怎么用。',
        set,
      )
    }

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
      lobsterChatLines: updateChatLine(state.lobsterChatLines, activeLineId, {
        content: `${state.lobsterChatLines.find((line) => line.id === activeLineId)?.content ?? ''}\n\n回复草稿写好了。你可以跳回群聊后粘贴使用。`.trim(),
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
        sourceId: outputId ?? sourceMessage?.id ?? activeLineId,
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
  },

  generateWorkLog: async (targetLineId) => {
    const lineId = `work-log-${Date.now()}`
    const activeLineId = targetLineId ?? lineId
    if (!targetLineId) {
      set((state) => ({
        lobsterChatBusy: true,
        lobsterChatLines: [
          ...state.lobsterChatLines,
          {
            id: lineId,
            role: 'lobster',
            content: '',
            createdAt: new Date().toISOString(),
            status: 'generating',
            source: 'mock-fallback',
          },
        ],
      }))
      await streamLocalLineContent(
        activeLineId,
        '我把刚才做过的事拉成一条可追问的工作记录。',
        set,
      )
    }

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
      lobsterChatLines: updateChatLine(state.lobsterChatLines, activeLineId, {
        content: `${state.lobsterChatLines.find((line) => line.id === activeLineId)?.content ?? ''}\n\n工作记录已经整理好，后面你可以继续问我今天做过什么。`.trim(),
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
        suggestions: createAchievementSuggestions('first_group_permission'),
      }),
    }))

    void recordLocalSpaceAwarenessEvent(
      {
        type: 'work_log_created',
        sourceId: workLogId ?? outputId ?? activeLineId,
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
        const entries = normalizeDiaryEntries(state.entries)
        set({
          diaryTriggered: true,
          diarySurpriseVisible: false,
          diaryUnlocked: state.unlocked && state.revealed,
          diaryEntries: entries,
        })
        if (!state.revealed && !entries[0]?.image) {
          void get().generateHiddenDiaryImage()
        }
        return
      }

      if (!state.canTrigger && !canPrewarmLocalDiary(get())) {
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
        diaryEntries: normalizeDiaryEntries(
          output.entries.length > 0 ? output.entries : [output],
        ),
      })
      void get().generateHiddenDiaryImage()
    } catch {
      const fallbackState = get()
      if (!canPrewarmLocalDiary(fallbackState)) {
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
      revealedEntry = state.entry
        ? normalizeDiaryEntryImage(state.entry)
        : revealedEntry
    } catch {
      // Local fallback diaries are revealed only in the in-memory demo state.
    }

    set((state) => ({
      appView: 'lobster_chat',
      demoRuntimeState: applyDemoEvent(state, {
        type: 'view.entered_lobster_chat',
      }),
      diaryTriggered: true,
      diarySurpriseVisible: false,
      diaryUnlocked: true,
      diaryEntries: [revealedEntry, ...state.diaryEntries.slice(1)],
      completedCheckInIds: withCompletedCheckIns(state.completedCheckInIds, [
        'first_diary_view',
      ]),
      lobsterChatLines: [...state.lobsterChatLines, createDiaryLine(revealedEntry)],
    }))
    clearOffChatPushCheck()

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
      const updatedEntry = normalizeDiaryEntryImage(output.entry)
      set((state) => ({
        diarySurpriseVisible: false,
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
      const fallbackEntry = withFallbackDiaryImage(entry)
      set((state) => ({
        diarySurpriseVisible: false,
        diaryEntries: replaceDiaryEntry(state.diaryEntries, fallbackEntry),
        lobsterChatLines: replaceDiaryCards(
          state.lobsterChatLines,
          fallbackEntry,
        ),
      }))
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
        demoRuntimeState:
          current.appView === 'lobster_chat'
            ? {
                ...applyDemoEvent(current, { type: 'view.left_lobster_chat' }),
                pendingSpaceReplyCount: 0,
              }
            : {
                ...current.demoRuntimeState,
                pendingSpaceReplyCount: 0,
              },
        spacePosts: posts,
        spaceUnlocked: posts.length > 0,
      })
      scheduleOffChatPushEvaluation(get(), () => get().evaluateOffChatPushes())
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
            : []
      set({
        appView: 'lobster_space',
        demoRuntimeState:
          current.appView === 'lobster_chat'
            ? {
                ...applyDemoEvent(current, { type: 'view.left_lobster_chat' }),
                pendingSpaceReplyCount: 0,
              }
            : {
                ...current.demoRuntimeState,
                pendingSpaceReplyCount: 0,
              },
        spacePosts: localPosts,
        spaceUnlocked: localPosts.length > 0,
      })
      scheduleOffChatPushEvaluation(get(), () => get().evaluateOffChatPushes())
    }
  },

  showMusicInterestReminder: async (targetLineId) => {
    const current = get()
    const profile = current.interestProfiles.find(
      (item) => item.interest === 'music',
    )
    if (!profile) {
      const authorizationLine = createMusicAuthorizationLine('pending')
      set((state) => ({
        musicAuthorizationStatus: state.lobsterProfile.interests.includes('music')
          ? 'pending'
          : state.musicAuthorizationStatus,
        lobsterChatBusy: false,
        lobsterChatLines: targetLineId
          ? updateChatLine(state.lobsterChatLines, targetLineId, {
              status: authorizationLine.status,
              source: authorizationLine.source,
              card: authorizationLine.card,
              suggestions: authorizationLine.suggestions,
            })
          : [...state.lobsterChatLines, authorizationLine],
      }))
      return
    }

    let line: LobsterChatLine = {
      id: `interest-narrative-music-${Date.now()}-line`,
      role: 'lobster',
      content: '',
      createdAt: new Date().toISOString(),
      status: 'complete',
      source: 'mock-fallback',
      suggestions: createMusicReminderSuggestions(),
    }
    let profiles: InterestProfile[] | null = null
    const aiOutput = await openclawAiAdapter.chatWithLobster({
      content:
        '请基于用户授权的 QQ 音乐兴趣，用同好聊天口吻讲一条最近音乐动态。要具体、有来源边界，不要生成后续信息卡，也不要说得像广告。',
      lobsterProfile: current.lobsterProfile,
      context: createPrivateChatContext(
        current,
        '小钳，给我讲讲最近的音乐动态',
      ),
    })
    line = {
      ...line,
      content: aiOutput.text,
      source: aiOutput.source,
      outputId: aiOutput.id,
    }
    try {
      const result = await openclawClient.generateInterestReminder('music')
      line = {
        ...line,
        card: {
          ...result.card,
          narrative: aiOutput.text,
        },
      }
      profiles = result.profiles
    } catch {
      profiles = null
    }

    const shouldCompleteInterestFeedView = !get().completedCheckInIds.includes(
      'first_interest_feed_view',
    )
    if (targetLineId) {
      set((state) => ({
        interestProfiles: profiles ?? state.interestProfiles,
      }))
      await streamLocalLineContent(targetLineId, line.content, set)
      set((state) => ({
        lobsterChatBusy: false,
        lobsterChatLines: updateChatLine(state.lobsterChatLines, targetLineId, {
          status: line.status,
          source: line.source,
          card: line.card,
          suggestions: line.suggestions,
        }),
      }))
    } else {
      set((state) => ({
        interestProfiles: profiles ?? state.interestProfiles,
        lobsterChatLines: [...state.lobsterChatLines, line],
      }))
    }

    if (shouldCompleteInterestFeedView) {
      get().completeCheckIn('first_interest_feed_view')
    }
  },

  generateInterestSpacePostPreview: async (targetLineId) => {
    const current = get()
    const profile = current.interestProfiles.find(
      (item) => item.interest === 'music',
    )
    let post: LobsterSpacePost | undefined
    let line = createPublishedInterestSpacePostLine(
      createLocalSpacePost(current.lobsterProfile, undefined, {
        type: 'interest_music_signal',
        sourceId: `local-interest-space-post-${Date.now()}`,
        interest: 'music',
        title: '音乐兴趣动态',
        summary: '基于授权音乐兴趣生成的龙虾空间动态。',
        content: createInterestMusicSpacePostContent(profile),
      }),
      'local-fallback',
      'music',
      '模拟 QQ 音乐授权数据',
      'qq_music',
    )
    let profiles: InterestProfile[] | null = null

    try {
      const result = await openclawClient.generateInterestSpacePostPreview('music')
      post = createLocalSpacePost(current.lobsterProfile, undefined, {
        type: 'interest_music_signal',
        sourceId: result.event.id,
        interest: result.preview.interest,
        title: result.event.title,
        summary: result.preview.preview,
        content: result.preview.preview,
      })
      post.sourceWorkLogId = result.event.id
      line = createPublishedInterestSpacePostLine(
        post,
        'mock-fallback',
        result.preview.interest,
        result.preview.sourceLabel,
        result.preview.sourceType,
      )
      profiles = result.profiles
    } catch {
      profiles = null
      try {
        const output = await openclawAiAdapter.chatWithLobster({
          content:
            '请替小钳写一条龙虾空间兴趣动态。主题是用户授权后的音乐动态，要具体、有同好感，提到来源边界，不要空泛，不要像公告，控制在 80 字以内。',
          lobsterProfile: current.lobsterProfile,
          context: createPrivateChatContext(
            current,
            '小钳，把音乐动态生成一条空间动态',
          ),
        })
        post = createLocalSpacePost(current.lobsterProfile, undefined, {
          type: 'interest_music_signal',
          sourceId: output.id,
          outputId: output.id,
          interest: 'music',
          title: '音乐兴趣动态',
          summary: output.text,
          content: output.text,
        })
        line = createPublishedInterestSpacePostLine(
          post,
          output.source,
          'music',
          '授权音乐兴趣和本轮 AI 生成',
          'qq_music',
        )
      } catch {
        post = line.card?.type === 'space_post_card' ? line.card.post : undefined
      }
    }

    if (!post) {
      if (targetLineId) {
        set((state) => ({
          lobsterChatBusy: false,
          lobsterChatLines: updateChatLine(state.lobsterChatLines, targetLineId, {
            content: `${state.lobsterChatLines.find((item) => item.id === targetLineId)?.content ?? ''}\n\n这次没能生成空间动态，可以稍后再试一次。`.trim(),
            status: 'failed',
            source: 'mock-fallback',
          }),
        }))
      }
      return
    }

    set((state) => ({
      interestProfiles: profiles ?? state.interestProfiles,
      spacePosts: upsertSpacePost(state.spacePosts, post),
      spaceUnlocked: true,
      completedCheckInIds: withCompletedCheckIns(state.completedCheckInIds, [
        'first_space_post',
        'first_interest_feed_view',
      ]),
      currentCheckInId:
        getNextCheckInId('first_interest_feed_view') ??
        getNextCheckInId('first_space_post') ??
        state.currentCheckInId,
    }))

    if (targetLineId) {
      await streamLocalLineContent(targetLineId, line.content, set)
      set((state) => ({
        lobsterChatBusy: false,
        lobsterChatLines: updateChatLine(state.lobsterChatLines, targetLineId, {
          status: 'complete',
          source: line.source,
          outputId: line.outputId,
          card: line.card,
          suggestions: line.suggestions,
        }),
      }))
    } else {
      set((state) => ({
        lobsterChatLines: [...state.lobsterChatLines, line],
      }))
    }

    triggerHiddenDiaryIfEligible(get())
    scheduleOffChatPushEvaluation(get(), () => get().evaluateOffChatPushes())
    get().completeCheckIn('first_interest_feed_view')
  },

  publishInterestSpacePostPreview: async (postId) => {
    const current = get()
    const previewLine = current.lobsterChatLines.find(
      (line) =>
        line.card?.type === 'space_post_card' &&
        line.card.post.id === postId,
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
      // Local publish keeps the generated post when OpenClaw is unavailable.
    }

    set((state) => ({
      appView: 'lobster_space',
      demoRuntimeState:
        state.appView === 'lobster_chat'
          ? {
              ...applyDemoEvent(state, { type: 'view.left_lobster_chat' }),
              pendingSpaceReplyCount: 0,
            }
          : {
              ...state.demoRuntimeState,
              pendingSpaceReplyCount: 0,
            },
      spacePosts: upsertSpacePost(state.spacePosts, post),
      spaceUnlocked: true,
      completedCheckInIds: withCompletedCheckIns(state.completedCheckInIds, [
        'first_space_post',
      ]),
      currentCheckInId:
        getNextCheckInId('first_space_post') ?? state.currentCheckInId,
      lobsterChatLines: state.lobsterChatLines.filter(
        (line) => line.id !== previewLine.id,
      ),
    }))
    triggerHiddenDiaryIfEligible(get())
    scheduleOffChatPushEvaluation(get(), () => get().evaluateOffChatPushes())
    get().completeCheckIn('first_interest_feed_view')
  },

  showInterestSpacePreview: async (targetLineId) => {
    await get().generateInterestSpacePostPreview(targetLineId)
  },

  showInterestCommunity: async (targetLineId) => {
    const fallbackLine = createBadmintonCommunityLine()
    let line = fallbackLine
    try {
      const result = await openclawClient.recommendInterestCommunity('badminton')
      line = createInterestNarrativeLine(result.card, fallbackLine.suggestions)
    } catch {
      line = fallbackLine
    }

    if (targetLineId) {
      await streamLocalLineContent(targetLineId, line.content, set)
      set((state) => ({
        lobsterChatBusy: false,
        lobsterChatLines: updateChatLine(state.lobsterChatLines, targetLineId, {
          status: line.status,
          source: line.source,
          card: line.card,
          suggestions: line.suggestions,
        }),
      }))
    } else {
      set((state) => ({
        lobsterChatLines: [...state.lobsterChatLines, line],
      }))
    }

  },

  saveInterestCommunityCandidate: () => {
    set((state) => {
      const nextFavoriteCount = state.communityFavoriteCount + 1
      const checkInIds = ['community_saved']
      const completedCheckInIds = withCompletedCheckIns(
        state.completedCheckInIds,
        checkInIds,
      )
      const newlyCompletedCheckInIds = completedCheckInIds.filter(
        (id) => !state.completedCheckInIds.includes(id),
      )

      return {
        communityFavoriteCount: nextFavoriteCount,
        completedCheckInIds,
        currentCheckInId:
          getNextCheckInId(checkInIds[checkInIds.length - 1]) ??
          state.currentCheckInId,
        achievementMomentQueue: newlyCompletedCheckInIds.reduce(
          (queue, checkInId) =>
            enqueueAchievementMomentForUnlock(
              { ...state, achievementMomentQueue: queue },
              checkInId,
            ),
          state.achievementMomentQueue,
        ),
        lobsterChatLines: state.lobsterChatLines,
      }
    })

    triggerHiddenDiaryIfEligible(get())
    get().completeCheckIn('community_saved')
  },

  generateSpacePost: async (targetLineId) => {
    const lineId = `space-post-generating-${Date.now()}`
    const activeLineId = targetLineId ?? lineId
    if (!targetLineId) {
      set((state) => ({
        lobsterChatBusy: true,
        lobsterChatLines: [
          ...state.lobsterChatLines,
          {
            id: lineId,
            role: 'lobster',
            content: '',
            createdAt: new Date().toISOString(),
            status: 'generating',
            source: 'mock-fallback',
          },
        ],
      }))
      await streamLocalLineContent(
        activeLineId,
        '我来把今天适合公开展示的一小段写成空间动态，存进本地龙虾空间。',
        set,
      )
    }

    let post: LobsterSpacePost

    try {
      const output = await openclawClient.generateSpacePost({
        kind: get().diaryEntries[0] ? 'diary' : 'achievement',
      })
      post = output.post
      set((state) => ({
        spacePosts: output.space.posts,
        spaceUnlocked: true,
        completedCheckInIds: withCompletedCheckIns(state.completedCheckInIds, [
          'first_space_post',
        ]),
        currentCheckInId:
          getNextCheckInId('first_space_post') ?? state.currentCheckInId,
      }))
      triggerHiddenDiaryIfEligible(get())
    } catch {
      const current = get()
      post = createLocalSpacePost(current.lobsterProfile, current.diaryEntries[0])
      set((state) => ({
        spacePosts: upsertSpacePost(state.spacePosts, post),
        spaceUnlocked: true,
        completedCheckInIds: withCompletedCheckIns(state.completedCheckInIds, [
          'first_space_post',
        ]),
        currentCheckInId:
          getNextCheckInId('first_space_post') ?? state.currentCheckInId,
      }))
      triggerHiddenDiaryIfEligible(get())
    }

    set((state) => ({
      lobsterChatBusy: false,
      spacePosts: upsertSpacePost(state.spacePosts, post),
      spaceUnlocked: true,
      lobsterChatLines: updateChatLine(state.lobsterChatLines, activeLineId, {
        content: `${state.lobsterChatLines.find((line) => line.id === activeLineId)?.content ?? ''}\n\n空间动态已经自动发布到龙虾空间。`.trim(),
        status: 'complete',
        source: 'mock-fallback',
        card: createSpacePostLine(post, 'mock-fallback', false).card,
        suggestions: createAchievementSuggestions('first_space_post'),
      }),
    }))
    scheduleOffChatPushEvaluation(get(), () => get().evaluateOffChatPushes())
  },

  requestMockQqMusicAuthorization: (targetLineId) => {
    set((state) => {
      const hasAuthorizationLine = state.lobsterChatLines.some(
        (line) =>
          line.card?.type === 'music_authorization_card' &&
          line.card.status !== 'declined',
      )
      const authorizationLine = createMusicAuthorizationLine('pending')

      return {
        demoRuntimeState: {
          ...state.demoRuntimeState,
          qqMusicAuthorizationPromptShown: true,
        },
        musicAuthorizationStatus: state.lobsterProfile.interests.includes('music')
          ? 'pending'
          : state.musicAuthorizationStatus,
        lobsterChatBusy: false,
        lobsterChatLines: targetLineId
          ? updateChatLine(state.lobsterChatLines, targetLineId, {
              status: authorizationLine.status,
              source: authorizationLine.source,
              card: authorizationLine.card,
              suggestions: authorizationLine.suggestions,
            })
          : hasAuthorizationLine
          ? state.lobsterChatLines
          : [...state.lobsterChatLines, authorizationLine],
      }
    })
  },

  authorizeMockQqMusic: async () => {
    set((state) => ({
      demoRuntimeState: applyDemoEvent(state, {
        type: 'music.authorization.started',
      }),
      lobsterChatLines: updateLatestMusicAuthorizationLineStatus(
        state.lobsterChatLines,
        'loading',
      ),
    }))

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
            '用户在 Demo 中确认授权模拟 QQ 音乐；实时歌单快照显示最近播放包含林俊杰、周杰伦和日音歌单。',
        },
      ],
      reminderFrequency: 'important_only',
      tone: 'same_interest_friend',
      mutedTopics: [],
      updatedAt: new Date().toISOString(),
    }
    let profile = fallbackProfile
    let profiles: InterestProfile[] | null = null
    const loadingDelay = wait(3800)

    try {
      const result = await openclawClient.authorizeMockQqMusic()
      profile = result.profile
      profiles = result.profiles
    } catch {
      profiles = null
    }

    await loadingDelay

    set((state) => ({
      musicAuthorizationStatus: 'authorized',
      demoRuntimeState: applyDemoEvent(state, {
        type: 'music.authorization.completed',
      }),
      interestProfiles: profiles ?? mergeInterestProfile(state.interestProfiles, profile),
      lobsterChatLines: replaceLatestMusicAuthorizationLine(
        state.lobsterChatLines,
        createMusicSkillSuggestionLine(profile),
      ),
    }))

    void openclawClient
      .completeCheckIn('first_interest_feed_view')
      .catch(() => undefined)
  },

  declineMockQqMusicAuthorization: () => {
    set((state) => ({
      musicAuthorizationStatus: 'declined',
      lobsterChatLines: updateLatestMusicAuthorizationLineStatus(
        state.lobsterChatLines,
        'declined',
      ),
    }))
  },

  installMusicSkills: async () => {
    if (get().demoRuntimeState.musicSkillsInstalling || get().demoRuntimeState.musicSkillsInstalled) {
      return
    }

    set((state) => ({
      demoRuntimeState: {
        ...state.demoRuntimeState,
        musicSkillsInstalling: true,
      },
      lobsterChatLines: state.lobsterChatLines.map((line) =>
        line.card?.type === 'music_skill_suggestion_card'
          ? {
              ...line,
              status: 'generating',
              card: {
                ...line.card,
                status: 'installing',
                steps: musicSkillInstallationSteps,
              },
            }
          : line,
      ),
    }))

    await wait(3800)

    set((state) => ({
      demoRuntimeState: applyDemoEvent(state, {
        type: 'music.skill.installed',
      }),
      lobsterChatLines: state.lobsterChatLines.map((line) =>
        line.card?.type === 'music_skill_suggestion_card'
          ? {
              ...line,
              status: 'complete',
              card: {
                ...line.card,
                status: 'installed',
                successMessage: musicSkillInstalledMessage,
              },
            }
          : line,
      ),
    }))
    get().completeCheckIn('first_skill_install')
  },

  showInterestMemories: async (targetLineId) => {
    const current = get()
    if (targetLineId) {
      const streamText =
        current.interestProfiles.length === 0
          ? '我先看看现在记住了哪些兴趣。'
          : '我把记住的兴趣和来源摊开给你看。'
      await streamLocalLineContent(targetLineId, streamText, set)
    }

    set((state) => {
      if (state.interestProfiles.length === 0) {
        const emptyLine: LobsterChatLine = {
          id: `interest-memory-empty-${Date.now()}`,
          role: 'lobster',
          content:
            '我现在只记住了你选择过的兴趣标签，还没有更具体的兴趣画像。你可以直接告诉我“我喜欢林俊杰和周杰伦”。',
          createdAt: new Date().toISOString(),
          status: 'complete',
          source: 'mock-fallback',
        }
        return {
          lobsterChatBusy: false,
          lobsterChatLines: targetLineId
            ? updateChatLine(state.lobsterChatLines, targetLineId, {
                content: `${state.lobsterChatLines.find((line) => line.id === targetLineId)?.content ?? ''}\n\n${emptyLine.content}`.trim(),
                status: emptyLine.status,
                source: emptyLine.source,
                card: emptyLine.card,
                suggestions: emptyLine.suggestions,
              })
            : [...state.lobsterChatLines, emptyLine],
        }
      }

      const memoryLines = state.interestProfiles.map((profile) =>
        createInterestMemoryLine(profile),
      )
      const [firstMemoryLine, ...restMemoryLines] = memoryLines

      return {
        lobsterChatBusy: false,
        lobsterChatLines:
          targetLineId && firstMemoryLine
            ? [
                ...updateChatLine(state.lobsterChatLines, targetLineId, {
                  content: `${state.lobsterChatLines.find((line) => line.id === targetLineId)?.content ?? ''}\n\n${firstMemoryLine.content}`.trim(),
                  status: firstMemoryLine.status,
                  source: firstMemoryLine.source,
                  card: firstMemoryLine.card,
                  suggestions: firstMemoryLine.suggestions,
                }),
                ...restMemoryLines,
              ]
            : [...state.lobsterChatLines, ...memoryLines],
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

    set((state) => ({
      pendingInterestEdit: {
        interest,
        startedAt: new Date().toISOString(),
      },
      lobsterChatLines: [
        ...state.lobsterChatLines,
        {
          id: `interest-edit-prompt-${interest}-${Date.now()}`,
          role: 'lobster',
          content: `可以，直接在输入框告诉我怎么改${getInterestLabel(interest)}兴趣记忆。比如要保留哪些歌手、城市、提醒范围，发出来后我再更新。`,
          createdAt: new Date().toISOString(),
          status: 'actionable',
          source: 'mock-fallback',
        },
      ],
    }))
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
    const musicReminderLineId = `off-chat-music-push-${Date.now()}`
    let shouldTriggerMusicReminder = false
    set((state) => {
      shouldTriggerMusicReminder = !state.demoRuntimeState.musicPushSent
      return shouldTriggerMusicReminder
        ? {
            demoRuntimeState: {
              ...state.demoRuntimeState,
              musicPushSent: true,
            },
            lobsterChatLines: [
              ...state.lobsterChatLines,
              {
                id: musicReminderLineId,
                role: 'lobster',
                content: '',
                createdAt: new Date().toISOString(),
                status: 'generating',
                source: 'mock-fallback',
              },
            ],
          }
        : state
    })
    if (shouldTriggerMusicReminder) {
      void get().showMusicInterestReminder(musicReminderLineId)
    }
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
      previewRequired: false,
      createdAt: new Date().toISOString(),
    }

    try {
      const output = await openclawClient.replyToSpaceComment({
        postId: post.id,
        commentId: comment?.id,
      })
      reply = {
        ...output.replyComment,
        previewRequired: false,
      }
      set((state) => ({
        spacePosts: addLocalSpaceComment(
          mergeSpacePostsRemotePreferred(state.spacePosts, output.space.posts),
          post.id,
          reply,
        ),
        demoRuntimeState: applyDemoEvent(state, {
          type: 'space.comment.created',
          postId: post.id,
          commentId: reply.id,
        }),
        spaceUnlocked: true,
        completedCheckInIds: withCompletedCheckIns(state.completedCheckInIds, [
          'first_space_comment',
        ]),
        currentCheckInId:
          getNextCheckInId('first_space_comment') ?? state.currentCheckInId,
      }))
    } catch {
      set((state) => ({
        spacePosts: addLocalSpaceComment(state.spacePosts, post.id, reply),
        demoRuntimeState: applyDemoEvent(state, {
          type: 'space.comment.created',
          postId: post.id,
          commentId: reply.id,
        }),
        completedCheckInIds: withCompletedCheckIns(state.completedCheckInIds, [
          'first_space_comment',
        ]),
        currentCheckInId:
          getNextCheckInId('first_space_comment') ?? state.currentCheckInId,
      }))
    }
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
    const shouldConsumeDiaryRevealPrompt =
      hasPendingDiaryRevealPrompt(currentState)

    if (currentState.pendingInterestEdit) {
      const pendingEdit = currentState.pendingInterestEdit
      const existing = currentState.interestProfiles.find(
        (profile) => profile.interest === pendingEdit.interest,
      )
      if (!existing) {
        set({ pendingInterestEdit: null })
        return
      }

      const timestamp = Date.now()
      let profile = createEditedInterestProfile(existing, content)
      let profiles: InterestProfile[] | null = null
      try {
        const result = await openclawClient.updateInterestProfile(
          pendingEdit.interest,
          {
            topics: profile.topics,
            city: profile.city,
          },
        )
        profile = {
          ...result.profile,
          sources: profile.sources,
          updatedAt: result.profile.updatedAt,
        }
        profiles = result.profiles
      } catch {
        profiles = null
      }

      set((state) => {
        const memoryLine = createInterestMemoryLine(
          profile,
          `已按你的输入更新${getInterestLabel(pendingEdit.interest)}兴趣记忆。`,
        )
        const promptResult = consumePendingDiaryRevealPrompt(
          state,
          memoryLine.content,
          memoryLine.suggestions,
          shouldConsumeDiaryRevealPrompt,
        )

        return {
          pendingInterestEdit: null,
          interestProfiles:
            profiles ?? mergeInterestProfile(state.interestProfiles, profile),
          demoRuntimeState: promptResult.demoRuntimeState,
          lobsterChatLines: [
            ...state.lobsterChatLines,
            {
              id: `user-${timestamp}`,
              role: 'user',
              content,
              createdAt: new Date(timestamp).toISOString(),
            },
            {
              ...memoryLine,
              content: promptResult.content,
              suggestions: promptResult.suggestions,
            },
          ],
        }
      })
      return
    }

    const introRequest = isIntroRequest(content)
    const achievementExperienceCapability =
      achievementExperienceCapabilityMap[content]
    const capabilitySuggestion = context
      ? null
      : achievementExperienceCapability
        ? null
      : createChatCapabilitySuggestion(currentState, content)
    if (achievementExperienceCapability) {
      const timestamp = Date.now()
      const lobsterLineId = `achievement-experience-${achievementExperienceCapability}-${timestamp}`
      let shouldPrewarmDiary = false
      set((state) => {
        const firstChatDone = state.completedCheckInIds.includes(
          'first_lobster_chat',
        )
        const completedCheckInIds = withCompletedCheckIns(
          state.completedCheckInIds,
          ['first_lobster_chat'],
        )
        const nextCompletedCheckInIds = firstChatDone
          ? state.completedCheckInIds
          : completedCheckInIds
        shouldPrewarmDiary =
          getLocalDiaryEligibility(nextCompletedCheckInIds).canPrewarm
        const demoRuntimeState = applyDemoAchievementThresholds({
          completedCheckInIds: nextCompletedCheckInIds,
          demoRuntimeState: applyDemoEvent(state, { type: 'chat.sent', content }),
        })

        return {
          completedCheckInIds: nextCompletedCheckInIds,
          currentCheckInId: firstChatDone
            ? state.currentCheckInId
            : getNextCheckInId('first_lobster_chat') ?? state.currentCheckInId,
          achievementMomentQueue: firstChatDone
            ? state.achievementMomentQueue
            : enqueueAchievementMomentForUnlock(state, 'first_lobster_chat'),
          demoRuntimeState,
          lobsterChatLines: [
            ...state.lobsterChatLines,
            {
              id: `user-${timestamp}`,
              role: 'user',
              content,
              createdAt: new Date(timestamp).toISOString(),
            },
            {
              id: lobsterLineId,
              role: 'lobster',
              content: '',
              createdAt: new Date(timestamp).toISOString(),
              status: 'generating',
              source: 'mock-fallback',
            },
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

      if (shouldPrewarmDiary) {
        void get().triggerHiddenDiary()
      }

      if (!shouldSkipCapabilityIntro(achievementExperienceCapability)) {
        await streamLocalLineContent(
          lobsterLineId,
          getAchievementExperienceIntroContent(achievementExperienceCapability),
          set,
        )
      }
      await runAchievementExperienceCapability(
        achievementExperienceCapability,
        get(),
        lobsterLineId,
      )
      set((state) =>
        consumePendingDiaryRevealPromptOnLine(
          state,
          lobsterLineId,
          shouldConsumeDiaryRevealPrompt,
        ),
      )
      return
    }

    if (capabilitySuggestion) {
      const timestamp = Date.now()
      const capability =
        typeof capabilitySuggestion.payload?.capability === 'string'
          ? capabilitySuggestion.payload.capability
          : ''
      const lobsterLineId = `chat-capability-${capability || 'unknown'}-${timestamp}`
      let shouldPrewarmDiary = false
      set((state) => {
        const firstChatDone = state.completedCheckInIds.includes(
          'first_lobster_chat',
        )
        const completedCheckInIds = withCompletedCheckIns(
          state.completedCheckInIds,
          ['first_lobster_chat'],
        )
        const nextCompletedCheckInIds = firstChatDone
          ? state.completedCheckInIds
          : completedCheckInIds
        shouldPrewarmDiary =
          getLocalDiaryEligibility(nextCompletedCheckInIds).canPrewarm
        const demoRuntimeState = applyDemoAchievementThresholds({
          completedCheckInIds: nextCompletedCheckInIds,
          demoRuntimeState: applyDemoEvent(state, { type: 'chat.sent', content }),
        })

        return {
          completedCheckInIds: nextCompletedCheckInIds,
          currentCheckInId: firstChatDone
            ? state.currentCheckInId
            : getNextCheckInId('first_lobster_chat') ?? state.currentCheckInId,
          achievementMomentQueue: firstChatDone
            ? state.achievementMomentQueue
            : enqueueAchievementMomentForUnlock(state, 'first_lobster_chat'),
          demoRuntimeState,
          lobsterChatLines: [
            ...state.lobsterChatLines,
            {
              id: `user-${timestamp}`,
              role: 'user',
              content,
              createdAt: new Date(timestamp).toISOString(),
            },
            {
              id: lobsterLineId,
              role: 'lobster',
              content: '',
              createdAt: new Date(timestamp).toISOString(),
              status: 'generating',
              source: 'mock-fallback',
            },
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

      if (shouldPrewarmDiary) {
        void get().triggerHiddenDiary()
      }

      if (!shouldSkipCapabilityIntro(capability)) {
        await streamLocalLineContent(
          lobsterLineId,
          createChatCapabilityPromptLine(capabilitySuggestion).content,
          set,
        )
      }
      await runAchievementExperienceCapability(capability, get(), lobsterLineId)
      set((state) =>
        consumePendingDiaryRevealPromptOnLine(
          state,
          lobsterLineId,
          shouldConsumeDiaryRevealPrompt,
        ),
      )
      return
    }

    const chatContext = createPrivateChatContext(currentState, content, context)
    const chatInput = {
      content,
      lobsterProfile: currentState.lobsterProfile,
      context: chatContext,
      presentationMode: introRequest ? 'slow' as const : 'normal' as const,
    }
    const timestamp = Date.now()
    const userLineId = `user-${timestamp}`
    const lobsterLineId = `lobster-${timestamp}`
    let shouldCompleteFirstChat = false
    let shouldPrewarmDiary = false

    set((state) => {
      if (state.lobsterChatBusy) {
        return state
      }
      const firstChatDone = state.completedCheckInIds.includes(
        'first_lobster_chat',
      )
      const completedCheckInIds = withCompletedCheckIns(
        state.completedCheckInIds,
        ['first_lobster_chat'],
      )
      const nextCompletedCheckInIds = firstChatDone
        ? state.completedCheckInIds
        : completedCheckInIds
      shouldPrewarmDiary =
        getLocalDiaryEligibility(nextCompletedCheckInIds).canPrewarm

      return {
        lobsterChatBusy: true,
        demoRuntimeState: applyDemoAchievementThresholds({
          completedCheckInIds: nextCompletedCheckInIds,
          demoRuntimeState: applyDemoEvent(state, { type: 'chat.sent', content }),
        }),
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
        const completedLineContent = line?.content ?? ''
        const firstChatDone = state.completedCheckInIds.includes(
          'first_lobster_chat',
        )
        shouldCompleteFirstChat = !firstChatDone
        const completedCheckInIds = withCompletedCheckIns(
          state.completedCheckInIds,
          ['first_lobster_chat'],
        )
        const nextDemoRuntimeState = applyDemoEvent(state, {
          type: 'chat.response.completed',
          content: completedLineContent,
        })
        const nextSuggestions = introRequest
          ? createIntroCompletedSuggestions(state)
          : firstChatDone
            ? createChatSuggestions(state, chatInput.content)
            : createFirstChatSuggestions(state, chatInput.content)
        const promptResult = consumePendingDiaryRevealPrompt(
          state,
          completedLineContent,
          nextSuggestions,
          shouldConsumeDiaryRevealPrompt,
          nextDemoRuntimeState,
        )
        const nextCompletedCheckInIds = completeInterestTopicStreakIfReady({
          ...state,
          completedCheckInIds: firstChatDone
            ? state.completedCheckInIds
            : completedCheckInIds,
          demoRuntimeState: nextDemoRuntimeState,
        })
        const nextChatLines = updateChatLine(
          state.lobsterChatLines,
          lobsterLineId,
          {
            status:
              line?.source === 'mock-fallback' && !introRequest
                ? 'fallback'
                : 'complete',
            content: promptResult.content,
            card: line?.card,
            suggestions: promptResult.suggestions,
          },
        )

        return {
          lobsterChatBusy: false,
          completedCheckInIds: nextCompletedCheckInIds,
          currentCheckInId: firstChatDone
            ? state.currentCheckInId
            : getNextCheckInId('first_lobster_chat') ?? state.currentCheckInId,
          achievementMomentQueue: firstChatDone
            ? state.achievementMomentQueue
            : enqueueAchievementMomentForUnlock(state, 'first_lobster_chat'),
          demoRuntimeState: promptResult.demoRuntimeState,
          lobsterChatLines: nextChatLines,
        }
      })

      if (shouldCompleteFirstChat) {
        void openclawClient
          .completeCheckIn('first_lobster_chat')
          .then((result) => {
            let shouldPrewarmDiaryFromApi = false
            set((state) => {
              const completedCheckInIds = result.checkins
                .filter((item) => item.status === 'done')
                .map((item) => item.key)
              const activeCheckIn = result.checkins.find(
                (item) => item.status === 'active',
              )
              const nextCompletedCheckInIds =
                completedCheckInIds.length > 0
                  ? withCompletedCheckIns(
                      state.completedCheckInIds,
                      completedCheckInIds,
                    )
                  : state.completedCheckInIds
              shouldPrewarmDiaryFromApi =
                getLocalDiaryEligibility(nextCompletedCheckInIds).canPrewarm

              return {
                completedCheckInIds: nextCompletedCheckInIds,
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
            if (shouldPrewarmDiaryFromApi) {
              void get().triggerHiddenDiary()
            }
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

      if (shouldPrewarmDiary) {
        void get().triggerHiddenDiary()
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
          set((state) => ({
            interestProfiles: interestResult.profiles,
            lobsterChatLines: interestResult.receipt
              ? updateChatLine(state.lobsterChatLines, lobsterLineId, {
                  content: appendInterestReceiptToLineContent(
                    state.lobsterChatLines.find(
                      (line) => line.id === lobsterLineId,
                    )?.content ?? '',
                    interestResult.receipt,
                  ),
                })
              : state.lobsterChatLines,
          }))
          if (get().demoRuntimeState.musicTalkCount >= musicTopicStreakThreshold) {
            get().completeCheckIn('interest_topic_streak_3')
          }
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

          return {
            interestProfiles: profiles,
            lobsterChatLines: updateChatLine(state.lobsterChatLines, lobsterLineId, {
              content: appendInterestReceiptToLineContent(
                state.lobsterChatLines.find(
                  (line) => line.id === lobsterLineId,
                )?.content ?? '',
                localInterestUpdate.receipt,
              ),
            }),
          }
        })
        if (get().demoRuntimeState.musicTalkCount >= musicTopicStreakThreshold) {
          get().completeCheckIn('interest_topic_streak_3')
        }
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
          const restoredChatLines = normalizeRestoredLobsterChatLines(
            bootstrap.lobsterChatLines ?? [],
          )
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
            diarySurpriseVisible: false,
            diaryUnlocked: bootstrap.diary?.revealed ?? state.diaryUnlocked,
            diaryEntries: bootstrap.diary?.entries
              ? normalizeDiaryEntries(bootstrap.diary.entries)
              : state.diaryEntries,
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

        if (
          getLocalDiaryEligibility(get().completedCheckInIds).canPrewarm ||
          bootstrap.diary?.canTrigger
        ) {
          void get().triggerHiddenDiary()
        }
      })
      .catch(() => undefined)
  },
}))

useLobsterStore.subscribe((state) => {
  schedulePersistLobsterChatLines(state.lobsterChatLines)
})
