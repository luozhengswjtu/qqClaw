import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  Check,
  ExternalLink,
  FileText,
  MessageSquare,
  MoreHorizontal,
  Search,
  Send,
  Settings,
  Smile,
  Sparkles,
  Target,
  Trophy,
  Users,
} from 'lucide-react'
import {
  conversations,
  currentUser,
  interestOptions,
  lobsterCheckIns,
  lobsterRewards,
  personalityOptions,
} from '../data/mockData'
import { useLobsterStore } from '../store/useLobsterStore'
import type {
  GroupPermissionScope,
  LobsterChatLine,
  QQMessage,
  SummaryCardGroup,
  WorkLogEntry,
} from '../types'
import { LobsterAvatar } from './LobsterAvatar'

const chatStatusLabel: Record<
  NonNullable<LobsterChatLine['status']>,
  string
> = {
  generating: '生成中',
  reviewing: '审查中',
  complete: '已完成',
  actionable: '可操作',
  fallback: 'fallback',
  failed: '失败',
}

function Avatar({ label, active }: { label: string; active?: boolean }) {
  return (
    <div
      className={[
        'grid h-10 w-10 shrink-0 place-items-center rounded-lg text-sm font-semibold',
        active ? 'bg-qq-500 text-white' : 'bg-slate-100 text-ink-700',
      ].join(' ')}
    >
      {label}
    </div>
  )
}

function PermissionToggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-ink-700">
      <span>{label}</span>
      <input
        className="h-4 w-4 accent-qq-500"
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  )
}

function PermissionRequestCard({
  lineId,
  groupTitle,
  selectedGroupIds,
  groupOptions,
  initialPermissions,
  confirmed,
  disabled,
  onSave,
}: {
  lineId: string
  groupTitle: string
  selectedGroupIds: string[]
  groupOptions: Array<{
    id: string
    title: string
  }>
  initialPermissions: GroupPermissionScope
  confirmed?: boolean
  disabled: boolean
  onSave: (permissions: GroupPermissionScope, groupIds: string[]) => void
}) {
  const [permissions, setPermissions] = useState(initialPermissions)
  const initialGroupIds =
    selectedGroupIds.length > 0 ? selectedGroupIds : [initialPermissions.groupId]
  const [groupIds, setGroupIds] = useState(initialGroupIds)
  const selectedGroupTitle =
    groupIds.length > 0
      ? `${groupIds.length} 个群已选择`
      : groupTitle

  function patchPermissions(patch: Partial<GroupPermissionScope>) {
    setPermissions((current) => ({
      ...current,
      ...patch,
    }))
  }

  function toggleGroup(groupId: string, checked: boolean) {
    setGroupIds((current) => {
      const next = checked
        ? Array.from(new Set([...current, groupId]))
        : current.filter((id) => id !== groupId)
      const fallback = checked
        ? groupId
        : next[0] ?? groupOptions[0]?.id ?? permissions.groupId
      patchPermissions({
        groupId: fallback,
        collectMentions: permissions.summarizeGroup,
        summarizeGroup: permissions.summarizeGroup,
        draftReply: permissions.draftReply,
        diaryMaterial: false,
      })
      return next
    })
  }

  return (
    <div className="mt-3 rounded-lg border border-qq-100 bg-qq-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink-900">群聊权限设置</p>
          <p className="mt-1 text-xs leading-5 text-ink-500">
            {selectedGroupTitle}
          </p>
        </div>
        <span className="rounded bg-white px-2 py-1 text-xs text-qq-700">
          {confirmed ? '已授权' : '可撤回'}
        </span>
      </div>

      <div className="mt-3 block text-xs font-medium text-ink-500">
        授权群聊
        <div className="mt-1 space-y-2">
          {groupOptions.map((group) => (
            <label
              className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm text-ink-700"
              key={group.id}
            >
              <span>{group.title}</span>
              <input
                className="h-4 w-4 accent-qq-500"
                type="checkbox"
                checked={groupIds.includes(group.id)}
                disabled={confirmed}
                onChange={(event) => toggleGroup(group.id, event.target.checked)}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <PermissionToggle
          label="整理群聊重点"
          checked={permissions.summarizeGroup}
          disabled={confirmed}
          onChange={(checked) =>
            patchPermissions({
              collectMentions: checked,
              summarizeGroup: checked,
            })
          }
        />
        <PermissionToggle
          label="生成回复草稿"
          checked={permissions.draftReply}
          disabled={confirmed}
          onChange={(checked) => patchPermissions({ draftReply: checked })}
        />
      </div>

      {confirmed ? (
        <div
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2.5 text-sm font-semibold text-qq-700 ring-1 ring-qq-100"
          id={`${lineId}-permission-note`}
        >
          <Check className="h-4 w-4" />
          授权已确认，正在整理群聊总结
        </div>
      ) : (
        <button
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-qq-500 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-qq-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          type="button"
          disabled={disabled || groupIds.length === 0}
          onClick={() => onSave(permissions, groupIds)}
          aria-describedby={`${lineId}-permission-note`}
        >
          <Check className="h-4 w-4" />
          确认授权
        </button>
      )}
      <p
        className="mt-2 text-xs leading-5 text-ink-500"
        id={confirmed ? undefined : `${lineId}-permission-note`}
      >
        相关 @ 会跟随对应群的总结一起展示。
      </p>
    </div>
  )
}

function SummaryCard({
  groups,
  onOpenSource,
  onViewSummary,
  onRequestReplyDraft,
  onAskFollowUp,
}: {
  groups: SummaryCardGroup[]
  onOpenSource: (message: QQMessage) => void
  onViewSummary: () => void
  onRequestReplyDraft: (groupId: string, sourceMessageId?: string) => void
  onAskFollowUp: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [activeGroupId, setActiveGroupId] = useState(groups[0]?.groupId ?? '')
  const activeGroup =
    groups.find((group) => group.groupId === activeGroupId) ?? groups[0]

  if (!activeGroup) {
    return null
  }

  const fallbackSource =
    activeGroup.mentions[0] ?? activeGroup.sourceMessages[0]
  const primarySignal = activeGroup.mentions[0]
  const sourceLabel =
    primarySignal?.sourceLabel ??
    (primarySignal ? `${primarySignal.senderName} / ${primarySignal.sentAt}` : null)

  function viewSummary() {
    setExpanded((current) => !current)
    onViewSummary()
  }

  return (
    <div className="mt-3 rounded-lg border border-qq-100 bg-white p-4">
      {groups.length > 1 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {groups.map((group) => (
            <button
              className={[
                'rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                group.groupId === activeGroup.groupId
                  ? 'border-qq-200 bg-qq-500 text-white'
                  : 'border-slate-200 bg-slate-50 text-ink-600 hover:bg-white',
              ].join(' ')}
              type="button"
              key={group.groupId}
              onClick={() => {
                setActiveGroupId(group.groupId)
                setExpanded(false)
              }}
            >
              {group.groupTitle}
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink-900">群聊总结</p>
          <p className="mt-1 text-xs leading-5 text-ink-500">
            {activeGroup.groupTitle}
          </p>
        </div>
        <span className="rounded bg-qq-50 px-2 py-1 text-xs text-qq-700">
          {activeGroup.source}
        </span>
      </div>
      <p className="mt-3 line-clamp-4 whitespace-pre-line text-sm leading-6 text-ink-800">
        {activeGroup.summary}
      </p>
      {sourceLabel ? (
        <p className="mt-1 text-xs leading-5 text-ink-500">来源：{sourceLabel}</p>
      ) : null}
      {activeGroup.mentions.length > 0 ? (
        <div className="mt-3 rounded-lg border border-lobster-100 bg-lobster-50 px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-lobster-700">
            相关 @ 消息
          </p>
          <span className="rounded bg-white px-2 py-0.5 text-xs text-lobster-600">
            {activeGroup.mentions.length} 条
          </span>
        </div>
        <div className="mt-2 space-y-2">
          {activeGroup.mentions.map((message) => (
            <div className="rounded-lg bg-white px-3 py-2" key={message.id}>
              <div className="flex items-center justify-between gap-3 text-xs text-ink-500">
                <span>{message.senderName}</span>
                <span>{message.sourceLabel ?? message.sentAt}</span>
              </div>
              <p className="mt-1 text-sm leading-6 text-ink-900">
                {message.content}
              </p>
              <button
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-qq-50 px-3 py-1.5 text-xs font-semibold text-qq-700 transition hover:bg-qq-100"
                type="button"
                onClick={() => onOpenSource(message)}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                跳回来源
              </button>
            </div>
          ))}
        </div>
        </div>
      ) : null}
      {expanded ? (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-ink-700">完整摘要</p>
            <span className="rounded bg-white px-2 py-0.5 text-xs text-ink-500">
              展开态
            </span>
          </div>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink-800">
            {activeGroup.summary}
          </p>
        </div>
      ) : null}
      {fallbackSource ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-qq-50 px-3 py-1.5 text-xs font-semibold text-qq-700 transition hover:bg-qq-100"
            type="button"
            onClick={() => onOpenSource(fallbackSource)}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            跳回原群
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-ink-600 transition hover:bg-slate-200"
            type="button"
            onClick={viewSummary}
          >
            {expanded ? '收起完整摘要' : '查看完整摘要'}
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-lobster-50 px-3 py-1.5 text-xs font-semibold text-lobster-700 transition hover:bg-lobster-100"
            type="button"
            onClick={() =>
              onRequestReplyDraft(activeGroup.groupId, fallbackSource.id)
            }
          >
            写回复草稿
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-ink-500 ring-1 ring-slate-200 transition hover:bg-slate-50"
            type="button"
          >
            降低提醒频率
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-ink-500 ring-1 ring-slate-200 transition hover:bg-slate-50"
            type="button"
            onClick={onAskFollowUp}
          >
            继续追问
          </button>
        </div>
      ) : null}
    </div>
  )
}

function ReplyDraftCard({
  groupTitle,
  draft,
  sourceMessage,
  source,
  onOpenSource,
}: {
  groupTitle: string
  draft: string
  sourceMessage?: QQMessage | null
  source: string
  onOpenSource: (message: QQMessage) => void
}) {
  const [copied, setCopied] = useState(false)

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(draft)
      setCopied(true)
      return true
    } catch {
      setCopied(false)
      return false
    }
  }

  async function copyDraftAndOpenSource() {
    await copyDraft()
    if (sourceMessage) {
      onOpenSource(sourceMessage)
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-lobster-100 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink-900">回复草稿</p>
          <p className="mt-1 text-xs leading-5 text-ink-500">{groupTitle}</p>
        </div>
        <span className="rounded bg-lobster-50 px-2 py-1 text-xs text-lobster-700">
          {source}
        </span>
      </div>
      {sourceMessage ? (
        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
          <div className="flex items-center justify-between gap-3 text-xs text-ink-500">
            <span>{sourceMessage.senderName}</span>
            <span>{sourceMessage.sourceLabel ?? sourceMessage.sentAt}</span>
          </div>
          <p className="mt-1 max-h-10 overflow-hidden text-xs leading-5 text-ink-600">
            {sourceMessage.content}
          </p>
        </div>
      ) : null}
      <p className="mt-3 whitespace-pre-line rounded-lg bg-lobster-50 px-3 py-3 text-sm leading-6 text-ink-900">
        {draft}
      </p>
      {sourceMessage ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-qq-50 px-3 py-1.5 text-xs font-semibold text-qq-700 transition hover:bg-qq-100"
            type="button"
            onClick={() => void copyDraftAndOpenSource()}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {copied ? '已复制到剪切板' : '复制并跳回群聊'}
          </button>
        </div>
      ) : null}
    </div>
  )
}

function WorkLogCard({
  title,
  text,
  latestWorkLogs,
  source,
}: {
  title: string
  text: string
  latestWorkLogs: WorkLogEntry[]
  source: string
}) {
  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink-900">{title}</p>
          <p className="mt-1 text-xs leading-5 text-ink-500">
            可用于后续追问的小龙虾动作记录
          </p>
        </div>
        <span className="rounded bg-slate-100 px-2 py-1 text-xs text-ink-600">
          {source}
        </span>
      </div>
      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-ink-800">
        {text}
      </p>
      <div className="mt-3 space-y-2">
        {latestWorkLogs.slice(0, 4).map((log) => (
          <div
            className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5"
            key={log.id}
          >
            <div className="flex items-center justify-between gap-3 text-ink-500">
              <span>{log.type}</span>
              <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
            </div>
            <p className="mt-1 font-medium text-ink-800">{log.title}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function LobsterChatView() {
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const lobsterProfile = useLobsterStore((state) => state.lobsterProfile)
  const chatLines = useLobsterStore((state) => state.lobsterChatLines)
  const sending = useLobsterStore((state) => state.lobsterChatBusy)
  const currentCheckInId = useLobsterStore((state) => state.currentCheckInId)
  const completedCheckInIds = useLobsterStore(
    (state) => state.completedCheckInIds,
  )
  const sendLobsterChatMessage = useLobsterStore(
    (state) => state.sendLobsterChatMessage,
  )
  const completeCheckIn = useLobsterStore((state) => state.completeCheckIn)
  const requestGroupPermissions = useLobsterStore(
    (state) => state.requestGroupPermissions,
  )
  const saveGroupPermissions = useLobsterStore(
    (state) => state.saveGroupPermissions,
  )
  const setActiveConversation = useLobsterStore(
    (state) => state.setActiveConversation,
  )
  const openSummarySource = useLobsterStore((state) => state.openSummarySource)
  const summarizeAuthorizedGroup = useLobsterStore(
    (state) => state.summarizeAuthorizedGroup,
  )
  const requestReplyDraft = useLobsterStore((state) => state.requestReplyDraft)
  const generateWorkLog = useLobsterStore((state) => state.generateWorkLog)
  const completedCount = completedCheckInIds.length
  const currentCheckIn = lobsterCheckIns.find(
    (item) => item.id === currentCheckInId,
  )
  const activeCheckIn =
    currentCheckIn && !completedCheckInIds.includes(currentCheckIn.id)
      ? currentCheckIn
      : undefined
  const nextReward = lobsterRewards.find(
    (reward) => completedCount < reward.requiredCheckIns,
  )
  const lastReward = [...lobsterRewards]
    .reverse()
    .find((reward) => completedCount >= reward.requiredCheckIns)
  const progressPercent = Math.round(
    (completedCount / lobsterCheckIns.length) * 100,
  )
  const guideActionLabel: Record<string, string> = {
    first_group_permission: '去设置权限',
    first_enable_mentions: '生成群聊总结卡',
    first_view_mentions: '查看群聊总结卡',
    first_jump_source: '跳回群消息',
    first_group_summary: '查看群摘要',
    first_reply_draft: '写回复草稿',
    first_view_work_log: '查看工作记录',
    first_space_post: '生成空间预览',
    first_space_comment: '回复空间评论',
  }
  const personalityLabel =
    personalityOptions.find((item) => item.id === lobsterProfile.personality)
      ?.label ?? '社恐观察'
  const interestLabels = lobsterProfile.interests
    .map((interest) => interestOptions.find((item) => item.id === interest)?.label)
    .filter((label): label is string => Boolean(label))

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [chatLines])

  async function sendMessage() {
    const content = draft.trim()
    if (!content || sending) {
      return
    }

    setDraft('')
    await sendLobsterChatMessage(content)
  }

  function completeCurrentGuide() {
    if (!activeCheckIn || activeCheckIn.id === 'first_lobster_chat') {
      return
    }

    if (activeCheckIn.id === 'first_group_permission') {
      requestGroupPermissions()
      return
    }

    if (activeCheckIn.id === 'first_enable_mentions') {
      void summarizeAuthorizedGroup()
      return
    }

    if (activeCheckIn.id === 'first_view_mentions') {
      completeCheckIn('first_view_mentions')
      return
    }

    if (activeCheckIn.id === 'first_group_summary') {
      completeCheckIn('first_group_summary')
      return
    }

    if (activeCheckIn.id === 'first_reply_draft') {
      void requestReplyDraft()
      return
    }

    if (activeCheckIn.id === 'first_view_work_log') {
      void generateWorkLog()
      return
    }

    completeCheckIn(activeCheckIn.id)
  }

  function renderLineCard(line: LobsterChatLine) {
    if (!line.card) {
      return null
    }

    if (line.card.type === 'permission_request') {
      return (
        <PermissionRequestCard
          lineId={line.id}
          groupTitle={line.card.groupTitle}
          selectedGroupIds={line.card.selectedGroupIds}
          groupOptions={line.card.groupOptions}
          initialPermissions={line.card.permissions}
          confirmed={line.card.confirmed}
          disabled={sending}
          onSave={(permissions, groupIds) =>
            void saveGroupPermissions(permissions, groupIds)
          }
        />
      )
    }

    if (line.card.type === 'summary_card') {
      return (
        <SummaryCard
          groups={line.card.groups}
          onOpenSource={openSummarySource}
          onViewSummary={() => completeCheckIn('first_group_summary')}
          onRequestReplyDraft={(groupId, sourceMessageId) =>
            void requestReplyDraft(groupId, sourceMessageId)
          }
          onAskFollowUp={() =>
            void sendLobsterChatMessage('这张群聊总结卡里最需要我马上处理什么？')
          }
        />
      )
    }

    if (line.card.type === 'reply_draft_card') {
      return (
        <ReplyDraftCard
          groupTitle={line.card.groupTitle}
          draft={line.card.draft}
          sourceMessage={line.card.sourceMessage}
          source={line.card.source}
          onOpenSource={openSummarySource}
        />
      )
    }

    return (
      <WorkLogCard
        title={line.card.title}
        text={line.card.text}
        latestWorkLogs={line.card.latestWorkLogs}
        source={line.card.source}
      />
    )
  }

  return (
    <div className="flex h-screen min-h-[680px] bg-[#edf3fb] p-4 text-ink-900">
      <div className="mx-auto grid h-full min-h-0 w-full max-w-[1440px] grid-cols-[74px_minmax(220px,280px)_minmax(520px,1fr)_340px] overflow-hidden rounded-lg border border-white/80 bg-white shadow-panel">
        <aside className="flex flex-col items-center justify-between bg-[#e8f2ff] px-3 py-4">
          <div className="space-y-4">
            <Avatar label={currentUser.avatar} active />
            <nav className="flex flex-col items-center gap-2">
              <button
                className="grid h-11 w-11 place-items-center rounded-lg bg-white text-qq-600 shadow-sm"
                type="button"
                aria-label="消息"
              >
                <MessageSquare className="h-5 w-5" />
              </button>
              <button
                className="grid h-11 w-11 place-items-center rounded-lg text-ink-500 transition hover:bg-white hover:text-qq-600"
                type="button"
                aria-label="联系人"
              >
                <Users className="h-5 w-5" />
              </button>
              <button
                className="grid h-11 w-11 place-items-center rounded-lg text-ink-500 transition hover:bg-white hover:text-qq-600"
                type="button"
                aria-label="文件"
              >
                <FileText className="h-5 w-5" />
              </button>
            </nav>
          </div>
          <div className="flex flex-col gap-2">
            <button
              className="grid h-10 w-10 place-items-center rounded-lg text-ink-500 transition hover:bg-white hover:text-qq-600"
              type="button"
              aria-label="通知"
            >
              <Bell className="h-5 w-5" />
            </button>
            <button
              className="grid h-10 w-10 place-items-center rounded-lg text-ink-500 transition hover:bg-white hover:text-qq-600"
              type="button"
              aria-label="设置"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </aside>

        <aside className="min-h-0 overflow-hidden border-r border-slate-100 bg-slate-50">
          <div className="border-b border-slate-100 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar label={currentUser.avatar} active />
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-ink-900">
                    消息
                  </p>
                  <p className="truncate text-xs text-ink-500">
                    {currentUser.signature}
                  </p>
                </div>
              </div>
              <button
                className="grid h-9 w-9 place-items-center rounded-lg text-ink-500 transition hover:bg-white hover:text-qq-600"
                type="button"
                aria-label="设置"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
            <label className="mt-4 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-ink-500">
              <Search className="h-4 w-4" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                placeholder="搜索"
                readOnly
              />
            </label>
          </div>

          <div className="space-y-1 p-2">
            <button
              className="grid w-full grid-cols-[42px_1fr_auto] gap-3 rounded-lg bg-white px-2 py-3 text-left shadow-sm"
              type="button"
            >
              <LobsterAvatar size="sm" mood="happy" />
              <span className="min-w-0">
                <span className="truncate text-sm font-semibold text-ink-900">
                  {lobsterProfile.name}
                </span>
                <span className="mt-1 block truncate text-xs text-ink-500">
                  我已经住进 QQ 了
                </span>
              </span>
              <span className="text-xs text-ink-500">现在</span>
            </button>
            {conversations.map((conversation) => (
              <button
                className="grid w-full grid-cols-[42px_1fr_auto] gap-3 rounded-lg px-2 py-3 text-left transition hover:bg-white/80 hover:shadow-sm"
                type="button"
                key={conversation.id}
                onClick={() => setActiveConversation(conversation.id)}
              >
                <Avatar label={conversation.avatar} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink-900">
                    {conversation.title}
                  </span>
                  <span className="mt-1 block truncate text-xs text-ink-500">
                    {conversation.lastMessage}
                  </span>
                </span>
                <span className="text-xs text-ink-500">
                  {conversation.lastAt}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-[#f8fbff]">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-5">
            <div className="flex items-center gap-3">
              <LobsterAvatar size="sm" mood="happy" />
              <div>
                <h1 className="text-base font-semibold text-ink-900">
                  {lobsterProfile.name}
                </h1>
                <p className="mt-1 text-xs text-ink-500">
                  小龙虾私聊 · 还未授权读取任何群消息
                </p>
              </div>
            </div>
            <button
              className="grid h-9 w-9 place-items-center rounded-lg text-ink-500 transition hover:bg-slate-100 hover:text-qq-600"
              type="button"
              aria-label="更多"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </header>

          <div
            className="scrollbar-thin min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-6"
            ref={scrollRef}
          >
            <div className="flex justify-center">
              <span className="rounded-lg bg-slate-200/70 px-3 py-1 text-xs text-ink-500">
                刚刚
              </span>
            </div>

            <div className="flex gap-3 text-left">
              <LobsterAvatar size="sm" mood="happy" />
              <div className="max-w-[72%] space-y-1">
                <div className="flex items-center gap-2 text-xs text-ink-500">
                  <span>{lobsterProfile.name}</span>
                  <span>刚刚</span>
                </div>
                <div className="rounded-lg border border-lobster-100 bg-white px-4 py-3 text-sm leading-6 text-ink-900 shadow-sm">
                  {lobsterProfile.userCallsign}，我现在还没有看你的群消息。
                  先从这里开始聊天；等你愿意的时候，我会一步步申请权限，再帮你整理群聊和写日记。
                </div>
              </div>
            </div>

            <div className="flex gap-3 text-left">
              <LobsterAvatar size="sm" mood="curious" />
              <div className="max-w-[72%] rounded-lg border border-qq-100 bg-qq-50 px-4 py-3 text-sm leading-6 text-qq-700">
                {activeCheckIn
                  ? `当前可打卡：${activeCheckIn.title}。`
                  : '新手打卡已经全部完成。'}
                {activeCheckIn?.id === 'first_lobster_chat'
                  ? '和我说第一句话，完成后会解锁第一个小奖励。'
                  : activeCheckIn
                    ? '右侧操作完成后，会自动解锁下一步。'
                    : '奖励和工作记录会继续保留。'}
              </div>
            </div>

            {chatLines.map((line) =>
              line.role === 'user' ? (
                <div
                  className="flex flex-row-reverse gap-3 text-right"
                  key={line.id}
                >
                  <Avatar label={currentUser.avatar} active />
                  <div className="max-w-[72%] rounded-lg bg-qq-500 px-4 py-3 text-sm leading-6 text-white shadow-sm">
                    {line.content}
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 text-left" key={line.id}>
                  <LobsterAvatar size="sm" mood="happy" />
                  <div className="max-w-[72%] space-y-1">
                    <div className="rounded-lg border border-lobster-100 bg-white px-4 py-3 text-sm leading-6 text-ink-900 shadow-sm">
                      {line.content || '我正在组织语言...'}
                    </div>
                    {renderLineCard(line)}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
                      <span>
                        OpenClaw: {line.source ?? '连接中'}
                      </span>
                      {line.status ? (
                        <span
                          className={[
                            'rounded bg-white px-2 py-0.5',
                            line.status === 'fallback'
                              ? 'text-lobster-600'
                              : line.status === 'failed'
                                ? 'text-red-600'
                                : 'text-ink-500',
                          ].join(' ')}
                        >
                          {chatStatusLabel[line.status]}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>

          <footer className="shrink-0 border-t border-slate-100 bg-white px-5 py-4">
            <div className="flex items-center gap-3">
              <button
                className="grid h-9 w-9 place-items-center rounded-lg text-ink-500 transition hover:bg-slate-100 hover:text-qq-600"
                type="button"
                aria-label="表情"
              >
                <Smile className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-3 flex items-end gap-3">
              <textarea
                className="h-20 min-h-20 flex-1 resize-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-ink-500 focus:border-qq-500 focus:bg-white focus:ring-4 focus:ring-qq-100"
                placeholder="和小龙虾说句话"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void sendMessage()
                  }
                }}
              />
              <button
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-qq-500 px-4 text-sm font-semibold text-white transition hover:bg-qq-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                type="button"
                disabled={!draft.trim() || sending}
                onClick={() => void sendMessage()}
              >
                <Send className="h-4 w-4" />
                发送
              </button>
            </div>
          </footer>
        </main>

        <aside className="min-h-0 overflow-hidden border-l border-slate-100 bg-white">
          <div className="scrollbar-thin h-full overflow-y-auto px-5 py-5">
            <div className="rounded-lg bg-lobster-50 p-5 text-center">
              <LobsterAvatar size="lg" mood="happy" animated />
              <p className="mt-3 text-base font-semibold text-ink-900">
                {lobsterProfile.name}
              </p>
              <p className="mt-1 text-xs text-ink-500">
                {personalityLabel} · Lv.{lobsterProfile.level}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {interestLabels.map((label) => (
                  <span
                    className="rounded bg-white px-2 py-1 text-xs text-ink-500"
                    key={label}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <section className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-lobster-500" />
                  <p className="text-sm font-semibold text-ink-900">当前状态</p>
                </div>
                <span className="rounded bg-white px-2 py-1 text-xs text-ink-500">
                  {sending ? '生成中' : '待聊天'}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-ink-500">
                小龙虾私聊会先经过 OpenClaw。低风险闲聊直接进入聊天流，后续卡片和动作会在审查后再开放操作。
              </p>
            </section>

            <section className="mt-5 rounded-lg border border-qq-100 bg-qq-50 px-4 py-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-qq-600" />
                <p className="text-sm font-semibold text-ink-900">
                  今天先学会一件事
                </p>
              </div>

              <div className="mt-4 rounded-lg border border-white/80 bg-white px-4 py-4 shadow-sm">
                {activeCheckIn ? (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-qq-700">
                          {activeCheckIn.title}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-ink-500">
                          {activeCheckIn.description}
                        </p>
                      </div>
                      <span className="shrink-0 rounded bg-qq-50 px-2 py-1 text-xs font-medium text-qq-700">
                        {completedCount + 1}/{lobsterCheckIns.length}
                      </span>
                    </div>
                    {activeCheckIn.id === 'first_lobster_chat' ? (
                      <p className="mt-4 rounded-lg bg-lobster-50 px-3 py-2 text-xs leading-5 text-lobster-600">
                        从中间输入框和我说一句话就能完成。
                      </p>
                    ) : (
                      <button
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-qq-500 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-qq-600"
                        type="button"
                        onClick={completeCurrentGuide}
                      >
                        <Sparkles className="h-4 w-4" />
                        {guideActionLabel[activeCheckIn.id] ?? '完成这一步'}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-emerald-700">
                      新手打卡完成
                    </p>
                    <p className="mt-1 text-xs leading-5 text-ink-500">
                      打卡奖励和工作记录都会保留，后续可以继续扩展能力。
                    </p>
                  </>
                )}
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-ink-500">
                  <span>打卡进度</span>
                  <span>{completedCount}/{lobsterCheckIns.length}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-qq-500 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="mt-3 flex items-center gap-1.5">
                  {lobsterCheckIns.map((item, index) => {
                    const done = completedCheckInIds.includes(item.id)
                    const active = item.id === activeCheckIn?.id
                    const label = `${index + 1}. ${item.title}`
                  return (
                    <span
                      aria-label={label}
                      className={[
                        'h-2.5 w-2.5 rounded-full transition',
                        done
                          ? 'bg-emerald-400'
                          : active
                            ? 'bg-qq-500 ring-4 ring-qq-100'
                            : 'bg-white ring-1 ring-slate-200',
                      ].join(' ')}
                      key={item.id}
                      title={label}
                    />
                  )
                })}
                </div>
              </div>
            </section>

            <section className="mt-5 rounded-lg border border-slate-200 bg-white px-4 py-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-qq-600" />
                <p className="text-sm font-semibold text-ink-900">奖励</p>
              </div>
              {nextReward ? (
                <div className="mt-3 rounded-lg bg-slate-50 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-ink-900">
                      {nextReward.title}
                    </p>
                    <span className="text-xs text-ink-500">
                      {completedCount}/{nextReward.requiredCheckIns}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-ink-500">
                    再完成 {nextReward.requiredCheckIns - completedCount} 个打卡后解锁。
                  </p>
                </div>
              ) : null}
              {lastReward ? (
                <p className="mt-3 text-xs leading-5 text-emerald-700">
                  最近解锁：{lastReward.title}
                </p>
              ) : (
                <p className="mt-3 text-xs leading-5 text-ink-500">
                  第一次聊天后会解锁第一件小挂饰。
                </p>
              )}
            </section>
          </div>
        </aside>
      </div>
    </div>
  )
}
