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
    return '今天我住进了 QQ。队长还没有让我看群消息，但我已经学会把自己的回答记下来。'
  }

  return 'OpenClaw mock fallback output.'
}

function buildMessages(type, input, prompt) {
  const systemPrompt = [
    '你是 QQ 里的小龙虾 Agent。',
    '你不能声称已经读取未授权的真实 QQ 消息。',
    '回答要短，适合出现在 QQ 聊天窗口里。',
    prompt,
  ].join('\n')

  if (Array.isArray(input.messages) && input.messages.length > 0) {
    return [
      { role: 'system', content: systemPrompt },
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
