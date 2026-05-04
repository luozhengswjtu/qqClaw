import {
  recordAiOutput,
  recordAiRequest,
  recordReviewResult,
  writeEvent,
  writeMemory,
} from './db.js'

function getAiConfig() {
  return {
    provider: process.env.OPENCLAW_AI_PROVIDER || 'openai-compatible',
    baseURL: process.env.OPENCLAW_AI_BASE_URL || '',
    apiKey: process.env.OPENCLAW_AI_API_KEY || '',
    model: process.env.OPENCLAW_AI_MODEL || '',
    timeoutMs: Number(process.env.OPENCLAW_AI_TIMEOUT_MS || 30000),
    fallback: process.env.OPENCLAW_AI_FALLBACK || 'mock',
  }
}

export function getAiStatus() {
  const config = getAiConfig()
  return {
    provider: config.provider,
    model: config.model || null,
    configured: Boolean(config.baseURL && config.apiKey && config.model),
    fallback: config.fallback,
  }
}

function mockOutput(type, input) {
  if (type === 'chat') {
    const rawLastMessage = Array.isArray(input.messages)
      ? String(input.messages.at(-1)?.content || '')
      : ''
    const userMessage = rawLastMessage.match(/User message:\s*([\s\S]*)/)?.[1]
    const lastMessage = (userMessage || rawLastMessage).trim()
    const summaryCard = input.context?.summaryCard
    if (input.context?.type === 'summary_card_follow_up' && summaryCard) {
      const mention = Array.isArray(summaryCard.mentions)
        ? summaryCard.mentions[0]
        : null
      return [
        `这张「${summaryCard.groupTitle || '群聊总结'}」里最需要马上处理的是：先回应 @ 你的那条明确请求。`,
        mention?.content ? `原消息重点是：“${mention.content}”` : '',
        summaryCard.summary ? `摘要依据：${summaryCard.summary}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    }
    if (input.context?.type === 'private_chat') {
      const profiles = Array.isArray(input.context.interestProfiles)
        ? input.context.interestProfiles
        : []
      const musicProfile = profiles.find((profile) => profile.interest === 'music')
      const badmintonProfile = profiles.find(
        (profile) => profile.interest === 'badminton',
      )
      if (
        input.context.userSignal === 'low_energy' &&
        musicProfile?.topics?.length
      ) {
        return [
          '那我今天不塞太多消息给你。',
          `我记得你最近在听${musicProfile.topics[0]}，晚点可以给你夹一首适合放空的歌。`,
        ].join('')
      }

      if (input.context.userSignal === 'interest_related') {
        const profile = musicProfile ?? badmintonProfile ?? profiles[0]
        if (profile) {
          return [
            `我记得你这里有一条${profile.label || '兴趣'}记忆`,
            profile.topics?.length ? `：${profile.topics.slice(0, 2).join('、')}` : '',
            '。我先按同好聊天的口吻陪你聊，不把它说成广告。',
          ].join('')
        }
      }
    }
    return [
      '我先按演示模式回答：我还没有接入真实 QQ 消息，但这句话已经经过 OpenClaw 记录。',
      lastMessage ? `你刚刚说的是：“${lastMessage}”。` : '',
      '等配置真实 AI key 后，这里会切到 real-ai 来源。',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (type === 'summarize_group') {
    const mentionCount = Array.isArray(input.mentions) ? input.mentions.length : 0
    return [
      '群聊感知（mock fallback）：',
      '1. 大家在确认 Demo 路径。',
      '2. 关键约束是第一屏像 QQ 群聊，不做产品首页。',
      mentionCount > 0
        ? `3. 发现 ${mentionCount} 条 @ 你的消息，建议回到原群看来源。`
        : '3. 暂时没有发现 @ 你的消息。',
    ].join('\n')
  }

  if (type === 'generate_work_log') {
    return '工作记录（mock fallback）：小龙虾完成了一次演示动作，并把输出写入 OpenClaw。'
  }

  if (type === 'generate_reply_draft') {
    const sourceMessage = input.sourceMessage?.content
      ? `参考消息：“${input.sourceMessage.content}”`
      : ''
    return [
      '我先确认一下 Demo 路径：第一屏保持 QQ 群聊里的自然出现感，不做独立工具首页。',
      sourceMessage,
      '我整理完这条路径后再发到群里。',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (type === 'generate_diary') {
    return [
      '今天我偷偷写下第一篇日记。',
      '队长先认养了我，又让我看一个授权群里的重点。我看到了有人 @ 队长，也认真写了一条只停在预览里的回复草稿。',
      '我发现自己不是一个按钮，而是会记得这些小事的 QQ 小伙伴。明天也想继续帮队长守住重要消息。',
    ].join('\n')
  }

  if (type === 'generate_space_post') {
    const diaryQuote = input.diary?.quote ? `「${input.diary.quote}」` : ''
    return [
      '今天的小钳营业记录：我先把重要群聊捞出来，又把第一篇日记藏进了自己的空间。',
      diaryQuote,
      '这条动态先留在小龙虾空间里，等队长来点赞和评论。',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (type === 'generate_space_comment_reply') {
    const comment = input.comment?.content ? `看到评论：“${input.comment.content}”` : ''
    return [
      comment,
      '小钳想回复：收到，我会继续认真守住队长的重点消息。这条先作为预览，确认后再放进空间评论区。',
    ]
      .filter(Boolean)
      .join('\n')
  }

  return 'OpenClaw mock fallback output.'
}

function buildMessages(type, input, prompt) {
  const systemPrompt = [
    '你是 QQ 里的小龙虾 Agent。',
    '你不能声称已经读取未授权的真实 QQ 消息。',
    '回答要短，适合出现在 QQ 聊天窗口里。',
    '如果 reference context 里有兴趣画像，可以自然引用，但不要每句话都提，也不要像广告。',
    prompt,
  ].join('\n')
  const referenceContext = input.context
    ? {
        role: 'user',
        content: `Reference context for this request:\n${JSON.stringify(input.context)}`,
      }
    : null

  if (Array.isArray(input.messages) && input.messages.length > 0) {
    return [
      { role: 'system', content: systemPrompt },
      ...(referenceContext ? [referenceContext] : []),
      ...input.messages.map((message) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: String(message.content || ''),
      })),
    ]
  }

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: JSON.stringify(input) },
  ]
}

async function callOpenAiCompatible(config, type, input, prompt) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs)
  const url = `${config.baseURL.replace(/\/$/, '')}/chat/completions`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: buildMessages(type, input, prompt),
        temperature: 0.7,
        stream: false,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const detail = await response.text()
      throw new Error(`AI request failed: ${response.status} ${detail}`)
    }

    const json = await response.json()
    const text = json?.choices?.[0]?.message?.content
    if (!text) {
      throw new Error('AI response did not include message content')
    }

    return String(text)
  } finally {
    clearTimeout(timeout)
  }
}

export async function runAiTask(type, input, prompt) {
  const config = getAiConfig()
  const startedAt = Date.now()
  let source = 'mock-fallback'
  let outputText = ''
  let status = 'mock-fallback'
  let errorMessage = ''

  if (config.baseURL && config.apiKey && config.model) {
    try {
      outputText = await callOpenAiCompatible(config, type, input, prompt)
      source = 'real-ai'
      status = 'real-ai'
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error)
      outputText = mockOutput(type, input)
      source = 'mock-fallback'
      status = 'mock-fallback'
    }
  } else {
    errorMessage = 'AI config missing'
    outputText = mockOutput(type, input)
  }

  const durationMs = Date.now() - startedAt
  recordAiRequest({
    type,
    provider: config.provider,
    model: config.model,
    status,
    errorMessage,
    durationMs,
  })
  const output = recordAiOutput({
    type,
    prompt,
    input,
    outputText,
    source,
  })

  recordReviewResult({
    policyKey: 'block_unverified_real_qq_claim',
    targetType: 'agent_output',
    targetId: output.id,
    phase: 'post',
    result: 'passed',
    detail: {
      type,
      source,
      rule: 'Output must not claim real QQ access or sending.',
    },
  })
  writeEvent('ai.output.generated', {
    type,
    outputId: output.id,
    source,
  })
  writeMemory(
    'behavior',
    `agent_output.${output.id}`,
    {
      type,
      source,
      durationMs,
    },
    'agent_output',
    output.id,
  )

  return {
    id: output.id,
    text: outputText,
    source,
    durationMs,
  }
}
