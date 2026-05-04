import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  Check,
  ExternalLink,
  FileText,
  Heart,
  MessageSquare,
  MoreHorizontal,
  Search,
  Send,
  Share2,
  Settings,
  Smile,
  Sparkles,
  Trophy,
  Users,
  Image as ImageIcon,
} from 'lucide-react'
import {
  conversations,
  currentUser,
  lobsterRewards,
  mockAchievements,
} from '../data/mockData'
import { useLobsterStore } from '../store/useLobsterStore'
import type {
  GroupPermissionScope,
  LobsterChatLine,
  LobsterChatContext,
  LobsterDiaryEntry,
  LobsterSuggestion,
  LobsterSpacePost,
  QQMessage,
  SummaryCardGroup,
  WorkLogEntry,
} from '../types'
import { AchievementMomentOverlay } from './AchievementMomentOverlay'
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

type RightPanelTab = 'achievements' | 'accessories' | 'diary'

const equippedAccessoryStorageKey = 'qqclaw.equippedAccessoryId.v1'

function AccessoryPreview({
  rewardId,
  selected,
  unlocked,
}: {
  rewardId: string
  selected?: boolean
  unlocked: boolean
}) {
  const frameClass = [
    'relative grid h-12 w-12 shrink-0 place-items-center rounded-lg border bg-white',
    selected ? 'border-qq-300 ring-2 ring-qq-100' : 'border-slate-200',
    unlocked ? '' : 'opacity-45 grayscale',
  ].join(' ')

  if (rewardId === 'tiny-flag') {
    return (
      <span className={frameClass} aria-hidden="true">
        <span className="relative h-8 w-8">
          <span className="absolute left-3 top-1 h-7 w-0.5 rounded-full bg-amber-700" />
          <span className="absolute left-3 top-1 h-4 w-5 rounded-r-sm bg-red-500 shadow-sm">
            <span className="absolute inset-y-0 left-0 w-1 bg-red-600" />
          </span>
        </span>
      </span>
    )
  }

  if (rewardId === 'shell-badge') {
    return (
      <span className={frameClass} aria-hidden="true">
        <span className="relative grid h-8 w-8 place-items-center rounded-full border border-cyan-200 bg-gradient-to-br from-cyan-100 via-white to-emerald-200 shadow-inner">
          <Sparkles className="h-4 w-4 text-cyan-600" />
          <span className="absolute inset-x-2 bottom-2 h-px bg-cyan-300" />
        </span>
      </span>
    )
  }

  if (rewardId === 'logbook') {
    return (
      <span className={frameClass} aria-hidden="true">
        <span className="relative h-8 w-7 rounded border border-slate-300 bg-white/90 shadow-sm">
          <span className="absolute inset-y-1 left-1 w-1 rounded bg-qq-200" />
          <span className="absolute left-3 right-1 top-2 h-px bg-slate-300" />
          <span className="absolute left-3 right-1 top-4 h-px bg-slate-200" />
          <span className="absolute left-3 right-2 top-6 h-px bg-slate-200" />
        </span>
      </span>
    )
  }

  if (rewardId === 'space-banner') {
    return (
      <span className={frameClass} aria-hidden="true">
        <span className="relative h-8 w-9 overflow-hidden rounded-md border border-sky-200 bg-sky-100 shadow-sm">
          <span className="absolute inset-x-0 top-0 h-3 bg-qq-400" />
          <span className="absolute bottom-1 left-1 right-1 h-2 rounded bg-white/85" />
          <span className="absolute bottom-3 left-2 h-2 w-2 rounded-full bg-lobster-400" />
        </span>
      </span>
    )
  }

  return (
    <span className={frameClass} aria-hidden="true">
      <span className="grid h-8 w-8 place-items-center rounded-full border border-amber-200 bg-amber-50">
        <Sparkles className="h-5 w-5 text-amber-500" />
      </span>
    </span>
  )
}

function AccessoryOnAvatar({ rewardId }: { rewardId?: string }) {
  if (!rewardId) {
    return null
  }

  if (rewardId === 'tiny-flag') {
    return (
      <span
        className="absolute -right-1 top-0 flex h-9 w-7 origin-bottom-left -rotate-6 items-start justify-center"
        aria-label="小红旗挂饰"
        title="小红旗挂饰"
      >
        <span className="h-8 w-0.5 rounded-full bg-amber-700" />
        <span className="absolute left-3 top-0 h-4 w-5 rounded-r-sm bg-red-500 shadow-sm">
          <span className="absolute inset-y-0 left-0 w-1 bg-red-600" />
        </span>
      </span>
    )
  }

  if (rewardId === 'shell-badge') {
    return (
      <span
        className="absolute -right-1 bottom-1 grid h-5 w-5 place-items-center rounded-full border border-cyan-200 bg-white shadow-sm"
        aria-label="亮晶晶虾壳"
        title="亮晶晶虾壳"
      >
        <Sparkles className="h-3 w-3 text-cyan-600" />
      </span>
    )
  }

  if (rewardId === 'logbook') {
    return (
      <span
        className="absolute -right-1 bottom-0 h-6 w-5 rounded border border-slate-300 bg-white shadow-sm"
        aria-label="透明工作簿"
        title="透明工作簿"
      >
        <span className="absolute inset-y-1 left-1 w-0.5 rounded bg-qq-200" />
        <span className="absolute left-2.5 right-1 top-2 h-px bg-slate-300" />
        <span className="absolute left-2.5 right-1 top-3.5 h-px bg-slate-200" />
      </span>
    )
  }

  if (rewardId === 'space-banner') {
    return (
      <span
        className="absolute -right-2 top-0 h-6 w-8 overflow-hidden rounded border border-sky-200 bg-sky-100 shadow-sm"
        aria-label="龙虾空间头图"
        title="龙虾空间头图"
      >
        <span className="absolute inset-x-0 top-0 h-2 bg-qq-400" />
        <span className="absolute bottom-1 left-1 right-1 h-1.5 rounded bg-white/85" />
      </span>
    )
  }

  return (
    <span
      className="absolute -right-1 top-0 grid h-5 w-5 place-items-center rounded-full border border-amber-200 bg-white shadow-sm"
      aria-label="星星挂饰"
      title="星星挂饰"
    >
      <Sparkles className="h-3 w-3 text-amber-500" />
    </span>
  )
}

function toContextMessage(message: QQMessage) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderName: message.senderName,
    content: message.content,
    sentAt: message.sentAt,
    kind: message.kind,
    sourceLabel: message.sourceLabel,
  }
}

function createSummaryFollowUpContext(
  group: SummaryCardGroup,
): LobsterChatContext {
  return {
    type: 'summary_card_follow_up',
    summaryCard: {
      groupId: group.groupId,
      groupTitle: group.groupTitle,
      summary: group.summary,
      source: group.source,
      outputId: group.outputId,
      sourceMessageIds: group.sourceMessageIds,
      mentions: group.mentions.map(toContextMessage),
      sourceMessages: group.sourceMessages.map(toContextMessage),
    },
  }
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
  onRequestReplyDraft,
  onAskFollowUp,
}: {
  groups: SummaryCardGroup[]
  onOpenSource: (message: QQMessage) => void
  onRequestReplyDraft: (groupId: string, sourceMessageId?: string) => void
  onAskFollowUp: (group: SummaryCardGroup) => void
}) {
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
              onClick={() => setActiveGroupId(group.groupId)}
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
            调整提醒时间
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-ink-500 ring-1 ring-slate-200 transition hover:bg-slate-50"
            type="button"
            onClick={() => onAskFollowUp(activeGroup)}
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

function DiaryCard({
  entry,
  onGenerateImage,
}: {
  entry: LobsterDiaryEntry
  onGenerateImage?: () => void
}) {
  const [imageRequested, setImageRequested] = useState(false)
  const canGenerateImage = !entry.image && !imageRequested && onGenerateImage

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-lobster-100 bg-white shadow-sm">
      {entry.image ? (
        <div className="bg-ink-900">
          <img
            alt={entry.title}
            className="h-auto w-full object-cover"
            src={entry.image.url}
          />
        </div>
      ) : null}
      <div className="bg-[#fff7e8] px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink-900">{entry.title}</p>
            <p className="mt-1 text-xs text-ink-500">
              {new Date(entry.createdAt).toLocaleDateString()} · {entry.source}
            </p>
          </div>
          <LobsterAvatar size="sm" mood="happy" animated />
        </div>
        <p className="mt-4 rounded-lg bg-white/80 px-3 py-3 text-sm font-semibold leading-6 text-lobster-700">
          {entry.quote}
        </p>
        {canGenerateImage ? (
          <button
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-lobster-700 ring-1 ring-lobster-100 transition hover:bg-lobster-50"
            type="button"
            onClick={() => {
              setImageRequested(true)
              onGenerateImage?.()
            }}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            生成日记图片
          </button>
        ) : null}
        {imageRequested && !entry.image ? (
          <p className="mt-3 text-xs text-ink-500">日记图片生成中...</p>
        ) : null}
      </div>
      <div className="px-4 py-4">
        <p className="whitespace-pre-line text-sm leading-6 text-ink-800">
          {entry.text}
        </p>
        <div className="mt-4 rounded-lg border border-qq-100 bg-qq-50 px-3 py-3">
          <p className="text-xs font-semibold text-qq-700">今日成就</p>
          <p className="mt-1 text-sm leading-6 text-ink-800">
            {entry.todayAchievement}
          </p>
        </div>
      </div>
    </div>
  )
}

function SpacePostCard({
  post,
  compact,
  selected,
  onOpenSpace,
  onSelect,
  onLike,
  onShare,
  onReply,
}: {
  post: LobsterSpacePost
  compact?: boolean
  selected?: boolean
  onOpenSpace?: () => void
  onSelect?: (postId: string) => void
  onLike?: (postId: string) => void
  onShare?: (postId: string) => void
  onReply?: (postId: string, commentId?: string) => void
}) {
  const comments = post.comments ?? []
  const likeCount = post.likeCount ?? 0
  const commentCount = post.commentCount ?? comments.length
  const shareCount = post.shareCount ?? 0
  const replyTarget =
    comments.find((comment) => comment.authorType === 'friend') ?? comments[0]

  return (
    <div
      className={[
        'mt-3 overflow-hidden rounded-lg border bg-white transition',
        selected ? 'border-qq-400 ring-4 ring-qq-100' : 'border-qq-100',
      ].join(' ')}
    >
      <div className="bg-[#eaf4ff] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <LobsterAvatar size="sm" mood="happy" />
            <div>
              <p className="text-sm font-semibold text-ink-900">
                {post.authorName} 的龙虾空间
              </p>
              <p className="text-xs text-ink-500">
                {post.kind === 'diary' ? '日记动态' : '成就动态'}
              </p>
            </div>
          </div>
          <span className="rounded bg-white px-2 py-1 text-xs text-qq-700">
            小龙虾发布
          </span>
        </div>
      </div>
      <div className="px-4 py-4">
        <p className="whitespace-pre-line text-sm leading-6 text-ink-900">
          {post.content}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-500">
          <span>{likeCount} 赞</span>
          <span>{commentCount} 评论</span>
          <span>{shareCount} 分享</span>
        </div>
        {compact ? (
          <button
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-qq-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-qq-600"
            type="button"
            onClick={onOpenSpace}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            进入龙虾空间
          </button>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className={[
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                  selected
                    ? 'bg-qq-500 text-white'
                    : 'bg-qq-50 text-qq-700 hover:bg-qq-100',
                ].join(' ')}
                type="button"
                onClick={() => onSelect?.(post.id)}
              >
                <Check className="h-3.5 w-3.5" />
                {selected ? '已选择' : '选择动态'}
              </button>
              <button
                className={[
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                  post.likedByMe
                    ? 'bg-lobster-100 text-lobster-700'
                    : 'bg-slate-100 text-ink-600 hover:bg-lobster-50',
                ].join(' ')}
                type="button"
                onClick={() => onLike?.(post.id)}
              >
                <Heart className="h-3.5 w-3.5" />
                {post.likedByMe ? '已赞' : '点赞'}
              </button>
              <button
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-ink-600 transition hover:bg-qq-50 hover:text-qq-700"
                type="button"
                onClick={() => onShare?.(post.id)}
              >
                <Share2 className="h-3.5 w-3.5" />
                分享
              </button>
              <button
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-ink-600 transition hover:bg-qq-50 hover:text-qq-700"
                type="button"
                onClick={() => onReply?.(post.id, replyTarget?.id)}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                小龙虾回复
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {comments.slice(0, 4).map((comment) => (
                <div
                  className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5"
                  key={comment.id}
                >
                  <div className="flex items-center justify-between gap-3 text-ink-500">
                    <span>
                      {comment.authorName}
                      {comment.authorType === 'friend_lobster' ? '的小龙虾' : ''}
                    </span>
                    <span>
                      {comment.previewRequired ? '预览' : '评论'}
                    </span>
                  </div>
                  <p className="mt-1 text-ink-800">{comment.content}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function HiddenDiarySurprise({
  lobsterName,
  onOpen,
}: {
  lobsterName: string
  onOpen: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/30 px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-lg border border-white/80 bg-white shadow-panel">
        <div className="bg-[#fff7e8] px-5 py-5 text-center">
          <div className="mx-auto w-fit animate-bounce">
            <LobsterAvatar size="lg" mood="happy" animated />
          </div>
          <p className="mt-4 text-base font-semibold text-ink-900">
            {lobsterName} 探出头
          </p>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-ink-700">
            队长，我刚刚偷偷写了一篇日记。
            {'\n'}
            要看看吗？
          </p>
        </div>
        <div className="px-5 py-4">
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-lobster-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-lobster-600"
            type="button"
            onClick={onOpen}
          >
            <Sparkles className="h-4 w-4" />
            要看看
          </button>
        </div>
      </div>
    </div>
  )
}

export function LobsterChatView() {
  const [draft, setDraft] = useState('')
  const [selectedSpacePostId, setSelectedSpacePostId] = useState<string | null>(
    null,
  )
  const [selectedAchievementKey, setSelectedAchievementKey] = useState(
    'first_claw_touch',
  )
  const [rightPanelTab, setRightPanelTab] =
    useState<RightPanelTab>('achievements')
  const [equippedAccessoryId, setEquippedAccessoryId] = useState<string | null>(
    () => {
      if (typeof window === 'undefined') {
        return null
      }

      return window.localStorage.getItem(equippedAccessoryStorageKey)
    },
  )
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const lobsterProfile = useLobsterStore((state) => state.lobsterProfile)
  const chatLines = useLobsterStore((state) => state.lobsterChatLines)
  const sending = useLobsterStore((state) => state.lobsterChatBusy)
  const diarySurpriseVisible = useLobsterStore(
    (state) => state.diarySurpriseVisible,
  )
  const diaryUnlocked = useLobsterStore((state) => state.diaryUnlocked)
  const diaryEntries = useLobsterStore((state) => state.diaryEntries)
  const spacePosts = useLobsterStore((state) => state.spacePosts)
  const appView = useLobsterStore((state) => state.appView)
  const activeAchievementMoment = useLobsterStore(
    (state) => state.achievementMomentQueue[0],
  )
  const markAchievementMomentSeen = useLobsterStore(
    (state) => state.markAchievementMomentSeen,
  )
  const completedCheckInIds = useLobsterStore(
    (state) => state.completedCheckInIds,
  )
  const sendLobsterChatMessage = useLobsterStore(
    (state) => state.sendLobsterChatMessage,
  )
  const saveGroupPermissions = useLobsterStore(
    (state) => state.saveGroupPermissions,
  )
  const setActiveConversation = useLobsterStore(
    (state) => state.setActiveConversation,
  )
  const openSummarySource = useLobsterStore((state) => state.openSummarySource)
  const requestReplyDraft = useLobsterStore((state) => state.requestReplyDraft)
  const requestGroupPermissions = useLobsterStore(
    (state) => state.requestGroupPermissions,
  )
  const openHiddenDiary = useLobsterStore((state) => state.openHiddenDiary)
  const generateHiddenDiaryImage = useLobsterStore(
    (state) => state.generateHiddenDiaryImage,
  )
  const openDiaryHistory = useLobsterStore((state) => state.openDiaryHistory)
  const openLobsterChat = useLobsterStore((state) => state.openLobsterChat)
  const openLobsterSpace = useLobsterStore((state) => state.openLobsterSpace)
  const generateSpacePost = useLobsterStore((state) => state.generateSpacePost)
  const generateWorkLog = useLobsterStore((state) => state.generateWorkLog)
  const likeSpacePost = useLobsterStore((state) => state.likeSpacePost)
  const commentOnSpacePost = useLobsterStore(
    (state) => state.commentOnSpacePost,
  )
  const shareSpacePost = useLobsterStore((state) => state.shareSpacePost)
  const replyToSpaceComment = useLobsterStore(
    (state) => state.replyToSpaceComment,
  )
  const completedCount = completedCheckInIds.length
  const lastReward = [...lobsterRewards]
    .reverse()
    .find((reward) => completedCount >= reward.requiredCheckIns)
  const unlockedRewards = lobsterRewards.filter(
    (reward) => completedCount >= reward.requiredCheckIns,
  )
  const equippedReward =
    unlockedRewards.find((reward) => reward.id === equippedAccessoryId) ??
    lastReward ??
    null
  const unlockedAchievementKeys = new Set(
    mockAchievements
      .filter((achievement) =>
        completedCheckInIds.includes(achievement.triggerCheckInId ?? ''),
      )
      .map((achievement) => achievement.key),
  )
  const visibleAchievements = mockAchievements.slice(0, 5)
  const unlockedAchievements = mockAchievements.filter((achievement) =>
    unlockedAchievementKeys.has(achievement.key),
  )
  const latestAchievement = [...unlockedAchievements].reverse()[0]
  const selectedAchievement =
    visibleAchievements.find(
      (achievement) => achievement.key === selectedAchievementKey,
    ) ?? visibleAchievements[0]
  const selectedAchievementUnlocked = selectedAchievement
    ? unlockedAchievementKeys.has(selectedAchievement.key)
    : false
  const equippedAccessory = equippedReward?.title ?? '还没佩戴挂饰'
  const moodLine = latestAchievement
    ? `刚刚点亮「${latestAchievement.title}」`
    : chatLines.length > 0
      ? '正在记住你说过的话'
      : '等你来碰一碰钳子'
  const rightPanelTabs: Array<{ id: RightPanelTab; label: string }> = [
    { id: 'achievements', label: '成就' },
    { id: 'accessories', label: '挂饰' },
    ...(diaryUnlocked ? [{ id: 'diary' as const, label: '日记' }] : []),
  ]
  const activeRightPanelTab =
    rightPanelTab === 'diary' && !diaryUnlocked ? 'achievements' : rightPanelTab
  const effectiveSelectedSpacePostId =
    selectedSpacePostId &&
    spacePosts.some((post) => post.id === selectedSpacePostId)
      ? selectedSpacePostId
      : spacePosts[0]?.id
  const selectedSpacePost =
    spacePosts.find((post) => post.id === effectiveSelectedSpacePostId) ??
    spacePosts[0]

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

  function equipAccessory(rewardId: string) {
    setEquippedAccessoryId(rewardId)

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(equippedAccessoryStorageKey, rewardId)
    }
  }

  function handleSuggestionClick(suggestion: LobsterSuggestion) {
    const payload = suggestion.payload ?? {}

    if (suggestion.action === 'send_message') {
      const content =
        typeof payload.content === 'string' ? payload.content : suggestion.label
      void sendLobsterChatMessage(content)
      return
    }

    if (suggestion.action === 'open_view') {
      if (payload.view === 'lobster_space') {
        void openLobsterSpace()
        return
      }

      if (payload.view === 'qq') {
        setActiveConversation(conversations[0]?.id ?? 'group-ai-camp')
        return
      }

      openLobsterChat()
      return
    }

    if (suggestion.action !== 'run_capability') {
      return
    }

    if (payload.capability === 'summarize_group') {
      void saveGroupPermissions(
        {
          summarizeGroup: true,
          collectMentions: true,
          draftReply: true,
          diaryMaterial: true,
          groupId: conversations[0]?.id ?? 'group-ai-camp',
        },
        [conversations[0]?.id ?? 'group-ai-camp'],
      )
      return
    }

    if (payload.capability === 'reply_draft') {
      void requestReplyDraft()
      return
    }

    if (payload.capability === 'work_log') {
      void generateWorkLog()
      return
    }

    if (payload.capability === 'space_post') {
      void generateSpacePost()
      return
    }

    if (payload.capability === 'space_comment') {
      void replyToSpaceComment(
        typeof payload.postId === 'string' ? payload.postId : undefined,
      )
      return
    }

    if (payload.capability === 'request_permissions') {
      requestGroupPermissions()
      return
    }

    if (payload.capability === 'diary_image') {
      void generateHiddenDiaryImage()
    }
  }

  function renderLineSuggestions(line: LobsterChatLine) {
    const suggestions = line.suggestions?.slice(0, 3) ?? []

    if (suggestions.length === 0) {
      return null
    }

    return (
      <div className="flex flex-wrap gap-2 pt-1">
        {suggestions.map((suggestion) => (
          <button
            className="inline-flex h-8 items-center rounded-lg bg-white px-3 text-xs font-semibold text-qq-700 ring-1 ring-qq-100 transition hover:bg-qq-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:ring-slate-100"
            disabled={sending}
            key={suggestion.id}
            type="button"
            onClick={() => handleSuggestionClick(suggestion)}
          >
            {suggestion.label}
          </button>
        ))}
      </div>
    )
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
          onRequestReplyDraft={(groupId, sourceMessageId) =>
            void requestReplyDraft(groupId, sourceMessageId)
          }
          onAskFollowUp={(group) =>
            void sendLobsterChatMessage(
              '这张群聊总结卡里最需要我马上处理什么？',
              createSummaryFollowUpContext(group),
            )
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

    if (line.card.type === 'work_log_card') {
      return (
        <WorkLogCard
          title={line.card.title}
          text={line.card.text}
          latestWorkLogs={line.card.latestWorkLogs}
          source={line.card.source}
        />
      )
    }

    if (line.card.type === 'diary_card') {
      return (
        <DiaryCard
          entry={line.card.entry}
          onGenerateImage={() => void generateHiddenDiaryImage()}
        />
      )
    }

    return (
      <SpacePostCard
        post={line.card.post}
        compact
        selected={line.card.post.id === effectiveSelectedSpacePostId}
        onOpenSpace={() => void openLobsterSpace()}
      />
    )
  }

  function renderSpaceMain() {
    return (
      <main className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-[#f8fbff]">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-5">
          <div className="flex items-center gap-3">
            <LobsterAvatar size="sm" mood="happy" />
            <div>
              <h1 className="text-base font-semibold text-ink-900">
                {lobsterProfile.name} 的龙虾空间
              </h1>
              <p className="mt-1 text-xs text-ink-500">
                动态只由小龙虾发布 · 你可以访问、点赞、评论和分享
              </p>
            </div>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-qq-700 ring-1 ring-qq-100 transition hover:bg-qq-50"
            type="button"
            onClick={openLobsterChat}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            私聊
          </button>
        </header>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <section className="overflow-hidden rounded-lg border border-qq-100 bg-white">
            <div className="bg-[#dff0ff] px-5 py-5">
              <div className="flex items-end justify-between gap-4">
                <div className="flex items-center gap-4">
                  <LobsterAvatar size="lg" mood="happy" />
                  <div>
                    <p className="text-lg font-semibold text-ink-900">
                      {lobsterProfile.name}
                    </p>
                    <p className="mt-1 text-sm text-ink-600">
                      QQ 里的小龙虾伙伴，正在慢慢营业。
                    </p>
                  </div>
                </div>
                <span className="rounded bg-white px-3 py-1.5 text-xs font-semibold text-qq-700">
                  龙虾空间
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 border-t border-qq-100 text-center text-xs text-ink-500">
              <div className="px-3 py-3">
                <span className="block text-sm font-semibold text-ink-900">
                  {spacePosts.length}
                </span>
                动态
              </div>
              <div className="border-x border-qq-100 px-3 py-3">
                <span className="block text-sm font-semibold text-ink-900">
                  {spacePosts.reduce((count, post) => count + post.likeCount, 0)}
                </span>
                点赞
              </div>
              <div className="px-3 py-3">
                <span className="block text-sm font-semibold text-ink-900">
                  {spacePosts.reduce((count, post) => count + post.commentCount, 0)}
                </span>
                评论
              </div>
            </div>
          </section>

          <div className="mt-5 space-y-4">
            {spacePosts.length > 0 ? (
              spacePosts.map((post) => (
                <SpacePostCard
                  key={post.id}
                  post={post}
                  selected={post.id === effectiveSelectedSpacePostId}
                  onSelect={setSelectedSpacePostId}
                  onLike={(postId) => void likeSpacePost(postId)}
                  onShare={(postId) => void shareSpacePost(postId)}
                  onReply={(postId, commentId) =>
                    void replyToSpaceComment(postId, commentId)
                  }
                />
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-qq-200 bg-white px-5 py-6 text-sm leading-6 text-ink-600">
                空间还没有动态。可以让小龙虾记录一件适合公开的小事。
              </div>
            )}
          </div>
        </div>

        <footer className="shrink-0 border-t border-slate-100 bg-white px-5 py-4">
          <div className="flex items-end gap-3">
            <textarea
              className="h-16 min-h-16 flex-1 resize-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-ink-500 focus:border-qq-500 focus:bg-white focus:ring-4 focus:ring-qq-100"
              placeholder={
                selectedSpacePost
                  ? `评论已选择动态：${selectedSpacePost.content.slice(0, 18)}`
                  : '空间暂无动态'
              }
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={!selectedSpacePost}
            />
            <button
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-qq-500 px-4 text-sm font-semibold text-white transition hover:bg-qq-600 disabled:cursor-not-allowed disabled:bg-slate-300"
              type="button"
              disabled={!selectedSpacePost || !draft.trim()}
              onClick={() => {
                if (!selectedSpacePost) {
                  return
                }
                const content = draft.trim()
                setDraft('')
                void commentOnSpacePost(selectedSpacePost.id, content)
              }}
            >
              <Send className="h-4 w-4" />
              评论
            </button>
          </div>
        </footer>
      </main>
    )
  }

  return (
    <>
      {diarySurpriseVisible ? (
        <HiddenDiarySurprise
          lobsterName={lobsterProfile.name}
          onOpen={() => void openHiddenDiary()}
        />
      ) : null}
      {activeAchievementMoment ? (
        <AchievementMomentOverlay
          moment={activeAchievementMoment}
          onDone={markAchievementMomentSeen}
        />
      ) : null}
    <div className="flex h-screen min-h-[680px] bg-[#edf3fb] p-4 text-ink-900">
      <div className="mx-auto grid h-full min-h-0 w-full max-w-[1440px] grid-cols-[74px_minmax(220px,280px)_minmax(520px,1fr)_340px] overflow-hidden rounded-lg border border-white/80 bg-white shadow-panel">
        <aside className="flex flex-col items-center justify-between bg-[#e8f2ff] px-3 py-4">
          <div className="space-y-4">
            <Avatar label={currentUser.avatar} active />
            <nav className="flex flex-col items-center gap-2">
              <button
                className={[
                  'grid h-11 w-11 place-items-center rounded-lg transition',
                  appView === 'lobster_space'
                    ? 'text-ink-500 hover:bg-white hover:text-qq-600'
                    : 'bg-white text-qq-600 shadow-sm',
                ].join(' ')}
                type="button"
                aria-label="消息"
                onClick={openLobsterChat}
              >
                <MessageSquare className="h-5 w-5" />
              </button>
              <button
                className={[
                  'grid h-11 w-11 place-items-center rounded-lg transition',
                  appView === 'lobster_space'
                    ? 'bg-white text-qq-600 shadow-sm'
                    : 'text-ink-500 hover:bg-white hover:text-qq-600',
                ].join(' ')}
                type="button"
                aria-label="龙虾空间"
                title="龙虾空间"
                onClick={() => void openLobsterSpace()}
              >
                <Share2 className="h-5 w-5" />
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
              onClick={openLobsterChat}
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

        {appView === 'lobster_space' ? renderSpaceMain() : (
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
                {latestAchievement
                  ? `刚点亮「${latestAchievement.title}」。`
                  : '成就墙还在等第一束光。'}
                已点亮的徽章会留在右侧墙面里。
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
                    {renderLineSuggestions(line)}
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
        )}

        <aside className="min-h-0 overflow-hidden border-l border-slate-100 bg-white">
          <div className="scrollbar-thin h-full overflow-y-auto px-5 py-5">
            <section className="rounded-lg border border-qq-100 bg-qq-50 px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <LobsterAvatar size="md" mood={lobsterProfile.mood} animated />
                  <AccessoryOnAvatar rewardId={equippedReward?.id} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {lobsterProfile.name} 正在成长
                    </p>
                    <span className="shrink-0 rounded bg-white px-2 py-0.5 text-xs text-qq-700">
                      Lv.{lobsterProfile.level}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-ink-500">
                    {moodLine}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-3">
                <div className="min-w-0">
                  <p className="text-xs text-ink-500">当前佩戴</p>
                  <p className="mt-1 truncate text-sm font-semibold text-ink-900">
                    {equippedAccessory}
                  </p>
                </div>
                {equippedReward ? (
                  <AccessoryPreview
                    rewardId={equippedReward.id}
                    selected
                    unlocked
                  />
                ) : null}
              </div>
            </section>

            <section className="mt-5 rounded-lg border border-slate-200 bg-white px-4 py-4">
              <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                {rightPanelTabs.map((tab) => (
                  <button
                    className={[
                      'flex-1 rounded-md px-3 py-2 text-xs font-semibold transition',
                      activeRightPanelTab === tab.id
                        ? 'bg-white text-qq-700 shadow-sm'
                        : 'text-ink-500 hover:bg-white/70 hover:text-ink-700',
                    ].join(' ')}
                    key={tab.id}
                    type="button"
                    onClick={() => setRightPanelTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeRightPanelTab === 'achievements' ? (
                <div className="mt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-qq-600" />
                      <p className="text-sm font-semibold text-ink-900">
                        成就墙
                      </p>
                    </div>
                    <span className="rounded bg-qq-50 px-2 py-1 text-xs text-qq-700">
                      {unlockedAchievements.length}/{mockAchievements.length}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-5 gap-2 rounded-lg bg-slate-50 p-2">
                    {visibleAchievements.map((achievement) => {
                      const unlocked = unlockedAchievementKeys.has(achievement.key)
                      const label =
                        achievement.hidden && !unlocked ? '???' : achievement.title
                      const tooltip = unlocked
                        ? achievement.description
                        : achievement.hint
                      return (
                        <button
                          className={[
                            'group relative flex aspect-square min-w-0 flex-col items-center justify-center rounded-lg border px-1 text-center transition hover:z-30 focus-visible:z-30',
                            unlocked
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm hover:bg-emerald-100'
                              : 'border-slate-200 bg-white text-ink-400 opacity-60 grayscale hover:opacity-80',
                            selectedAchievement?.key === achievement.key
                              ? 'ring-2 ring-qq-200'
                              : '',
                          ].join(' ')}
                          key={achievement.key}
                          type="button"
                          aria-label={`${label}，${tooltip}`}
                          onClick={() => setSelectedAchievementKey(achievement.key)}
                        >
                          <Sparkles
                            className={[
                              'h-4 w-4',
                              unlocked ? 'text-emerald-500' : 'text-slate-300',
                            ].join(' ')}
                          />
                          <span className="mt-1 line-clamp-2 text-[10px] font-semibold leading-3">
                            {label}
                          </span>
                          <span
                            className="pointer-events-none absolute left-1/2 top-full z-40 mt-1 w-40 -translate-x-1/2 rounded-md border border-slate-200 bg-ink-900 px-2.5 py-1.5 text-left text-xs leading-5 text-white opacity-0 shadow-lg transition-opacity duration-75 group-hover:opacity-100 group-focus-visible:opacity-100"
                            role="tooltip"
                          >
                            {tooltip}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {selectedAchievement ? (
                    <div className="mt-3 rounded-lg bg-slate-50 px-3 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink-900">
                            {selectedAchievement.hidden &&
                            !selectedAchievementUnlocked
                              ? '???'
                              : selectedAchievement.title}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-ink-500">
                            {selectedAchievementUnlocked
                              ? selectedAchievement.description
                              : selectedAchievement.hidden
                                ? '还藏在小龙虾的成长轨迹里。'
                                : selectedAchievement.hint}
                          </p>
                        </div>
                        <span
                          className={[
                            'shrink-0 rounded px-2 py-1 text-xs font-semibold',
                            selectedAchievementUnlocked
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-white text-ink-400',
                          ].join(' ')}
                        >
                          {selectedAchievementUnlocked ? '已点亮' : '未点亮'}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-ink-500">
                        奖励：{selectedAchievement.reward}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {activeRightPanelTab === 'accessories' ? (
                <div className="mt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-qq-600" />
                      <p className="text-sm font-semibold text-ink-900">
                        挂饰
                      </p>
                    </div>
                    <span className="rounded bg-qq-50 px-2 py-1 text-xs text-qq-700">
                      {unlockedRewards.length}/{lobsterRewards.length}
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {lobsterRewards.map((reward) => {
                      const unlocked = completedCount >= reward.requiredCheckIns
                      const equipped = equippedReward?.id === reward.id
                      return (
                        <button
                          className={[
                            'group relative w-full rounded-lg border px-3 py-3 text-left transition hover:z-30 focus-visible:z-30',
                            unlocked && equipped
                              ? 'border-qq-300 bg-qq-50 text-ink-900 ring-2 ring-qq-100'
                              : '',
                            unlocked && !equipped
                              ? 'border-slate-200 bg-white text-ink-900 hover:border-qq-200 hover:bg-qq-50'
                              : '',
                            unlocked
                              ? 'cursor-pointer'
                              : 'cursor-not-allowed border-slate-200 bg-slate-50 text-ink-400 opacity-70 grayscale',
                          ].join(' ')}
                          key={reward.id}
                          type="button"
                          disabled={!unlocked}
                          aria-label={`${reward.title}，${reward.description}`}
                          onClick={() => equipAccessory(reward.id)}
                        >
                          <div className="flex items-start gap-3">
                            <AccessoryPreview
                              rewardId={reward.id}
                              selected={equipped}
                              unlocked={unlocked}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">
                                {reward.title}
                              </p>
                            </div>
                            <span
                              className={[
                                'shrink-0 rounded px-2 py-1 text-xs font-semibold',
                                unlocked && equipped
                                  ? 'bg-qq-100 text-qq-700'
                                  : unlocked
                                  ? 'bg-white text-qq-700'
                                  : 'bg-white text-ink-400',
                              ].join(' ')}
                            >
                              {equipped ? '已佩戴' : unlocked ? '使用' : '未获得'}
                            </span>
                          </div>
                          <span
                            className="pointer-events-none absolute left-3 right-3 top-full z-20 mt-1 rounded-md border border-slate-200 bg-ink-900 px-2.5 py-1.5 text-xs leading-5 text-white opacity-0 shadow-lg transition-opacity duration-75 group-hover:opacity-100 group-focus-visible:opacity-100"
                            role="tooltip"
                          >
                            {reward.description}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              {activeRightPanelTab === 'diary' && diaryUnlocked ? (
                <div className="mt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-lobster-600" />
                      <p className="text-sm font-semibold text-ink-900">
                        日记
                      </p>
                    </div>
                    <span className="rounded bg-lobster-50 px-2 py-1 text-xs text-lobster-700">
                      {diaryEntries.length} 篇
                    </span>
                  </div>
                  {diaryEntries.length > 0 ? (
                    <div className="mt-3 rounded-lg bg-[#fff7e8] px-3 py-3">
                      <p className="line-clamp-2 text-xs leading-5 text-ink-600">
                        {diaryEntries[0].quote}
                      </p>
                      <button
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-lobster-700 ring-1 ring-lobster-100 transition hover:bg-lobster-50"
                        type="button"
                        onClick={openDiaryHistory}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        查看历史日记
                      </button>
                    </div>
                  ) : (
                    <p className="mt-3 rounded-lg bg-slate-50 px-3 py-3 text-xs leading-5 text-ink-500">
                      日记已经解锁，等小龙虾写下第一篇。
                    </p>
                  )}
                </div>
              ) : null}
            </section>
          </div>
        </aside>
      </div>
    </div>
    </>
  )
}
