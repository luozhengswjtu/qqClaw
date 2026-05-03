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
  Target,
  Trophy,
  Users,
  Image as ImageIcon,
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
  LobsterChatContext,
  LobsterDiaryEntry,
  LobsterSpacePost,
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
  const spaceUnlocked = useLobsterStore((state) => state.spaceUnlocked)
  const appView = useLobsterStore((state) => state.appView)
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
  const requestReplyDraft = useLobsterStore((state) => state.requestReplyDraft)
  const generateWorkLog = useLobsterStore((state) => state.generateWorkLog)
  const openHiddenDiary = useLobsterStore((state) => state.openHiddenDiary)
  const generateHiddenDiaryImage = useLobsterStore(
    (state) => state.generateHiddenDiaryImage,
  )
  const openDiaryHistory = useLobsterStore((state) => state.openDiaryHistory)
  const openLobsterChat = useLobsterStore((state) => state.openLobsterChat)
  const openLobsterSpace = useLobsterStore((state) => state.openLobsterSpace)
  const generateSpacePost = useLobsterStore((state) => state.generateSpacePost)
  const likeSpacePost = useLobsterStore((state) => state.likeSpacePost)
  const commentOnSpacePost = useLobsterStore(
    (state) => state.commentOnSpacePost,
  )
  const shareSpacePost = useLobsterStore((state) => state.shareSpacePost)
  const replyToSpaceComment = useLobsterStore(
    (state) => state.replyToSpaceComment,
  )
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
    first_group_permission: '处理群聊提醒',
    first_view_work_log: '查看工作记录',
    first_space_post: '进入龙虾空间',
    first_space_comment: '回复空间评论',
  }
  const personalityLabel =
    personalityOptions.find((item) => item.id === lobsterProfile.personality)
      ?.label ?? '社恐观察'
  const interestLabels = lobsterProfile.interests
    .map((interest) => interestOptions.find((item) => item.id === interest)?.label)
    .filter((label): label is string => Boolean(label))
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

  function completeCurrentGuide() {
    if (!activeCheckIn || activeCheckIn.id === 'first_lobster_chat') {
      return
    }

    if (activeCheckIn.id === 'first_group_permission') {
      requestGroupPermissions()
      return
    }

    if (activeCheckIn.id === 'first_view_work_log') {
      void generateWorkLog()
      return
    }

    if (activeCheckIn.id === 'first_space_post') {
      void openLobsterSpace()
      return
    }

    if (activeCheckIn.id === 'first_space_comment') {
      void replyToSpaceComment()
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
                空间还没有动态。先从右侧打卡生成一条小龙虾自己的空间动态。
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
        )}

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

            {diaryUnlocked && diaryEntries.length > 0 ? (
              <section className="mt-5 rounded-lg border border-lobster-100 bg-[#fff7e8] px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-lobster-600" />
                    <p className="text-sm font-semibold text-ink-900">日记入口</p>
                  </div>
                  <span className="rounded bg-white px-2 py-1 text-xs text-lobster-700">
                    {diaryEntries.length} 篇
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink-600">
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
              </section>
            ) : null}

            {diaryUnlocked || spaceUnlocked ? (
              <section className="mt-5 rounded-lg border border-qq-100 bg-white px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-qq-600" />
                    <p className="text-sm font-semibold text-ink-900">
                      龙虾空间
                    </p>
                  </div>
                  <span className="rounded bg-qq-50 px-2 py-1 text-xs text-qq-700">
                    {spacePosts.length} 条
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-ink-500">
                  空间动态由小龙虾自己发布。你可以访问、点赞、评论和分享。
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-qq-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-qq-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                    type="button"
                    disabled={sending}
                    onClick={() =>
                      spacePosts.length > 0
                        ? void openLobsterSpace()
                        : void generateSpacePost()
                    }
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {spacePosts.length > 0 ? '进入空间' : '存入空间'}
                  </button>
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-ink-600 transition hover:bg-qq-50 hover:text-qq-700 disabled:cursor-not-allowed disabled:text-slate-300"
                    type="button"
                    disabled={!selectedSpacePost || sending}
                    onClick={() => void replyToSpaceComment(selectedSpacePost?.id)}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    回复评论
                  </button>
                </div>
              </section>
            ) : null}

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
    </>
  )
}
