import { randomUUID } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { Readable } from 'node:stream'
import {
  dbPath,
  recordAiRequest,
  writeEvent,
  writeMemory,
} from './db.js'

function getImageConfig() {
  return {
    provider: process.env.OPENCLAW_IMAGE_PROVIDER || 'doubao-seedream',
    baseURL:
      process.env.OPENCLAW_IMAGE_BASE_URL ||
      'https://ark.cn-beijing.volces.com/api/v3',
    apiKey: process.env.OPENCLAW_IMAGE_API_KEY || '',
    model:
      process.env.OPENCLAW_IMAGE_MODEL || 'doubao-seedream-5-0-lite',
    size: process.env.OPENCLAW_IMAGE_SIZE || '16:9',
    resolution: process.env.OPENCLAW_IMAGE_RESOLUTION || '2K',
    outputFormat: process.env.OPENCLAW_IMAGE_OUTPUT_FORMAT || '',
    timeoutMs: Number(process.env.OPENCLAW_IMAGE_TIMEOUT_MS || 180000),
    maxRetries: Number(process.env.OPENCLAW_IMAGE_MAX_RETRIES || 3),
    retryBaseDelayMs: Number(
      process.env.OPENCLAW_IMAGE_RETRY_BASE_DELAY_MS || 2000,
    ),
    retryMaxDelayMs: Number(
      process.env.OPENCLAW_IMAGE_RETRY_MAX_DELAY_MS || 20000,
    ),
    fallback: process.env.OPENCLAW_IMAGE_FALLBACK || 'mock',
    outputDir:
      process.env.OPENCLAW_IMAGE_OUTPUT_DIR ||
      join(dirname(dbPath), 'generated-images'),
    publicPath: process.env.OPENCLAW_IMAGE_PUBLIC_PATH || '/generated-images',
  }
}

export function getImageStatus() {
  const config = getImageConfig()
  return {
    provider: config.provider,
    model: config.model || null,
    configured: Boolean(config.baseURL && config.apiKey && config.model),
    fallback: config.fallback,
    size: config.size,
    resolution: config.resolution || null,
    outputFormat: config.outputFormat || null,
    maxRetries: config.maxRetries,
  }
}

const presetDiaryFallbackUrls = [
  '/diary-fallbacks/diary-fallback-01.jpg',
  '/diary-fallbacks/diary-fallback-02.jpg',
  '/diary-fallbacks/diary-fallback-03.jpg',
  '/diary-fallbacks/diary-fallback-04.jpg',
]

function pickPresetDiaryFallbackUrl() {
  const index = Math.floor(Math.random() * presetDiaryFallbackUrls.length)
  return presetDiaryFallbackUrls[index]
}

function buildDiaryImagePrompt(entry, lobster) {
  const title = String(entry?.title || 'Hidden lobster diary')
  const quote = String(entry?.quote || '')
  const achievement = String(entry?.todayAchievement || '')
  const lobsterName = String(lobster?.name || 'QQ lobster')

  return [
    'Create one polished diary card image for a QQ pet companion app.',
    `Main character: a cute chubby Q-style red lobster named ${lobsterName}, friendly, expressive, and slightly secretive.`,
    'Scene: warm desk diary moment, compact QQ Zone mood, small stickers, desk lamp glow, soft shadows.',
    'Composition: landscape cover image for a chat card, subject and props should fill the frame, no large blank paper panel and no empty text overlay area.',
    `Diary title reference: ${title}`,
    quote ? `Mood quote reference: ${quote}` : '',
    achievement ? `Achievement reference: ${achievement}` : '',
    'Style: refined mobile app illustration, cozy but not beige-only, crisp details, no readable text, no watermark.',
  ]
    .filter(Boolean)
    .join('\n')
}

function mockImageOutput(input, durationMs, errorMessage) {
  return {
    image: {
      id: `image-${Date.now()}-${randomUUID()}`,
      type: input.type,
      url: pickPresetDiaryFallbackUrl(),
      mimeType: 'image/jpeg',
      prompt: input.prompt,
      source: 'mock-fallback',
      provider: 'doubao-seedream-preset',
      model: 'pre-generated-fallback',
      createdAt: new Date().toISOString(),
      errorMessage: errorMessage || null,
    },
    source: 'mock-fallback',
    durationMs,
  }
}

function extFromContentType(contentType) {
  if (contentType.includes('image/jpeg')) {
    return '.jpg'
  }
  if (contentType.includes('image/webp')) {
    return '.webp'
  }
  return '.png'
}

async function saveBase64Image(config, b64Json, imageId) {
  const outputDir = resolve(config.outputDir)
  await mkdir(outputDir, { recursive: true })
  const buffer = Buffer.from(b64Json, 'base64')
  const filename = `${imageId}.png`
  const filePath = join(outputDir, filename)
  await writeFile(filePath, buffer)
  return {
    filePath,
    url: `${config.publicPath.replace(/\/$/, '')}/${filename}`,
    mimeType: 'image/png',
  }
}

async function downloadImage(config, imageUrl, imageId) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs)

  try {
    const response = await fetch(imageUrl, { signal: controller.signal })
    if (!response.ok || !response.body) {
      const detail = await response.text().catch(() => '')
      throw new Error(`Image download failed: ${response.status} ${detail}`)
    }

    const contentType = response.headers.get('content-type') || 'image/png'
    const extension = extFromContentType(contentType)
    const outputDir = resolve(config.outputDir)
    await mkdir(outputDir, { recursive: true })
    const filename = `${imageId}${extension}`
    const filePath = join(outputDir, filename)
    const stream = createWriteStream(filePath)
    await new Promise((resolveWrite, rejectWrite) => {
      Readable.fromWeb(response.body).pipe(stream)
      stream.on('finish', resolveWrite)
      stream.on('error', rejectWrite)
    })

    return {
      filePath,
      url: `${config.publicPath.replace(/\/$/, '')}/${filename}`,
      mimeType: contentType.split(';')[0],
    }
  } finally {
    clearTimeout(timeout)
  }
}

function pickImageData(json) {
  const data = Array.isArray(json?.data)
    ? json.data
    : Array.isArray(json?.data?.data)
      ? json.data.data
      : []
  return data[0] || null
}

function createImageRequestError(message, status, retriable) {
  const error = new Error(message)
  error.status = status
  error.retriable = retriable
  return error
}

function isRetriableStatus(status) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500
}

function isRetriableError(error) {
  if (error?.retriable === true) {
    return true
  }
  if (typeof error?.status === 'number') {
    return isRetriableStatus(error.status)
  }
  return (
    error?.name === 'AbortError' ||
    ['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'ENOTFOUND'].includes(error?.cause?.code) ||
    ['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'ENOTFOUND'].includes(error?.code)
  )
}

function getRetryDelayMs(config, attempt) {
  const exponential = config.retryBaseDelayMs * 2 ** Math.max(0, attempt - 1)
  const jitter = Math.floor(Math.random() * Math.max(250, config.retryBaseDelayMs))
  return Math.min(config.retryMaxDelayMs, exponential + jitter)
}

function wait(ms) {
  return new Promise((resolveWait) => {
    setTimeout(resolveWait, ms)
  })
}

async function callImageApi(config, input) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs)
  const url = `${config.baseURL.replace(/\/$/, '')}/images/generations`
  const body = {
    model: input.model,
    prompt: input.prompt,
    size: input.size || config.size,
    n: 1,
    stream: false,
    response_format: 'url',
    sequential_image_generation: 'disabled',
    watermark: false,
  }

  if (input.resolution || config.resolution) {
    body.resolution = input.resolution || config.resolution
  }

  if (config.outputFormat) {
    body.output_format = config.outputFormat
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!response.ok) {
      const detail = await response.text()
      throw createImageRequestError(
        `Image request failed: ${response.status} ${detail}`,
        response.status,
        isRetriableStatus(response.status),
      )
    }

    const json = await response.json()
    const imageData = pickImageData(json)
    if (!imageData) {
      throw new Error('Image response did not include data')
    }
    if (imageData.task_id && !imageData.url && !imageData.b64_json) {
      throw new Error(
        `Image task was submitted but no image URL was returned: ${imageData.task_id}`,
      )
    }

    return {
      imageData,
      model: input.model,
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function callImageApiWithRetry(config, input) {
  const maxAttempts = Math.max(1, config.maxRetries + 1)
  let lastError = null

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await callImageApi(config, input)
    } catch (error) {
      lastError = error
      if (attempt >= maxAttempts || !isRetriableError(error)) {
        throw error
      }

      const delayMs = getRetryDelayMs(config, attempt)
      writeEvent('image.retry_scheduled', {
        attempt,
        nextAttempt: attempt + 1,
        maxAttempts,
        delayMs,
        model: input.model,
        size: input.size,
        error: error instanceof Error ? error.message : String(error),
      })
      await wait(delayMs)
    }
  }

  throw lastError || new Error('Image request failed')
}

async function callImageApiWithConfiguredModels(config, input) {
  const models = String(config.model)
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean)
  const requestVariants = [
    {
      size: input.size || config.size,
      resolution: input.resolution || config.resolution,
    },
  ]

  if (config.resolution && (input.size || config.size) !== config.resolution) {
    requestVariants.push({
      size: config.resolution,
      resolution: '',
    })
  }

  let lastError = null

  for (const model of models) {
    for (const variant of requestVariants) {
      try {
        return await callImageApiWithRetry(config, {
          ...input,
          ...variant,
          model,
        })
      } catch (error) {
        lastError = error
      }
    }
  }

  throw lastError || new Error('Image model is not configured')
}

async function saveImageData(config, imageData, imageId) {
  if (imageData.b64_json) {
    return saveBase64Image(config, imageData.b64_json, imageId)
  }
  if (imageData.url) {
    return downloadImage(config, imageData.url, imageId)
  }
  throw new Error('Image response did not include url or b64_json')
}

export async function generateDiaryImage(input) {
  const config = getImageConfig()
  const prompt =
    input.prompt || buildDiaryImagePrompt(input.entry, input.lobster)
  const startedAt = Date.now()
  let status = 'mock-fallback'
  let errorMessage = ''

  if (!config.baseURL || !config.apiKey || !config.model) {
    errorMessage = 'Image config missing'
    const fallback = mockImageOutput(
      { type: 'diary_image', prompt },
      Date.now() - startedAt,
      errorMessage,
    )
    recordAiRequest({
      type: 'generate_diary_image',
      provider: config.provider,
      model: config.model,
      status,
      errorMessage,
      durationMs: fallback.durationMs,
    })
    return fallback
  }

  try {
    const { imageData, model } = await callImageApiWithConfiguredModels(config, {
      prompt,
      size: input.size,
      resolution: input.resolution,
    })
    const imageId = `image-${Date.now()}-${randomUUID()}`
    const saved = await saveImageData(config, imageData, imageId)
    const durationMs = Date.now() - startedAt
    const image = {
      id: imageId,
      type: 'diary_image',
      url: saved.url,
      filePath: saved.filePath,
      mimeType: saved.mimeType,
      prompt,
      source: 'real-ai',
      provider: config.provider,
      model,
      createdAt: new Date().toISOString(),
      errorMessage: null,
    }
    status = 'real-ai'
    recordAiRequest({
      type: 'generate_diary_image',
      provider: config.provider,
      model,
      status,
      errorMessage,
      durationMs,
    })
    writeEvent('image.generated', {
      imageId: image.id,
      type: image.type,
      source: image.source,
      provider: image.provider,
      model: image.model,
    })
    writeMemory('asset', `image.${image.id}`, image, 'image', image.id)

    return {
      image,
      source: 'real-ai',
      durationMs,
    }
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error)
    const durationMs = Date.now() - startedAt
    recordAiRequest({
      type: 'generate_diary_image',
      provider: config.provider,
      model: config.model,
      status,
      errorMessage,
      durationMs,
    })

    if (config.fallback !== 'mock') {
      throw error
    }

    return mockImageOutput({ type: 'diary_image', prompt }, durationMs, errorMessage)
  }
}

export function resolveGeneratedImagePath(pathname) {
  const config = getImageConfig()
  const publicPath = config.publicPath.replace(/\/$/, '')
  if (!pathname.startsWith(`${publicPath}/`)) {
    return null
  }

  const filename = decodeURIComponent(pathname.slice(publicPath.length + 1))
  if (!filename || filename.includes('/') || filename.includes('\\')) {
    return null
  }

  const outputDir = resolve(config.outputDir)
  const filePath = resolve(outputDir, filename)
  if (filePath !== outputDir && filePath.startsWith(`${outputDir}${sep}`)) {
    return filePath
  }
  return null
}

export function getGeneratedImageContentType(filePath) {
  const extension = extname(filePath).toLowerCase()
  if (extension === '.jpg' || extension === '.jpeg') {
    return 'image/jpeg'
  }
  if (extension === '.webp') {
    return 'image/webp'
  }
  if (extension === '.svg') {
    return 'image/svg+xml'
  }
  return 'image/png'
}
