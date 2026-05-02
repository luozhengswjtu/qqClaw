import { create } from 'zustand'
import { openclawAiAdapter } from '../ai/openclawAiAdapter'
import { openclawClient } from '../api/openclawClient'
import {
  conversations,
  defaultLobsterProfile,
  lobsterCheckIns,
  messages,
} from '../data/mockData'
import type {
  GroupPermissionScope,
  Interest,
  LobsterChatLine,
  LobsterProfile,
  Personality,
  QQMessage,
  SummaryCardGroup,
  WorkLogEntry,
} from '../types'

type AppView = 'qq' | 'adoption' | 'lobster_chat'

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
  lobsterChatLines: LobsterChatLine[]
  lobsterChatBusy: boolean
  lobsterProfile: LobsterProfile
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
  sendLobsterChatMessage: (content: string) => Promise<void>
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
  hydrateFromOpenClaw: () => void
}

const initialAdoptionDraft: AdoptionDraft = {
  lobsterName: defaultLobsterProfile.name,
  userCallsign: defaultLobsterProfile.userCallsign,
  personality: defaultLobsterProfile.personality,
  interests: defaultLobsterProfile.interests,
}

function withCheckIn(checkIns: string[], checkInId: string) {
  return checkIns.includes(checkInId) ? checkIns : [...checkIns, checkInId]
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
    diaryMaterial: false,
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

function getCheckInFeedback(checkInId: string) {
  const next = getNextCheckInId(checkInId)
  const nextTitle = lobsterCheckIns.find((item) => item.id === next)?.title

  const feedback: Record<string, string> = {
    first_lobster_chat:
      '我记住啦，这是我的第一面小红旗。下一步我会先问你要哪些群的权限，不会偷偷看。',
    first_group_permission:
      '权限记好了。下一步我会把这些群里的重点整理成一张可切换的总结卡。',
    first_enable_mentions:
      '群聊总结卡已经整理好。下一步先看卡片里的重点。',
    first_view_mentions:
      '群聊总结卡看过啦。下一步我们试试从卡片跳回原来的群消息。',
    first_jump_source:
      '来源也对上了。下一步可以展开看这张群聊总结卡里的简短摘要。',
    first_group_summary:
      '群聊总结摘要看过了。下一步我可以先写一条可复制到群里的回复草稿。',
    first_reply_draft:
      '草稿只是草稿，发送一定等你确认。下一步可以看看我把刚才做过的事记在哪里。',
    first_view_work_log:
      '工作记录已经留下了。下一步我可以试着写一条龙虾空间动态预览。',
    first_space_post:
      '空间动态先停在预览里。最后一步，我们试试在龙虾空间里回复一次评论。',
    first_space_comment:
      '新手打卡完成。我会慢慢变成更可靠的 QQ 小伙伴。',
  }

  const currentFeedback = feedback[checkInId] ?? '这一步完成啦。'

  return nextTitle && checkInId !== 'first_space_comment'
    ? `${currentFeedback} 接下来是：${nextTitle}。`
    : currentFeedback
}

function createGuideLine(checkInId: string): LobsterChatLine {
  return {
    id: `guide-${checkInId}-${Date.now()}`,
    role: 'lobster',
    content: getCheckInFeedback(checkInId),
    createdAt: new Date().toISOString(),
    status: 'complete',
    source: 'mock-fallback',
  }
}

function completeCheckInQuietPatch(
  state: LobsterAppState,
  checkInId: string,
) {
  const completedCheckInIds = withCheckIn(state.completedCheckInIds, checkInId)
  return {
    completedCheckInIds,
    currentCheckInId: getNextCheckInId(checkInId) ?? state.currentCheckInId,
  }
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
  lobsterChatLines: [],
  lobsterChatBusy: false,
  lobsterProfile: defaultLobsterProfile,
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
        currentCheckInId: 'first_lobster_chat',
        completedCheckInIds: state.completedCheckInIds,
        lobsterProfile,
      }
    })

    if (adoptionPayload) {
      void openclawClient.saveAdoption(adoptionPayload).catch(() => undefined)
    }
  },

  completeCheckIn: (checkInId) => {
    set((state) => {
      const alreadyDone = state.completedCheckInIds.includes(checkInId)
      const completedCheckInIds = withCheckIn(state.completedCheckInIds, checkInId)
      return {
        completedCheckInIds,
        currentCheckInId: getNextCheckInId(checkInId) ?? state.currentCheckInId,
        lobsterChatLines: alreadyDone
          ? state.lobsterChatLines
          : [...state.lobsterChatLines, createGuideLine(checkInId)],
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
                ? completedCheckInIds
                : state.completedCheckInIds,
            currentCheckInId:
              activeCheckIn?.key ?? getFirstOpenCheckInId(completedCheckInIds),
          }
        })
      })
      .catch(() => undefined)
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

    set((state) => completeCheckInQuietPatch(state, 'first_group_permission'))
    void openclawClient
      .completeCheckIn('first_group_permission')
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
                ? completedCheckInIds
                : state.completedCheckInIds,
            currentCheckInId:
              activeCheckIn?.key ?? getFirstOpenCheckInId(completedCheckInIds),
          }
        })
      })
      .catch(() => undefined)

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

    const completed = get().completedCheckInIds
    if (!completed.includes('first_view_mentions')) {
      get().completeCheckIn('first_view_mentions')
    }
    if (!completed.includes('first_jump_source')) {
      get().completeCheckIn('first_jump_source')
    }
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
      }),
    }))

    set((state) => completeCheckInQuietPatch(state, 'first_enable_mentions'))
    void openclawClient
      .completeCheckIn('first_enable_mentions')
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
                ? completedCheckInIds
                : state.completedCheckInIds,
            currentCheckInId:
              activeCheckIn?.key ?? getFirstOpenCheckInId(completedCheckInIds),
          }
        })
      })
      .catch(() => undefined)
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
      }),
    }))

    get().completeCheckIn('first_reply_draft')
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
      }),
    }))

    get().completeCheckIn('first_view_work_log')
  },

  sendLobsterChatMessage: async (rawContent) => {
    const content = rawContent.trim()
    if (!content) {
      return
    }

    let input: { content: string; lobsterProfile: LobsterProfile } | null = null
    const timestamp = Date.now()
    const userLineId = `user-${timestamp}`
    const lobsterLineId = `lobster-${timestamp}`
    let shouldCompleteFirstChat = false

    set((state) => {
      if (state.lobsterChatBusy) {
        return state
      }

      input = {
        content,
        lobsterProfile: state.lobsterProfile,
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

    if (!input) {
      return
    }

    try {
      for await (const event of openclawAiAdapter.streamLobsterChat(input)) {
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
          lobsterChatLines: [
            ...updateChatLine(
              state.lobsterChatLines,
              lobsterLineId,
              {
                status: line?.source === 'mock-fallback' ? 'fallback' : 'complete',
              },
            ),
            ...(firstChatDone ? [] : [createGuideLine('first_lobster_chat')]),
          ],
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
                    ? completedCheckInIds
                    : state.completedCheckInIds,
                currentCheckInId:
                  activeCheckIn?.key ??
                  getFirstOpenCheckInId(completedCheckInIds),
              }
            })
          })
          .catch(() => undefined)
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

          return {
            appView: bootstrap.lobster?.adoptedAt ? 'lobster_chat' : state.appView,
            lobsterProfile: bootstrap.lobster ?? state.lobsterProfile,
            lobsterAdopted: Boolean(bootstrap.lobster?.adoptedAt),
            lobsterDiscovered:
              Boolean(bootstrap.lobster) || state.lobsterDiscovered,
            completedCheckInIds:
              completedCheckInIds.length > 0
                ? completedCheckInIds
                : state.completedCheckInIds,
            currentCheckInId:
              activeCheckIn?.key ?? getFirstOpenCheckInId(completedCheckInIds),
            permissionScopes: bootstrap.permissions,
            authorizedGroupIds: bootstrap.permissions
              .filter((permission) => permission.summarizeGroup)
              .map((permission) => permission.groupId),
          }
        })
      })
      .catch(() => undefined)
  },
}))
