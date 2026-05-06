import { openclawClient } from '../api/openclawClient'
import { mockQqMusicListeningSnapshot } from '../data/mockData'
import type {
  LobsterChatContext,
  LobsterProfile,
  MusicListeningSnapshot,
} from '../types'
import { mockAiAdapter, type AdoptionInput } from './mockAiAdapter'

type LobsterStreamMode = 'normal' | 'slow'

function isIntroRequest(content: string) {
  return /介绍.*(自己|你)|你是谁|认识你|自我介绍|你好呀，介绍你自己/.test(content)
}

function isCapabilityOverviewRequest(content: string) {
  return /你还?能做什么|还能干什么|你会什么|有什么功能|你可以做什么/.test(content)
}

function isMusicChatTopic(content: string) {
  return /音乐|听歌|歌手|新歌|演唱会|专辑|曲风|歌词|歌单|旋律|林俊杰|周杰伦|日摇|摇滚|民谣|电子|livehouse/i.test(content)
}

function createCapabilityOverview(profile: LobsterProfile) {
  return [
    `我现在最稳定的事，是陪你聊天，也慢慢记住你喜欢的东西。比如你刚刚聊过的音乐，我会尽量像同好一样接住，而不是每句都推功能。`,
    '',
    '如果你愿意授权群聊，我可以帮你留意重点、整理每天的群聊总结，也能先写回复草稿；真正发出去之前，还是由你决定。',
    '',
    '再往后，我会写小龙虾日记、发自己的龙虾空间，也会通过成就墙解锁挂饰和新能力。',
    '',
    '文档和代码我也能帮一点，像整理内容、改写说明、看一段代码哪里不顺，都可以直接丢给我。',
    '',
    `你可以先从成就墙慢慢逛，也可以继续和${profile.name}聊音乐。`,
  ].join('\n')
}

function formatMusicSnapshotForChat(snapshot: MusicListeningSnapshot) {
  const recent = snapshot.recentPlays
    .slice(0, 3)
    .map((play) => `《${play.title}》-${play.artist}`)
    .join('、')
  const playlist = snapshot.playlists[0]
  const loop = snapshot.loopSignals[0]

  return [
    `我这边有一份${snapshot.sourceLabel}，不用空聊。`,
    recent ? `最近播放里最靠前的是${recent}。` : '',
    playlist
      ? `收藏/歌单这边，「${playlist.name}」刚更新过，重点偏${playlist.highlights.join('、')}。`
      : '',
    loop
      ? `循环信号也挺明显：${loop.window}里《${loop.title}》听了 ${loop.count} 次。`
      : '',
    `所以今天可以先从“${snapshot.chatSuggestions[0]}”这个方向聊。`,
  ]
    .filter(Boolean)
    .join('\n')
}

function createMusicChatReply(profile: LobsterProfile) {
  return [
    formatMusicSnapshotForChat(mockQqMusicListeningSnapshot),
    '',
    `你可以继续让${profile.name}按最近播放、收藏歌单或循环最多的歌往下聊。`,
  ].join('\n')
}

function createMusicChatContext(input: {
  lobsterProfile: LobsterProfile
  context?: LobsterChatContext
}): LobsterChatContext | undefined {
  const guidance =
    '音乐话题按同好聊天方式自然回应，先接住情绪和偏好，不要直接推功能。'
  const snapshotGuidance =
    '已授权的模拟 QQ 音乐实时歌单快照可用；可以引用最近播放、收藏歌单和循环记录，不要说没有歌单或播放记录。'

  if (input.context?.type === 'private_chat') {
    const guidanceList = [guidance, snapshotGuidance].reduce<string[]>(
      (items, item) => (items.includes(item) ? items : [...items, item]),
      input.context.guidance,
    )

    return {
      ...input.context,
      userSignal: 'interest_related',
      guidance: guidanceList,
      musicListeningSnapshot:
        input.context.musicListeningSnapshot ?? mockQqMusicListeningSnapshot,
    }
  }

  if (input.context) {
    return input.context
  }

  return {
    type: 'private_chat',
    interestProfiles: [
      {
        interest: 'music',
        label: '音乐同好',
        topics: ['音乐', '歌手', '新歌', '演唱会'],
        sourceLabels: input.lobsterProfile.interests.includes('music')
          ? ['认养兴趣']
          : ['当前私聊'],
        reminderFrequency: 'important_only',
        tone: 'same_interest_friend',
      },
    ],
    userSignal: 'interest_related',
    guidance: [
      '可以自然接住音乐偏好和情绪，不要每句都推功能。',
      '如果引用来源，要说明来自当前私聊或用户授权兴趣。',
      snapshotGuidance,
    ],
    musicListeningSnapshot: mockQqMusicListeningSnapshot,
  }
}

function createIntroSelfIntroduction(profile: LobsterProfile) {
  return [
    `我是你的小龙虾${profile.name}，住在 QQ 里。`,
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

function createDisplayChunks(text: string, mode: LobsterStreamMode) {
  const chars = Array.from(text)
  const size = mode === 'slow' ? 6 : 9
  const chunks: string[] = []

  for (let index = 0; index < chars.length; index += size) {
    chunks.push(chars.slice(index, index + size).join(''))
  }

  return chunks.length > 0 ? chunks : [text]
}

function getChunkDelayMs(chunk: string, mode: LobsterStreamMode) {
  const baseDelay = mode === 'slow' ? 10 : 12
  const sentencePause = /[\n。！？!?]/.test(chunk)
    ? mode === 'slow'
      ? 70
      : 55
    : 0
  const commaPause = !sentencePause && /[，,；;：:、]/.test(chunk)
    ? mode === 'slow'
      ? 40
      : 30
    : 0

  return Array.from(chunk).length * baseDelay + sentencePause + commaPause
}

function waitForDisplay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export const openclawAiAdapter = {
  async getFirstEncounterHint() {
    try {
      const output = await openclawClient.chat([
        {
          role: 'user',
          content:
            'Generate the first short encounter hint before the user adopts the lobster.',
        },
      ])
      return output.text
    } catch {
      return mockAiAdapter.getFirstEncounterHint()
    }
  },

  async createAdoptionGreeting(input: AdoptionInput) {
    try {
      const output = await openclawClient.chat([
        {
          role: 'user',
          content: `Adoption complete. Lobster: ${input.lobsterName}. User callsign: ${input.userCallsign}.`,
        },
      ])
      return output.text
    } catch {
      return mockAiAdapter.createAdoptionGreeting(input)
    }
  },

  async chatWithLobster(input: {
    content: string
    lobsterProfile: LobsterProfile
    context?: LobsterChatContext
  }) {
    if (isIntroRequest(input.content)) {
      return {
        id: `scripted-intro-${Date.now()}`,
        text: createIntroSelfIntroduction(input.lobsterProfile),
        source: 'mock-fallback' as const,
        durationMs: 0,
      }
    }

    if (isCapabilityOverviewRequest(input.content)) {
      return {
        id: `scripted-capability-overview-${Date.now()}`,
        text: createCapabilityOverview(input.lobsterProfile),
        source: 'mock-fallback' as const,
        durationMs: 0,
      }
    }

    const musicTopic = isMusicChatTopic(input.content)
    const chatContext = musicTopic ? createMusicChatContext(input) : input.context

    try {
      return await openclawClient.chat([
        {
          role: 'user',
          content: `Lobster profile: ${JSON.stringify(input.lobsterProfile)}\nUser message: ${input.content}`,
        },
      ], chatContext)
    } catch {
      if (musicTopic) {
        return {
          id: `local-music-fallback-${Date.now()}`,
          text: createMusicChatReply(input.lobsterProfile),
          source: 'mock-fallback' as const,
          durationMs: 0,
        }
      }

      return {
        id: `local-fallback-${Date.now()}`,
        text: await mockAiAdapter.getStageHoldMessage(),
        source: 'mock-fallback' as const,
        durationMs: 0,
      }
    }
  },

  async *streamLobsterChat(input: {
    content: string
    lobsterProfile: LobsterProfile
    context?: LobsterChatContext
    presentationMode?: LobsterStreamMode
  }) {
    const output = await this.chatWithLobster(input)
    const mode = input.presentationMode ?? (isIntroRequest(input.content) ? 'slow' : 'normal')
    const chunks = createDisplayChunks(output.text, mode)

    for (const chunk of chunks) {
      yield {
        type: 'chunk' as const,
        text: chunk,
        source: output.source,
        outputId: output.id,
      }
      await waitForDisplay(getChunkDelayMs(chunk, mode))
    }

    yield {
      type: 'done' as const,
      source: output.source,
      outputId: output.id,
    }
  },
}
