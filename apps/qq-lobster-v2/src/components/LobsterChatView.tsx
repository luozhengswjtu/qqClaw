import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  Check,
  ExternalLink,
  FileText,
  Heart,
  Headphones,
  MessageSquare,
  MoreHorizontal,
  Music,
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
  Interest,
  InterestNarrativeCard as InterestNarrativeCardData,
  InterestSource,
  InterestProfile,
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

const headsetLobsterImage = new URL(
  '../assets/lobster/xingxiang-erji.png',
  import.meta.url,
).href
const flagLobsterImage = new URL(
  '../assets/lobster/xingxiang-xiaohongqi.png',
  import.meta.url,
).href
const musicLobsterImage = new URL(
  '../assets/lobster/xingxiang-yinfu.png',
  import.meta.url,
).href

const accessoryAvatarImages: Record<string, { alt: string; src: string }> = {
  'tiny-flag': {
    alt: '戴小红旗的小龙虾',
    src: flagLobsterImage,
  },
  'music-note': {
    alt: '戴小音符的小龙虾',
    src: musicLobsterImage,
  },
  'shell-badge': {
    alt: '戴耳机的小龙虾',
    src: headsetLobsterImage,
  },
}

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

const capabilityDrafts: Record<string, string> = {
  reply_draft: '小钳，帮我写一条回复草稿',
  work_log: '小钳，今天你都做了什么',
  space_post: '小钳，帮你发一条龙虾空间动态吧',
  space_comment: '小钳，我们去龙虾空间看看评论',
  interest_memory: '小钳，看看你记住了我的什么兴趣',
  interest_music_reminder: '小钳，给我讲讲最近的音乐动态',
  interest_space_preview: '小钳，把音乐动态生成一条空间动态',
  interest_community: '小钳，帮我看看有没有公开资料里的同好群',
}

const musicTopicDrafts = [
  '小钳，你已经拿到 QQ 音乐授权了，先从我最近循环最多的几首歌聊起吧',
  '小钳，看看我最近常听的歌和收藏歌单，帮我挑一个今天适合继续聊的音乐话题',
  '小钳，根据我最近听歌的变化，和我聊聊现在最像我心情的一首歌',
  '小钳，结合我喜欢的歌手和最近播放记录，给我找一个可以继续深聊的音乐切入点',
  '小钳，按我最近在 QQ 音乐里的偏好，聊聊我可能会喜欢的相似歌手或新歌',
]

type RightPanelTab = 'achievements' | 'accessories' | 'interests' | 'diary'

const equippedAccessoryStorageKey = 'qqclaw.equippedAccessoryId.v1'
const interestAccessoryIds = new Set(['music-note'])

const maxPermissionGroupCount = 3
const defaultSummaryScheduleTime = '21:30'
const achievementExperienceDrafts: Record<string, string> = {
  first_claw_touch: '小钳，你好呀，介绍你自己',
  first_group_signal: '小钳，帮我设置一个群聊总结提醒',
  first_space_post: '小钳，帮你发一条龙虾空间动态吧',
  first_space_reply: '小钳，我们去龙虾空间看看评论',
  community_saved: '小钳，帮我看看有没有公开资料里的同好群，我想先收藏一下',
  first_diary_view: '小钳，打开第一条日记',
  first_skill_install: '小钳，帮我安装音乐小技能',
  first_interest_feed_view: '小钳，给我讲讲最近的音乐动态',
  interest_topic_streak_3: '我最近在听林俊杰、周杰伦和日摇',
}

function isLegacyInterestSpacePublishSuggestion(suggestion: LobsterSuggestion) {
  return suggestion.payload?.capability === 'publish_interest_space_post'
}

const oldIntroSelfIntroductionPattern =
  /我是你的小龙虾(.+?)，住在 QQ 里。\s*我可以陪你聊天，也可以在你授权后帮你留意群聊重点、写回复草稿、整理我做过的事。\s*等你慢慢探索成就墙，我还能写日记、发我的龙虾空间动态，解锁挂饰和成就。\s*我也可以处理一些文档和代码，像整理内容、改写说明、帮你看一段代码，都可以试试。\s*另外，我也对音乐有点兴趣。\s*如果你愿意授权 QQ 音乐，我们可以一起关注喜欢的歌手、新歌和演出动态。/

function formatIntroSelfIntroduction(content: string) {
  const match = content.match(oldIntroSelfIntroductionPattern)
  if (!match) {
    return content
  }

  const lobsterName = match[1]
  return [
    `我是你的小龙虾${lobsterName}，住在 QQ 里。`,
    '我会先陪你聊天，慢慢记住你的习惯和偏好。',
    '',
    '我能帮你的事，大概分几类：',
    '陪你聊天：记住你喜欢的东西，接住一些日常想法。',
    '群聊授权后：整理重点、写回复草稿，真正发出去前都由你决定。',
    '慢慢解锁：写日记、发龙虾空间动态，也会在成就墙留下成长记录。',
    '文档和代码：整理内容、改写说明、帮你看一段代码。',
    '',
    '另外，我也对音乐有点兴趣。',
    '如果你愿意授权 QQ 音乐，我们可以一起关注喜欢的歌手、新歌和演出动态。',
  ].join('\n')
}

function isRewardUnlocked(
  reward: (typeof lobsterRewards)[number],
  completedCheckInIds: string[],
) {
  if (reward.requiredCheckInId) {
    return completedCheckInIds.includes(reward.requiredCheckInId)
  }

  return completedCheckInIds.length >= reward.requiredCheckIns
}

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
        <span className="grid h-8 w-8 place-items-center rounded-full border border-indigo-200 bg-indigo-50 shadow-inner">
          <Headphones className="h-5 w-5 text-indigo-600" />
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

  if (rewardId === 'music-note') {
    return (
      <span className={frameClass} aria-hidden="true">
        <span className="grid h-8 w-8 place-items-center rounded-full border border-fuchsia-200 bg-fuchsia-50">
          <Music className="h-5 w-5 text-fuchsia-600" />
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
        className="absolute right-8 top-3 flex h-9 w-7 origin-bottom-left -rotate-6 items-start justify-center"
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
        className="absolute right-8 top-2 grid h-6 w-6 place-items-center rounded-full border border-indigo-200 bg-white shadow-sm"
        aria-label="耳机挂饰"
        title="耳机挂饰"
      >
        <Headphones className="h-3.5 w-3.5 text-indigo-600" />
      </span>
    )
  }

  if (rewardId === 'space-banner') {
    return (
      <span
        className="absolute right-8 top-3 h-6 w-8 overflow-hidden rounded border border-sky-200 bg-sky-100 shadow-sm"
        aria-label="龙虾空间头图"
        title="龙虾空间头图"
      >
        <span className="absolute inset-x-0 top-0 h-2 bg-qq-400" />
        <span className="absolute bottom-1 left-1 right-1 h-1.5 rounded bg-white/85" />
      </span>
    )
  }

  if (rewardId === 'music-note') {
    return (
      <span
        className="absolute right-8 top-2 grid h-6 w-6 place-items-center rounded-full border border-fuchsia-200 bg-white shadow-sm"
        aria-label="小音符挂饰"
        title="小音符挂饰"
      >
        <Music className="h-3.5 w-3.5 text-fuchsia-600" />
      </span>
    )
  }

  return (
    <span
      className="absolute right-8 top-3 grid h-5 w-5 place-items-center rounded-full border border-amber-200 bg-white shadow-sm"
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
  const initialGroupIds = (
    selectedGroupIds.length > 0 ? selectedGroupIds : [initialPermissions.groupId]
  ).slice(0, maxPermissionGroupCount)
  const [groupIds, setGroupIds] = useState(initialGroupIds)
  const summaryScheduleTime =
    permissions.summaryScheduleTime ?? defaultSummaryScheduleTime
  const selectedGroupTitle =
    groupIds.length > 0
      ? `${groupIds.length} 个群已选择 · 每天 ${summaryScheduleTime} 总结`
      : groupTitle

  function patchPermissions(patch: Partial<GroupPermissionScope>) {
    setPermissions((current) => ({
      ...current,
      ...patch,
    }))
  }

  function toggleGroup(groupId: string, checked: boolean) {
    setGroupIds((current) => {
      if (
        checked &&
        !current.includes(groupId) &&
        current.length >= maxPermissionGroupCount
      ) {
        return current
      }

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
        summaryScheduleTime,
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
        <span className="ml-2 text-ink-400">最多选择 3 个群</span>
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
                disabled={
                  confirmed ||
                  (!groupIds.includes(group.id) &&
                    groupIds.length >= maxPermissionGroupCount)
                }
                onChange={(event) => toggleGroup(group.id, event.target.checked)}
              />
            </label>
          ))}
        </div>
      </div>

      <label className="mt-3 block rounded-lg bg-white px-3 py-2 text-xs font-medium text-ink-500">
        每天总结时间
        <input
          className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-ink-800 outline-none transition focus:border-qq-500 focus:bg-white focus:ring-4 focus:ring-qq-100"
          type="time"
          value={summaryScheduleTime}
          disabled={confirmed}
          onChange={(event) =>
            patchPermissions({
              summaryScheduleTime:
                event.target.value || defaultSummaryScheduleTime,
            })
          }
        />
      </label>

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
          授权已确认，将在每天 {summaryScheduleTime} 总结，正在生成本次演示卡
        </div>
      ) : (
        <button
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-qq-500 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-qq-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          type="button"
          disabled={disabled || groupIds.length === 0 || !summaryScheduleTime}
          onClick={() =>
            onSave({ ...permissions, summaryScheduleTime }, groupIds)
          }
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
        相关 @ 会跟随对应群的总结一起展示；当前 Demo 会在确认后先生成一次总结。
      </p>
    </div>
  )
}

function interestLabel(interest: Interest) {
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

function interestPersonaLabel(interest: Interest) {
  const labels: Partial<Record<Interest, string>> = {
    music: '音乐爱好者',
    badminton: '羽毛球搭子雷达',
    custom: '自定义兴趣观察员',
  }

  return labels[interest] ?? `${interestLabel(interest)}观察员`
}

function interestSourceTypeLabel(
  type?: InterestSource['type'] | InterestNarrativeCardData['sourceType'],
) {
  if (type === 'qq_music') {
    return '模拟 QQ 音乐授权数据'
  }

  if (type === 'public_group_profile') {
    return '公开群资料'
  }

  if (type === 'chat') {
    return '用户聊天补充'
  }

  if (type === 'authorized_qq_group') {
    return '已授权 QQ 群'
  }

  if (type === 'adoption') {
    return '认养时主动选择'
  }

  if (type === 'user_setting' || type === 'user_feedback') {
    return '用户手动设置'
  }

  return '可解释来源'
}

function interestSourceDisplayLabel(source: InterestSource) {
  if (source.type === 'qq_music' || source.title.includes('QQ 音乐')) {
    return '模拟 QQ 音乐授权数据'
  }

  if (source.type === 'public_group_profile' || source.title.includes('公开')) {
    return '公开群资料'
  }

  if (source.type === 'chat') {
    return '用户聊天补充'
  }

  if (source.type === 'authorized_qq_group') {
    return '已授权 QQ 群'
  }

  return source.title
}

const musicAuthorizationLoadingSteps = [
  '小钳正在确认授权范围...',
  '小钳正在整理你常听的歌手...',
  '小钳正在把音乐偏好夹进记忆里...',
]

function MusicAuthorizationCard({
  status,
  disabled,
  onAuthorize,
  onDecline,
}: {
  status: 'pending' | 'loading' | 'authorized' | 'declined'
  disabled: boolean
  onAuthorize: () => void
  onDecline: () => void
}) {
  return (
    <div className="mt-3 rounded-lg border border-qq-100 bg-qq-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink-900">模拟 QQ 音乐授权</p>
          <p className="mt-1 text-xs leading-5 text-ink-500">
            Demo 使用模拟授权数据，不接入真实 QQ 音乐。
          </p>
        </div>
        <span className="rounded bg-white px-2 py-1 text-xs text-qq-700">
          {status === 'authorized'
            ? '已授权'
            : status === 'loading'
              ? '授权中'
              : status === 'declined'
                ? '未授权'
                : '需确认'}
        </span>
      </div>
      <div className="mt-3 grid gap-2 text-xs leading-5 text-ink-600">
        <p>将读取：关注歌手、最近常听、收藏歌单、城市演出提醒偏好。</p>
        <p>不会读取：私密评论、聊天记录、支付信息。</p>
        <p>用途：音乐提醒、兴趣日记素材、龙虾空间动态草稿、兴趣成就。</p>
      </div>
      {status === 'loading' ? (
        <div className="mt-4 rounded-lg border border-qq-100 bg-white/80 px-3 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-qq-700">
            <Sparkles className="h-4 w-4 animate-pulse" />
            小钳正在处理授权
          </div>
          <div className="mt-3 grid gap-2">
            {musicAuthorizationLoadingSteps.map((step) => (
              <div className="flex items-center gap-2 text-xs leading-5 text-ink-600" key={step}>
                <span className="h-1.5 w-1.5 rounded-full bg-qq-500 animate-pulse" />
                {step}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {status === 'pending' ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-qq-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-qq-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            type="button"
            disabled={disabled}
            onClick={onAuthorize}
          >
            <Check className="h-3.5 w-3.5" />
            授权模拟 QQ 音乐
          </button>
          <button
            className="inline-flex items-center rounded-lg bg-white px-3 py-2 text-xs font-semibold text-ink-500 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed"
            type="button"
            disabled={disabled}
            onClick={onDecline}
          >
            暂时不用
          </button>
        </div>
      ) : null}
    </div>
  )
}

function MusicSkillSuggestionCard({
  title,
  summary,
  skills,
  status = 'idle',
  steps = [],
  successMessage,
  disabled,
  onInstall,
  onTalkMusic,
  onSummarizeGroup,
}: {
  title: string
  summary: string
  skills: string[]
  status?: 'idle' | 'installing' | 'installed'
  steps?: string[]
  successMessage?: string
  disabled: boolean
  onInstall: () => void
  onTalkMusic: () => void
  onSummarizeGroup: () => void
}) {
  return (
    <div className="mt-3 rounded-lg border border-fuchsia-100 bg-fuchsia-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink-900">{title}</p>
          <p className="mt-1 text-xs leading-5 text-fuchsia-700">{summary}</p>
        </div>
        <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-fuchsia-700">
          OpenClaw skill
        </span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {skills.map((skill) => (
          <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-ink-700" key={skill}>
            <Music className="h-3.5 w-3.5 text-fuchsia-600" />
            {skill}
          </div>
        ))}
      </div>

      {status === 'installing' ? (
        <div className="mt-4 rounded-lg border border-fuchsia-100 bg-white/80 px-3 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-fuchsia-700">
            <Sparkles className="h-4 w-4 animate-pulse" />
            正在安装音乐技能
          </div>
          <div className="mt-3 grid gap-2">
            {steps.map((step) => (
              <div className="flex items-center gap-2 text-xs leading-5 text-ink-600" key={step}>
                <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-500 animate-pulse" />
                {step}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {status === 'installed' ? (
        <div className="mt-4 rounded-lg bg-white px-3 py-3">
          <div className="border-t border-fuchsia-100 pt-3">
            <p className="text-xs font-semibold text-ink-700">
              接下来可以这样用
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-lg bg-fuchsia-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                type="button"
                disabled={disabled}
                onClick={onTalkMusic}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                继续聊音乐话题
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-fuchsia-700 ring-1 ring-fuchsia-100 transition hover:bg-fuchsia-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:ring-slate-100"
                type="button"
                disabled={disabled}
                onClick={onSummarizeGroup}
              >
                <FileText className="h-3.5 w-3.5" />
                群聊总结
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {status === 'installed' && successMessage ? (
        <div className="sr-only">
          <p className="whitespace-pre-line text-xs leading-5 text-ink-700">
            {successMessage}
          </p>
        </div>
      ) : null}

      {status === 'idle' ? (
        <button
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-fuchsia-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          type="button"
          disabled={disabled}
          onClick={onInstall}
        >
          <Check className="h-3.5 w-3.5" />
          安装音乐技能
        </button>
      ) : null}
    </div>
  )
}

function InterestMemoryCard({
  profile,
  receipt,
  disabled,
  onEdit,
  onDelete,
}: {
  profile: InterestProfile
  receipt?: string
  disabled: boolean
  onEdit: (interest: Interest) => void
  onDelete: (interest: Interest) => void
}) {
  const source = profile.sources[profile.sources.length - 1] ?? profile.sources[0]

  return (
    <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink-900">
            兴趣记忆 · {interestLabel(profile.interest)}
          </p>
          <p className="mt-1 text-xs leading-5 text-emerald-700">
            {receipt ?? '这条画像可以查看、修改或删除。'}
          </p>
        </div>
        <span className="rounded bg-white px-2 py-1 text-xs text-emerald-700">
          已记录
        </span>
      </div>
      <div className="mt-3 space-y-2 text-xs leading-5 text-ink-700">
        <p>关注对象：{profile.topics.join('、') || '暂未记录'}</p>
        {profile.city ? <p>城市：{profile.city}</p> : null}
        <p>来源：{source?.title ?? '未知来源'}</p>
        {source?.evidenceText ? <p>为什么知道：{source.evidenceText}</p> : null}
        <p>最近更新：{new Date(profile.updatedAt).toLocaleString()}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-qq-700 ring-1 ring-qq-100 transition hover:bg-qq-50 disabled:cursor-not-allowed"
          type="button"
          disabled={disabled}
          onClick={() => onEdit(profile.interest)}
        >
          修改
        </button>
        <button
          className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-600 ring-1 ring-red-100 transition hover:bg-red-50 disabled:cursor-not-allowed"
          type="button"
          disabled={disabled}
          onClick={() => onDelete(profile.interest)}
        >
          删除
        </button>
      </div>
    </div>
  )
}

function InterestRiskConfirmationCard({
  title,
  reason,
  evidenceText,
}: {
  title: string
  reason: string
  evidenceText: string
}) {
  return (
    <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-ink-900">{title}</p>
      <p className="mt-2 text-xs leading-5 text-amber-800">{reason}</p>
      <p className="mt-2 rounded-lg bg-white px-3 py-2 text-xs leading-5 text-ink-600">
        {evidenceText}
      </p>
      <p className="mt-2 text-xs leading-5 text-ink-500">
        高影响信息、外部授权和对外发布不会自动保存或执行。
      </p>
    </div>
  )
}

function InterestNarrativeCard({
  card,
  onFavoriteCommunity,
  onGenerateSpacePost,
}: {
  card: InterestNarrativeCardData
  onFavoriteCommunity?: () => void
  onGenerateSpacePost?: () => void | Promise<void>
}) {
  const [sourceVisible, setSourceVisible] = useState(false)
  const [favoriteSaved, setFavoriteSaved] = useState(false)
  const [applyNoticeVisible, setApplyNoticeVisible] = useState(false)

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-qq-100 bg-white shadow-sm">
      <div className="bg-[#eef7ff] px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink-900">{card.title}</p>
            <p className="mt-1 text-xs leading-5 text-ink-500">
              {interestLabel(card.interest)} · {card.sourceLabel}
            </p>
          </div>
          <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-qq-700">
            {interestSourceTypeLabel(card.sourceType)}
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-ink-800">{card.summary}</p>
      </div>

      <div className="px-4 py-4">
        <div className="grid gap-2 text-xs leading-5 text-ink-700">
          <p>来源类型：{interestSourceTypeLabel(card.sourceType)}</p>
          <p>来源说明：{card.sourceLabel}</p>
          <p>原因：{card.reason}</p>
          <p>边界：{card.riskNote}</p>
        </div>

        {card.community ? (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink-900">
                  {card.community.title}
                </p>
                <p className="mt-1 text-xs text-ink-500">
                  {card.community.city} · {card.community.sourceLabel}
                </p>
              </div>
              <span className="shrink-0 rounded bg-white px-2 py-1 text-xs text-ink-500">
                公开资料
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-ink-700">
              {card.community.publicIntro}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {card.community.tags.map((tag) => (
                <span
                  className="rounded bg-white px-2 py-1 text-xs text-qq-700"
                  key={tag}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {sourceVisible ? (
          <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-ink-600">
            {card.sourceDetail ?? card.reason}
          </div>
        ) : null}

        {applyNoticeVisible ? (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
            我不会替你提交入群申请。这里先把公开资料放出来，是否进一步查看或申请由你自己决定。
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {card.actions.map((action) => {
            if (action.id === 'view_source') {
              return (
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg bg-qq-50 px-3 py-1.5 text-xs font-semibold text-qq-700 transition hover:bg-qq-100"
                  key={action.id}
                  type="button"
                  onClick={() => setSourceVisible((visible) => !visible)}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {action.label}
                </button>
              )
            }

            if (action.id === 'generate_space_post') {
              return (
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg bg-lobster-50 px-3 py-1.5 text-xs font-semibold text-lobster-700 transition hover:bg-lobster-100"
                  key={action.id}
                  type="button"
                  onClick={() => void onGenerateSpacePost?.()}
                >
                  <Share2 className="h-3.5 w-3.5" />
                  {action.label}
                </button>
              )
            }

            if (action.id === 'favorite') {
              return (
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-ink-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
                  key={action.id}
                  type="button"
                  onClick={() => {
                    if (!favoriteSaved) {
                      onFavoriteCommunity?.()
                    }
                    setFavoriteSaved(true)
                  }}
                >
                  <Heart className="h-3.5 w-3.5" />
                  {favoriteSaved ? '已收藏' : action.label}
                </button>
              )
            }

            return (
              <button
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-ink-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
                key={action.id}
                type="button"
                onClick={() => setApplyNoticeVisible(true)}
              >
                <Users className="h-3.5 w-3.5" />
                {action.label}
              </button>
            )
          })}
        </div>
      </div>
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
  const imageUrl = entry.image?.url?.trim()
  const hasImage = Boolean(imageUrl)
  const imageIsFallback = entry.image?.source === 'local-fallback'

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-lobster-100 bg-white shadow-sm">
      <div className="grid gap-0 md:grid-cols-[minmax(180px,0.9fr)_minmax(0,1.1fr)]">
        <div className="relative min-h-56 bg-[#fff2dd]">
          {hasImage ? (
            <img
              alt={entry.title}
              className="h-full min-h-56 w-full object-cover"
              src={imageUrl}
            />
          ) : (
            <div className="flex h-full min-h-56 flex-col items-center justify-center gap-3 px-5 text-center text-lobster-700">
              <LobsterAvatar size="lg" mood="happy" animated />
              <p className="text-sm font-semibold">小钳还在画图中...</p>
              {canGenerateImage ? (
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-lobster-700 ring-1 ring-lobster-100 transition hover:bg-lobster-50"
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
            </div>
          )}
          {imageIsFallback ? (
            <span className="absolute left-3 top-3 rounded bg-white/90 px-2 py-1 text-xs font-semibold text-lobster-700 shadow-sm">
              预设 Q 版图
            </span>
          ) : null}
        </div>
        <div>
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
            {imageRequested && !hasImage ? (
              <p className="mt-3 text-xs text-ink-500">小钳还在画图中...</p>
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
      </div>
    </div>
  )
}
function SpacePostCard({
  post,
  compact,
  selected,
  previewRequired,
  sourceLabel,
  sourceType,
  onOpenSpace,
  onSelect,
  onLike,
  onShare,
  onReply,
}: {
  post: LobsterSpacePost
  compact?: boolean
  selected?: boolean
  previewRequired?: boolean
  sourceLabel?: string
  sourceType?: InterestNarrativeCardData['sourceType']
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
                {post.kind === 'diary'
                  ? '日记动态'
                  : post.kind === 'interest'
                    ? '兴趣动态'
                    : post.kind === 'status'
                      ? '状态动态'
                      : '成就动态'}
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
        {sourceLabel || previewRequired ? (
          <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-ink-600">
            {sourceLabel ? (
              <p>
                来源类型：{interestSourceTypeLabel(sourceType)} · {sourceLabel}
              </p>
            ) : null}
            {previewRequired ? <p>发布规则：已自动发布，分享前已脱敏。</p> : null}
          </div>
        ) : null}
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
  const draftInputRef = useRef<HTMLTextAreaElement | null>(null)
  const lastMusicTopicDraftIndexRef = useRef<number | null>(null)
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
  const pendingSpaceReplyCount = useLobsterStore(
    (state) => state.demoRuntimeState.pendingSpaceReplyCount,
  )
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
  const interestProfiles = useLobsterStore((state) => state.interestProfiles)
  const musicAuthorizationStatus = useLobsterStore(
    (state) => state.musicAuthorizationStatus,
  )
  const authorizeMockQqMusic = useLobsterStore(
    (state) => state.authorizeMockQqMusic,
  )
  const declineMockQqMusicAuthorization = useLobsterStore(
    (state) => state.declineMockQqMusicAuthorization,
  )
  const installMusicSkills = useLobsterStore((state) => state.installMusicSkills)
  const showMusicInterestReminder = useLobsterStore(
    (state) => state.showMusicInterestReminder,
  )
  const showInterestSpacePreview = useLobsterStore(
    (state) => state.showInterestSpacePreview,
  )
  const publishInterestSpacePostPreview = useLobsterStore(
    (state) => state.publishInterestSpacePostPreview,
  )
  const showInterestCommunity = useLobsterStore(
    (state) => state.showInterestCommunity,
  )
  const saveInterestCommunityCandidate = useLobsterStore(
    (state) => state.saveInterestCommunityCandidate,
  )
  const showInterestMemories = useLobsterStore(
    (state) => state.showInterestMemories,
  )
  const editInterestMemory = useLobsterStore(
    (state) => state.editInterestMemory,
  )
  const pendingInterestEdit = useLobsterStore(
    (state) => state.pendingInterestEdit,
  )
  const deleteInterestMemory = useLobsterStore(
    (state) => state.deleteInterestMemory,
  )
  const lastReward = [...lobsterRewards]
    .reverse()
    .find((reward) => isRewardUnlocked(reward, completedCheckInIds))
  const unlockedRewards = lobsterRewards.filter(
    (reward) => isRewardUnlocked(reward, completedCheckInIds),
  )
  const unlockedInterestRewards = unlockedRewards.filter((reward) =>
    interestAccessoryIds.has(reward.id),
  )
  const equippedReward =
    unlockedRewards.find((reward) => reward.id === equippedAccessoryId) ??
    lastReward ??
    null
  const equippedAccessoryAvatar = equippedReward
    ? accessoryAvatarImages[equippedReward.id]
    : undefined
  const unlockedAchievementKeys = new Set(
    mockAchievements
      .filter((achievement) =>
        completedCheckInIds.includes(achievement.triggerCheckInId ?? ''),
      )
      .map((achievement) => achievement.key),
  )
  const visibleAchievements = mockAchievements.filter(
    (achievement) =>
      !achievement.hidden || unlockedAchievementKeys.has(achievement.key),
  )
  const unlockedAchievements = mockAchievements.filter((achievement) =>
    unlockedAchievementKeys.has(achievement.key),
  )
  const latestAchievement = [...unlockedAchievements].reverse()[0]
  const latestInterestAchievement = [...unlockedAchievements]
    .reverse()
    .find((achievement) =>
      [
        'community_saved',
        'first_interest_feed_view',
        'interest_topic_streak_3',
      ].includes(achievement.key),
    )
  const enabledInterestPersonas = Array.from(
    new Set([
      ...lobsterProfile.interests.map(interestPersonaLabel),
      ...interestProfiles.map((profile) =>
        interestPersonaLabel(profile.interest),
      ),
    ]),
  )
  const enabledInterestSources = Array.from(
    new Set(
      interestProfiles
        .flatMap((profile) => profile.sources)
        .map((source) => interestSourceDisplayLabel(source)),
    ),
  )
  const latestInterestAction =
    latestInterestAchievement?.title ??
    interestProfiles[0]?.sources[interestProfiles[0].sources.length - 1]
      ?.title ??
    (lobsterProfile.interests.length > 0 ? '认养时选择了兴趣' : '还没有兴趣动作')
  const selectedAchievement =
    visibleAchievements.find(
      (achievement) => achievement.key === selectedAchievementKey,
    ) ?? visibleAchievements[0]
  const selectedAchievementUnlocked = selectedAchievement
    ? unlockedAchievementKeys.has(selectedAchievement.key)
    : false
  const selectedAchievementExperienceDraft = selectedAchievement
    ? achievementExperienceDrafts[selectedAchievement.key]
    : undefined
  const equippedAccessory = equippedReward?.title ?? '还没佩戴挂饰'
  const moodLine = latestAchievement
    ? `刚刚点亮「${latestAchievement.title}」`
    : chatLines.length > 0
      ? '正在记住你说过的话'
      : '等你来碰一碰钳子'
  const rightPanelTabs: Array<{ id: RightPanelTab; label: string }> = [
    { id: 'achievements', label: '成就' },
    { id: 'accessories', label: '挂饰' },
    { id: 'interests', label: '兴趣' },
    ...(diaryUnlocked ? [{ id: 'diary' as const, label: '日记' }] : []),
  ]
  const activeRightPanelTab =
    rightPanelTab === 'diary' && !diaryUnlocked ? 'achievements' : rightPanelTab
  const latestSpacePostId = spacePosts[0]?.id
  const effectiveSelectedSpacePostId =
    appView === 'lobster_space' &&
    latestSpacePostId &&
    selectedSpacePostId !== latestSpacePostId
      ? latestSpacePostId
      : selectedSpacePostId &&
    spacePosts.some((post) => post.id === selectedSpacePostId)
      ? selectedSpacePostId
      : latestSpacePostId
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

  function prefillDraft(content: string) {
    setDraft(content)

    window.requestAnimationFrame(() => {
      const input = draftInputRef.current
      input?.focus()
      input?.setSelectionRange(content.length, content.length)
    })
  }

  function getNextMusicTopicDraftIndex(previousIndex: number | null) {
    if (musicTopicDrafts.length <= 1) {
      return 0
    }

    if (
      previousIndex === null ||
      previousIndex < 0 ||
      previousIndex >= musicTopicDrafts.length
    ) {
      return Math.floor(Math.random() * musicTopicDrafts.length)
    }

    const nextIndex = Math.floor(Math.random() * (musicTopicDrafts.length - 1))
    return nextIndex >= previousIndex ? nextIndex + 1 : nextIndex
  }

  function prefillMusicTopicDraft() {
    const nextIndex = getNextMusicTopicDraftIndex(
      lastMusicTopicDraftIndexRef.current,
    )
    lastMusicTopicDraftIndexRef.current = nextIndex
    prefillDraft(musicTopicDrafts[nextIndex])
  }

  function prefillCapabilityDraft(capability: unknown, fallback: string) {
    const content =
      typeof capability === 'string' ? capabilityDrafts[capability] : undefined
    prefillDraft(content ?? fallback)
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
      prefillDraft(content)
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

    const capability = payload.capability

    if (capability === 'request_music_authorization') {
      prefillDraft('小钳，我确认授权 QQ 音乐')
      return
    }

    if (
      capability === 'reply_draft' ||
      capability === 'work_log' ||
      capability === 'space_post' ||
      capability === 'space_comment' ||
      capability === 'interest_memory' ||
      capability === 'interest_music_reminder' ||
      capability === 'interest_space_preview' ||
      capability === 'interest_community'
    ) {
      prefillCapabilityDraft(capability, suggestion.label)
      return
    }

    if (
      payload.capability === 'summarize_group' ||
      payload.capability === 'summarize_group_messages'
    ) {
      requestGroupPermissions()
      return
    }

    if (payload.capability === 'open_achievement_wall') {
      openLobsterChat()
      setRightPanelTab('achievements')
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

    if (payload.capability === 'interest_memory') {
      showInterestMemories()
      return
    }

    if (payload.capability === 'interest_music_reminder') {
      void showMusicInterestReminder()
      return
    }

    if (payload.capability === 'interest_space_preview') {
      void showInterestSpacePreview()
      return
    }

    if (payload.capability === 'publish_interest_space_post') {
      void publishInterestSpacePostPreview(
        typeof payload.postId === 'string' ? payload.postId : '',
      )
      return
    }

    if (payload.capability === 'interest_community') {
      void showInterestCommunity()
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
      return
    }

    if (payload.capability === 'open_hidden_diary') {
      void openHiddenDiary()
    }
  }

  function renderLineSuggestions(line: LobsterChatLine) {
    const suggestions =
      line.suggestions
        ?.filter((suggestion) => !isLegacyInterestSpacePublishSuggestion(suggestion))
        .slice(0, 3) ?? []

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

    if (line.card.type === 'music_authorization_card') {
      return (
        <MusicAuthorizationCard
          status={line.card.status}
          disabled={sending || line.card.status === 'loading'}
          onAuthorize={() => void authorizeMockQqMusic()}
          onDecline={declineMockQqMusicAuthorization}
        />
      )
    }

    if (line.card.type === 'music_skill_suggestion_card') {
      return (
        <MusicSkillSuggestionCard
          title={line.card.title}
          summary={line.card.summary}
          skills={line.card.skills}
          status={line.card.status}
          steps={line.card.steps}
          successMessage={line.card.successMessage}
          disabled={sending || line.card.status === 'installing'}
          onInstall={() => void installMusicSkills()}
          onTalkMusic={prefillMusicTopicDraft}
          onSummarizeGroup={() =>
            prefillDraft('小钳，帮我总结一下最近群聊里大家讨论的重点')
          }
        />
      )
    }

    if (line.card.type === 'interest_memory_card') {
      return (
        <InterestMemoryCard
          profile={line.card.profile}
          receipt={line.card.receipt}
          disabled={sending}
          onEdit={(interest) => void editInterestMemory(interest)}
          onDelete={(interest) => void deleteInterestMemory(interest)}
        />
      )
    }

    if (line.card.type === 'interest_risk_confirmation_card') {
      return (
        <InterestRiskConfirmationCard
          title={line.card.title}
          reason={line.card.reason}
          evidenceText={line.card.evidenceText}
        />
      )
    }

    if (
      line.card.type === 'interest_reminder' ||
      line.card.type === 'interest_community'
    ) {
      return (
        <InterestNarrativeCard
          card={line.card}
          onFavoriteCommunity={saveInterestCommunityCandidate}
          onGenerateSpacePost={() =>
            prefillDraft('小钳，把音乐动态生成一条空间动态')
          }
        />
      )
    }

    if (line.card.type !== 'space_post_card') {
      return null
    }

    return (
      <SpacePostCard
        post={line.card.post}
        compact
        selected={line.card.post.id === effectiveSelectedSpacePostId}
        previewRequired={line.card.previewRequired}
        sourceLabel={line.card.sourceLabel}
        sourceType={line.card.sourceType}
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
          <div className="flex items-center gap-2">
            {pendingSpaceReplyCount > 0 ? (
              <span className="rounded-full bg-lobster-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
                你有 {pendingSpaceReplyCount} 条新回复
              </span>
            ) : null}
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-qq-700 ring-1 ring-qq-100 transition hover:bg-qq-50"
              type="button"
              onClick={openLobsterChat}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              私聊
            </button>
          </div>
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
          key={activeAchievementMoment.id}
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
                  'relative',
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
                {pendingSpaceReplyCount > 0 ? (
                  <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-lobster-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[#e8f2ff]">
                    {pendingSpaceReplyCount}
                  </span>
                ) : null}
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

            {chatLines.length === 0 ? (
              <>
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
              </>
            ) : null}

            {chatLines.map((line) =>
              line.role === 'user' ? (
                <div
                  className="flex flex-row-reverse gap-3 text-right"
                  key={line.id}
                >
                  <Avatar label={currentUser.avatar} active />
                  <div className="max-w-[72%] whitespace-pre-line rounded-lg bg-qq-500 px-4 py-3 text-sm leading-6 text-white shadow-sm">
                    {line.content}
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 text-left" key={line.id}>
                  <LobsterAvatar size="sm" mood="happy" />
                  <div className="max-w-[72%] space-y-1">
                    <div className="whitespace-pre-line rounded-lg border border-lobster-100 bg-white px-4 py-3 text-sm leading-6 text-ink-900 shadow-sm">
                      {line.content
                        ? formatIntroSelfIntroduction(line.content)
                        : '我正在组织语言...'}
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
                ref={draftInputRef}
                className="h-20 min-h-20 flex-1 resize-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-ink-500 focus:border-qq-500 focus:bg-white focus:ring-4 focus:ring-qq-100"
                placeholder={
                  pendingInterestEdit
                    ? '输入修改信息，比如：林俊杰、周杰伦、日摇，城市深圳，只提醒演唱会'
                    : '和小龙虾说句话'
                }
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
                  {equippedAccessoryAvatar ? (
                    <span className="grid h-20 w-20 place-items-center">
                      <img
                        className="h-24 w-24 max-w-none object-contain"
                        src={equippedAccessoryAvatar.src}
                        alt={equippedAccessoryAvatar.alt}
                      />
                    </span>
                  ) : (
                    <>
                      <LobsterAvatar
                        size="md"
                        mood={lobsterProfile.mood}
                        animated
                      />
                      <AccessoryOnAvatar rewardId={equippedReward?.id} />
                    </>
                  )}
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

              <div className="mt-4 flex w-full items-center justify-between gap-3 rounded-lg bg-white px-3 py-3">
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
                    {visibleAchievements.map((achievement, achievementIndex) => {
                      const unlocked = unlockedAchievementKeys.has(achievement.key)
                      const label =
                        achievement.hidden && !unlocked ? '???' : achievement.title
                      const tooltip = unlocked
                        ? achievement.description
                        : achievement.hint
                      const tooltipAlignmentClass =
                        achievementIndex % 5 === 0
                          ? 'left-0 translate-x-0'
                          : achievementIndex % 5 === 4
                            ? 'right-0 translate-x-0'
                            : 'left-1/2 -translate-x-1/2'
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
                          data-achievement-key={achievement.key}
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
                            className={[
                              'pointer-events-none absolute top-full z-40 mt-1 w-40 rounded-md border border-slate-200 bg-ink-900 px-2.5 py-1.5 text-left text-xs leading-5 text-white opacity-0 shadow-lg transition-opacity duration-75 group-hover:opacity-100 group-focus-visible:opacity-100',
                              tooltipAlignmentClass,
                            ].join(' ')}
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
                      {selectedAchievementUnlocked ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-xs font-semibold text-ink-500">
                            <Share2 className="h-3.5 w-3.5" />
                            分享
                          </span>
                        </div>
                      ) : selectedAchievementExperienceDraft &&
                        !selectedAchievement.hidden ? (
                        <button
                          className="mt-3 inline-flex items-center gap-1.5 rounded bg-qq-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-qq-700"
                          type="button"
                          onClick={() =>
                            prefillDraft(selectedAchievementExperienceDraft)
                          }
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          去体验
                        </button>
                      ) : null}
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
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {lobsterRewards.map((reward) => {
                      const unlocked = isRewardUnlocked(
                        reward,
                        completedCheckInIds,
                      )
                      const equipped = equippedReward?.id === reward.id
                      return (
                        <button
                          className={[
                            'group relative flex min-h-24 w-full flex-col rounded-lg border px-3 py-3 text-left transition hover:z-30 focus-visible:z-30',
                            unlocked && equipped
                              ? 'border-qq-300 bg-qq-50 text-ink-900 ring-2 ring-qq-100'
                              : '',
                            unlocked && !equipped
                              ? 'border-slate-200 bg-white text-ink-900 hover:border-qq-200 hover:bg-qq-50'
                              : '',
                            unlocked
                              ? 'cursor-pointer'
                              : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 grayscale',
                          ].join(' ')}
                          key={reward.id}
                          type="button"
                          disabled={!unlocked}
                          aria-label={`${reward.title}，${reward.description}`}
                          onClick={() => equipAccessory(reward.id)}
                        >
                          <div className="flex h-full flex-col gap-2">
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
                                'self-start rounded px-2 py-1 text-xs font-semibold',
                                unlocked && equipped
                                  ? 'bg-qq-100 text-qq-700'
                                  : unlocked
                                  ? 'bg-white text-qq-700'
                                  : 'bg-slate-200 text-slate-500',
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

              {activeRightPanelTab === 'interests' ? (
                <div className="mt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-qq-600" />
                      <p className="text-sm font-semibold text-ink-900">
                        兴趣状态
                      </p>
                    </div>
                    <span className="rounded bg-qq-50 px-2 py-1 text-xs text-qq-700">
                      {enabledInterestPersonas.length}
                    </span>
                  </div>
                  <div className="mt-3 space-y-3">
                    <div className="rounded-lg border border-qq-100 bg-qq-50 px-3 py-3">
                      <p className="text-xs font-semibold text-qq-700">
                        兴趣人格
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {enabledInterestPersonas.map((persona) => (
                          <span
                            className="rounded bg-white px-2 py-1 text-xs font-semibold text-ink-700"
                            key={persona}
                          >
                            {persona}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <div className="rounded-lg bg-slate-50 px-3 py-3">
                        <p className="text-xs font-semibold text-ink-700">
                          已启用来源
                        </p>
                        <p className="mt-1 text-xs leading-5 text-ink-500">
                          {enabledInterestSources.length > 0
                            ? enabledInterestSources.join('、')
                            : '认养兴趣标签'}
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-3">
                        <p className="text-xs font-semibold text-ink-700">
                          最近兴趣动作
                        </p>
                        <p className="mt-1 text-xs leading-5 text-ink-500">
                          {latestInterestAction}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold text-ink-700">
                          兴趣挂饰
                        </p>
                        <span className="rounded bg-slate-50 px-2 py-1 text-xs text-ink-500">
                          {unlockedInterestRewards.length}
                        </span>
                      </div>
                      {unlockedInterestRewards.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {unlockedInterestRewards.map((reward) => (
                            <button
                              className={[
                                'inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold transition',
                                equippedReward?.id === reward.id
                                  ? 'bg-qq-50 text-qq-700 ring-1 ring-qq-100'
                                  : 'bg-slate-50 text-ink-600 hover:bg-qq-50 hover:text-qq-700',
                              ].join(' ')}
                              key={reward.id}
                              type="button"
                              onClick={() => equipAccessory(reward.id)}
                            >
                              <AccessoryPreview
                                rewardId={reward.id}
                                selected={equippedReward?.id === reward.id}
                                unlocked
                              />
                              {reward.title}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs leading-5 text-ink-500">
                          收藏推荐 QQ 群后会解锁。
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold text-ink-700">
                          兴趣记忆
                        </p>
                        <span className="rounded bg-slate-50 px-2 py-1 text-xs text-ink-500">
                          {interestProfiles.length}
                        </span>
                      </div>
                      <div className="mt-2 space-y-2">
                    {interestProfiles.length === 0 ? (
                      <div className="rounded-lg bg-slate-50 px-3 py-3 text-xs leading-5 text-ink-500">
                        还没有具体兴趣画像。自然聊天里提到低风险偏好后，我会给回执并记下来。
                      </div>
                    ) : (
                      interestProfiles.map((profile) => {
                        const source = profile.sources[profile.sources.length - 1]
                        return (
                          <div
                            className="rounded-lg border border-slate-200 bg-white px-3 py-3"
                            key={profile.id}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-ink-900">
                                  {interestLabel(profile.interest)}
                                </p>
                                <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-500">
                                  {profile.topics.join('、') || '暂未记录关键词'}
                                </p>
                              </div>
                              <span className="shrink-0 rounded bg-slate-50 px-2 py-1 text-xs text-ink-500">
                                已记录
                              </span>
                            </div>
                            <p className="mt-2 text-xs leading-5 text-ink-500">
                              来源：{source?.title ?? '未知来源'}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                className="rounded-lg bg-qq-50 px-3 py-1.5 text-xs font-semibold text-qq-700 transition hover:bg-qq-100"
                                type="button"
                                onClick={() => void showInterestMemories()}
                              >
                                查看
                              </button>
                              <button
                                className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-qq-700 ring-1 ring-qq-100 transition hover:bg-qq-50"
                                type="button"
                                onClick={() =>
                                  void editInterestMemory(profile.interest)
                                }
                              >
                                修改
                              </button>
                              <button
                                className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-600 ring-1 ring-red-100 transition hover:bg-red-50"
                                type="button"
                                onClick={() =>
                                  void deleteInterestMemory(profile.interest)
                                }
                              >
                                删除
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}
                      </div>
                    </div>
                  </div>
                  {musicAuthorizationStatus === 'pending' ? (
                    <button
                      className="mt-3 w-full rounded-lg bg-qq-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-qq-600"
                      type="button"
                      onClick={() => void showInterestMemories()}
                    >
                      先查看兴趣状态
                    </button>
                  ) : null}
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
