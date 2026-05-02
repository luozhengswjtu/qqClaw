import type { Interest, Personality } from '../types'

export interface AdoptionInput {
  lobsterName: string
  userCallsign: string
  personality: Personality
  interests: Interest[]
}

export const mockAiAdapter = {
  async getFirstEncounterHint() {
    return '我还没有开始帮你看消息。要不要先认识一下，把我养在 QQ 里？'
  },

  async createAdoptionGreeting(input: AdoptionInput) {
    return `${input.userCallsign}，${input.lobsterName}记住啦。现在我只是住进 QQ，还没有看任何群消息；等你之后授权，我再帮你捞重点。`
  },

  async getStageHoldMessage() {
    return '我已经住进 QQ 了。现在先从打个招呼开始，后面的群消息、权限和日记会一步步解锁。'
  },
}
