import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bell,
  FileText,
  Image,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Search,
  Send,
  Settings,
  Smile,
  Users,
} from 'lucide-react'
import { openclawAiAdapter } from '../ai/openclawAiAdapter'
import {
  conversations,
  currentUser,
  groupMembers,
  messages,
} from '../data/mockData'
import { useLobsterStore } from '../store/useLobsterStore'
import type { QQMessage } from '../types'
import { LobsterAvatar } from './LobsterAvatar'

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

function ChatMessage({
  message,
  focused,
}: {
  message: QQMessage
  focused?: boolean
}) {
  if (message.kind === 'system') {
    return (
      <div className="flex justify-center">
        <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs text-ink-500">
          {message.content}
        </span>
      </div>
    )
  }

  return (
    <div
      className={[
        'flex gap-3',
        message.isOwn ? 'flex-row-reverse text-right' : 'text-left',
        focused ? 'rounded-lg bg-amber-50/80 p-2 ring-2 ring-amber-200' : '',
      ].join(' ')}
    >
      <Avatar label={message.senderAvatar} />
      <div className="max-w-[72%] space-y-1">
        <div
          className={[
            'flex items-center gap-2 text-xs text-ink-500',
            message.isOwn ? 'justify-end' : '',
          ].join(' ')}
        >
          <span>{message.senderName}</span>
          <span>{message.sentAt}</span>
        </div>
        <div
          className={[
            'rounded-lg px-4 py-3 text-sm leading-6 shadow-sm',
            message.isOwn
              ? 'bg-qq-500 text-white'
              : message.kind === 'mention'
                ? 'border border-lobster-100 bg-lobster-50 text-ink-900'
                : 'border border-slate-100 bg-white text-ink-900',
          ].join(' ')}
        >
          {message.content}
        </div>
      </div>
    </div>
  )
}

export function QQShell() {
  const [firstHint, setFirstHint] = useState('')
  const [draft, setDraft] = useState('')
  const [localMessages, setLocalMessages] = useState<QQMessage[]>([])
  const messageEndRef = useRef<HTMLDivElement | null>(null)
  const activeConversationId = useLobsterStore(
    (state) => state.activeConversationId,
  )
  const lobsterDiscovered = useLobsterStore((state) => state.lobsterDiscovered)
  const lobsterAdopted = useLobsterStore((state) => state.lobsterAdopted)
  const setActiveConversation = useLobsterStore(
    (state) => state.setActiveConversation,
  )
  const discoverLobster = useLobsterStore((state) => state.discoverLobster)
  const openAdoption = useLobsterStore((state) => state.openAdoption)
  const openLobsterChat = useLobsterStore((state) => state.openLobsterChat)
  const sourceFocus = useLobsterStore((state) => state.sourceFocus)
  const demoRuntimeState = useLobsterStore((state) => state.demoRuntimeState)
  const lobsterChatLines = useLobsterStore((state) => state.lobsterChatLines)

  const activeConversation =
    conversations.find((item) => item.id === activeConversationId) ??
    conversations[0]
  const leftChatAtMs = demoRuntimeState.leftChatAt
    ? Date.parse(demoRuntimeState.leftChatAt)
    : Number.NaN
  const unreadPushCount = Number.isFinite(leftChatAtMs)
    ? lobsterChatLines.filter(
        (line) =>
          (line.id.startsWith('off-chat-music-push-') ||
            line.id.startsWith('off-chat-behavior-push-')) &&
          Date.parse(line.createdAt) > leftChatAtMs,
      ).length
    : 0
  const lobsterUnreadCount =
    demoRuntimeState.leftChatAt &&
    (unreadPushCount > 0 || demoRuntimeState.pendingSpaceReplyCount > 0)
      ? Math.max(demoRuntimeState.pendingSpaceReplyCount, unreadPushCount)
      : 0

  const activeMessages = useMemo(
    () =>
      [...messages, ...localMessages].filter(
        (message) => message.conversationId === activeConversation.id,
      ),
    [activeConversation.id, localMessages],
  )

  const draftContent = draft.trim()

  function sendMessage() {
    if (!draftContent) {
      return
    }

    const now = new Date()
    const sentAt = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes(),
    ).padStart(2, '0')}`
    const message: QQMessage = {
      id: `local-${activeConversation.id}-${now.getTime()}`,
      conversationId: activeConversation.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      content: draftContent,
      sentAt,
      kind: 'text',
      isOwn: true,
    }

    setLocalMessages((current) => [...current, message])
    setDraft('')
  }

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ block: 'end' })
  }, [activeMessages.length])

  useEffect(() => {
    if (lobsterDiscovered || lobsterAdopted) {
      return
    }

    const timer = window.setTimeout(() => {
      void openclawAiAdapter.getFirstEncounterHint().then((message) => {
        setFirstHint(message)
        discoverLobster()
      })
    }, 1400)

    return () => window.clearTimeout(timer)
  }, [discoverLobster, lobsterAdopted, lobsterDiscovered])

  useEffect(() => {
    if (
      sourceFocus?.conversationId !== activeConversation.id ||
      !sourceFocus.messageId
    ) {
      return
    }

    const timer = window.setTimeout(() => {
      document
        .getElementById(`qq-message-${sourceFocus.messageId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 80)

    return () => window.clearTimeout(timer)
  }, [activeConversation.id, sourceFocus])

  return (
    <div className="flex h-screen min-h-[680px] bg-[#edf3fb] p-4 text-ink-900">
      <div className="mx-auto grid h-full w-full max-w-[1440px] grid-cols-[74px_minmax(220px,280px)_minmax(460px,1fr)_300px] overflow-hidden rounded-lg border border-white/80 bg-white shadow-panel">
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

        <aside className="border-r border-slate-100 bg-slate-50">
          <div className="border-b border-slate-100 px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-ink-900">消息</p>
                <p className="text-xs text-ink-500">{currentUser.signature}</p>
              </div>
              <button
                className="grid h-9 w-9 place-items-center rounded-lg text-ink-500 transition hover:bg-white hover:text-qq-600"
                type="button"
                aria-label="更多"
              >
                <MoreHorizontal className="h-5 w-5" />
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
            {lobsterAdopted ? (
              <button
                className="mb-2 grid w-full grid-cols-[42px_1fr_auto] gap-3 rounded-lg bg-lobster-50 px-2 py-3 text-left transition hover:bg-lobster-100"
                type="button"
                onClick={openLobsterChat}
              >
                <span className="relative">
                  <LobsterAvatar size="sm" mood="happy" />
                  {lobsterUnreadCount > 0 ? (
                    <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-lobster-50" />
                  ) : null}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink-900">
                    小钳
                  </span>
                  <span className="mt-1 block truncate text-xs text-ink-500">
                    {lobsterUnreadCount > 0 ? '有新的小提醒' : '回到小龙虾'}
                  </span>
                </span>
                {lobsterUnreadCount > 0 ? (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-lobster-500 px-1 text-[10px] font-semibold text-white">
                    {lobsterUnreadCount}
                  </span>
                ) : (
                  <span className="text-xs text-lobster-600">返回</span>
                )}
              </button>
            ) : null}
            {conversations.map((conversation) => {
              const active = conversation.id === activeConversation.id
              return (
                <button
                  className={[
                    'grid w-full grid-cols-[42px_1fr_auto] gap-3 rounded-lg px-2 py-3 text-left transition',
                    active
                      ? 'bg-white shadow-sm'
                      : 'hover:bg-white/80 hover:shadow-sm',
                  ].join(' ')}
                  type="button"
                  key={conversation.id}
                  onClick={() => setActiveConversation(conversation.id)}
                >
                  <Avatar label={conversation.avatar} active={active} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-ink-900">
                        {conversation.title}
                      </span>
                      {conversation.pinned ? (
                        <span className="rounded bg-qq-50 px-1.5 py-0.5 text-[10px] font-medium text-qq-700">
                          置顶
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block truncate text-xs text-ink-500">
                      {conversation.lastMessage}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-2">
                    <span className="text-xs text-ink-500">
                      {conversation.lastAt}
                    </span>
                    {conversation.unreadCount > 0 ? (
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-lobster-500 px-1 text-[10px] font-semibold text-white">
                        {conversation.unreadCount}
                      </span>
                    ) : null}
                  </span>
                </button>
              )
            })}
          </div>
        </aside>

        <main className="relative flex min-w-0 flex-col bg-[#f8fbff]">
          <header className="flex h-16 items-center justify-between border-b border-slate-100 bg-white px-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-base font-semibold text-ink-900">
                  {activeConversation.title}
                </h1>
                {activeConversation.type === 'group' ? (
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-ink-500">
                    {activeConversation.memberCount} 人
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-ink-500">
                普通群聊 · 模拟 QQ 会话
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="grid h-9 w-9 place-items-center rounded-lg text-ink-500 transition hover:bg-slate-100 hover:text-qq-600"
                type="button"
                aria-label="搜索聊天"
              >
                <Search className="h-4 w-4" />
              </button>
              <button
                className="grid h-9 w-9 place-items-center rounded-lg text-ink-500 transition hover:bg-slate-100 hover:text-qq-600"
                type="button"
                aria-label="更多"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-6 py-6">
            <div className="flex justify-center">
              <span className="rounded-lg bg-slate-200/70 px-3 py-1 text-xs text-ink-500">
                今天 21:10
              </span>
            </div>
            {activeMessages.map((message) => (
              <div id={`qq-message-${message.id}`} key={message.id}>
                <ChatMessage
                  message={message}
                  focused={
                    sourceFocus?.conversationId === activeConversation.id &&
                    sourceFocus.messageId === message.id
                  }
                />
              </div>
            ))}
            <div ref={messageEndRef} />

          </div>

          {(lobsterDiscovered || firstHint) && !lobsterAdopted ? (
            <button
              className="lobster-peek absolute bottom-[92px] right-6 z-10 flex max-w-[360px] items-end gap-3 rounded-lg border border-lobster-100 bg-white px-4 py-3 text-left shadow-panel transition hover:-translate-y-0.5 hover:border-lobster-300"
              type="button"
              onClick={openAdoption}
            >
              <LobsterAvatar size="md" mood="curious" animated />
              <span className="self-center">
                <span className="block text-sm font-semibold text-ink-900">
                  Hello！Hello！
                </span>
                <span className="mt-1 block text-sm font-semibold text-ink-900">
                  有个小东西从消息里探出来了
                </span>
              </span>
            </button>
          ) : null}

          {lobsterAdopted ? (
            <button
              className="absolute bottom-[92px] right-6 z-10 flex items-center gap-3 rounded-lg border border-lobster-100 bg-white px-4 py-3 text-left shadow-panel transition hover:-translate-y-0.5 hover:border-lobster-300"
              type="button"
              onClick={openLobsterChat}
            >
              <span className="relative">
                <LobsterAvatar size="sm" mood="happy" animated />
                {lobsterUnreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" />
                ) : null}
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink-900">
                  {lobsterUnreadCount > 0 ? '小钳有新提醒' : '回到小钳'}
                </span>
                <span className="mt-1 block text-xs leading-5 text-ink-500">
                  {lobsterUnreadCount > 0 ? '回聊天里看看' : '来源看完后回到成长墙'}
                </span>
              </span>
            </button>
          ) : null}

          <footer className="border-t border-slate-100 bg-white px-5 py-4">
            <div className="flex items-center gap-3">
              <button
                className="grid h-9 w-9 place-items-center rounded-lg text-ink-500 transition hover:bg-slate-100 hover:text-qq-600"
                type="button"
                aria-label="表情"
              >
                <Smile className="h-5 w-5" />
              </button>
              <button
                className="grid h-9 w-9 place-items-center rounded-lg text-ink-500 transition hover:bg-slate-100 hover:text-qq-600"
                type="button"
                aria-label="图片"
              >
                <Image className="h-5 w-5" />
              </button>
              <button
                className="grid h-9 w-9 place-items-center rounded-lg text-ink-500 transition hover:bg-slate-100 hover:text-qq-600"
                type="button"
                aria-label="附件"
              >
                <Paperclip className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-3 flex items-end gap-3">
              <textarea
                className="h-20 min-h-20 flex-1 resize-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-ink-500 focus:border-qq-500 focus:bg-white focus:ring-4 focus:ring-qq-100"
                placeholder="输入消息"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    sendMessage()
                  }
                }}
              />
              <button
                className={[
                  'inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition',
                  draftContent
                    ? 'bg-qq-500 hover:bg-qq-600'
                    : 'cursor-not-allowed bg-slate-300',
                ].join(' ')}
                type="button"
                disabled={!draftContent}
                onClick={sendMessage}
              >
                <Send className="h-4 w-4" />
                发送
              </button>
            </div>
          </footer>
        </main>

        <aside className="border-l border-slate-100 bg-white">
          <div className="border-b border-slate-100 px-5 py-5">
            <div className="flex items-center gap-3">
              <Avatar label={activeConversation.avatar} active />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink-900">
                  {activeConversation.title}
                </p>
                <p className="mt-1 text-xs text-ink-500">
                  群资料 · {activeConversation.memberCount ?? 2} 人
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5 px-5 py-5">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-ink-900">在线成员</p>
                <span className="text-xs text-ink-500">
                  {groupMembers.filter((member) => member.online).length} 在线
                </span>
              </div>
              <div className="space-y-2">
                {groupMembers.map((member) => (
                  <div
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                    key={member.id}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar label={member.avatar} />
                      <div>
                        <p className="text-sm font-medium text-ink-900">
                          {member.name}
                        </p>
                        <p className="text-xs text-ink-500">
                          {member.role === 'owner' ? '群主' : '成员'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={[
                        'h-2 w-2 rounded-full',
                        member.online ? 'bg-emerald-400' : 'bg-slate-300',
                      ].join(' ')}
                    />
                  </div>
                ))}
              </div>
            </section>

            <section>
              <p className="mb-3 text-sm font-semibold text-ink-900">群文件</p>
              <div className="space-y-2">
                {['Demo 路径草案.md', '初赛资料整理.pdf', '录屏分工表.xlsx'].map(
                  (file) => (
                    <div
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink-700"
                      key={file}
                    >
                      <FileText className="h-4 w-4 text-qq-600" />
                      <span className="truncate">{file}</span>
                    </div>
                  ),
                )}
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  )
}
