import type {
  Achievement,
  GroupPermissionScope,
  Interest,
  LobsterProfile,
  LobsterReward,
  Personality,
  QQMessage,
  WorkLogEntry,
} from '../types'

export interface OpenClawAdoptionInput {
  lobsterName: string
  userCallsign: string
  personality: Personality
  interests: Interest[]
}

export interface OpenClawAiOutput {
  id: string
  text: string
  source: 'real-ai' | 'mock-fallback'
  durationMs: number
}

export interface OpenClawGroupSummaryOutput extends OpenClawAiOutput {
  groupId: string
  messages: QQMessage[]
  mentions: QQMessage[]
  sourceMessageIds: string[]
  readToolRunId?: string
}

export interface OpenClawReplyDraftOutput extends OpenClawAiOutput {
  groupId: string
  draft: string
  sourceMessage: QQMessage | null
  sourceMessageIds: string[]
  previewRequired: true
  toolRunId?: string
}

export interface OpenClawWorkLogOutput extends OpenClawAiOutput {
  workLogId?: string
  latestWorkLogs: WorkLogEntry[]
}

export interface OpenClawLobsterProfile extends LobsterProfile {
  adoptedAt?: string | null
  updatedAt?: string
  userId?: string
}

interface OpenClawBootstrap {
  lobster: OpenClawLobsterProfile | null
  permissions: GroupPermissionScope[]
  checkins: Array<{
    key: string
    status: 'locked' | 'active' | 'done'
  }>
  rewards: LobsterReward[]
  achievements: Achievement[]
  agent: OpenClawAgentRegistry
}

export interface OpenClawAgentRegistry {
  capabilities: Array<{
    key: string
    title: string
    enabled: boolean
    riskLevel: string
    outputType: string
  }>
  tools: Array<{
    key: string
    title: string
    riskLevel: string
    requiresConfirmation: boolean
    hasMock: boolean
  }>
  reviewPolicies: Array<{
    key: string
    phase: string
    action: string
    enabled: boolean
  }>
  memories: Array<{
    id: string
    layer: string
    key: string
  }>
}

const baseURL = import.meta.env.VITE_OPENCLAW_API_URL || '/openclaw'

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${baseURL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`OpenClaw request failed: ${response.status}`)
  }

  return (await response.json()) as T
}

export const openclawClient = {
  bootstrap() {
    return requestJson<OpenClawBootstrap>('/api/bootstrap')
  },

  saveAdoption(input: OpenClawAdoptionInput) {
    return requestJson<{
      lobster: LobsterProfile
      checkins: OpenClawBootstrap['checkins']
      rewards: LobsterReward[]
      achievements: Achievement[]
    }>('/api/adoption', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  completeCheckIn(key: string) {
    return requestJson<{
      checkins: OpenClawBootstrap['checkins']
      rewards: LobsterReward[]
      achievements: Achievement[]
    }>(`/api/checkins/${encodeURIComponent(key)}/complete`, {
      method: 'POST',
    })
  },

  chat(messages: Array<{ role: 'user' | 'assistant'; content: string }>) {
    return requestJson<OpenClawAiOutput>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    })
  },

  savePermissions(input: GroupPermissionScope) {
    return requestJson<{
      permission: GroupPermissionScope
      permissions: GroupPermissionScope[]
    }>('/api/permissions', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  summarizeGroup(groupId: string) {
    return requestJson<OpenClawGroupSummaryOutput>('/api/ai/summarize-group', {
      method: 'POST',
      body: JSON.stringify({ groupId }),
    })
  },

  replyDraft(input: { groupId: string; sourceMessageId?: string }) {
    return requestJson<OpenClawReplyDraftOutput>('/api/ai/reply-draft', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  generateWorkLog(input: {
    limit?: number
    context?: Record<string, unknown>
  } = {}) {
    return requestJson<OpenClawWorkLogOutput>('/api/ai/generate-work-log', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  agentRegistry() {
    return requestJson<OpenClawAgentRegistry>('/api/agent/registry')
  },
}
