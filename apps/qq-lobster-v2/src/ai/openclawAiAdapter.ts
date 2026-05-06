import { openclawClient } from '../api/openclawClient'
import type { LobsterChatContext, LobsterProfile } from '../types'
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

function createMusicChatReply(profile: LobsterProfile) {
  return [
    '我会记得你不是只把音乐当背景音的人。像林俊杰、周杰伦，还有一点日摇那种情绪线，都更像是陪你把状态慢慢放下来。',
    '',
    '如果聊到新歌、演出或者某句歌词，我会先按同好聊天的方式接住：说说我听到的感觉，再帮你把真正重要的动态夹进记录里。',
    '',
    `你可以继续给${profile.name}丢一首歌名，或者直接说最近哪句歌词卡在心里。`,
  ].join('\n')
}

function createMusicChatContext(input: {
  lobsterProfile: LobsterProfile
  context?: LobsterChatContext
}): LobsterChatContext | undefined {
  const guidance =
    '音乐话题按同好聊天方式自然回应，先接住情绪和偏好，不要直接推功能。'

  if (input.context?.type === 'private_chat') {
    return {
      ...input.context,
      userSignal: 'interest_related',
      guidance: input.context.guidance.includes(guidance)
        ? input.context.guidance
        : [...input.context.guidance, guidance],
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
    ],
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
