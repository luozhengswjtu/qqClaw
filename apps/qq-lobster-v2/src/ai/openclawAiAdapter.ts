import { openclawClient } from '../api/openclawClient'
import type { LobsterProfile } from '../types'
import { mockAiAdapter, type AdoptionInput } from './mockAiAdapter'

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
  }) {
    try {
      return await openclawClient.chat([
        {
          role: 'user',
          content: `Lobster profile: ${JSON.stringify(input.lobsterProfile)}\nUser message: ${input.content}`,
        },
      ])
    } catch {
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
  }) {
    const output = await this.chatWithLobster(input)
    const chunks = output.text.match(/.{1,9}/gs) ?? [output.text]

    for (const chunk of chunks) {
      await new Promise((resolve) => window.setTimeout(resolve, 28))
      yield {
        type: 'chunk' as const,
        text: chunk,
        source: output.source,
        outputId: output.id,
      }
    }

    yield {
      type: 'done' as const,
      source: output.source,
      outputId: output.id,
    }
  },
}
