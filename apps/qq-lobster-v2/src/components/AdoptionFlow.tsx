import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronLeft, Heart, Sparkles, X } from 'lucide-react'
import { openclawAiAdapter } from '../ai/openclawAiAdapter'
import { interestOptions, personalityOptions } from '../data/mockData'
import { useLobsterStore } from '../store/useLobsterStore'
import type { Interest } from '../types'
import { LobsterAvatar } from './LobsterAvatar'

type AdoptionStep = 'hello' | 'profile' | 'personality' | 'done'

const interestAbilityCopy: Partial<Record<Interest, string>> = {
  music: '之后可以让小龙虾关注歌手、新歌和演出提醒。',
  badminton: '之后可以让小龙虾留意公开同好群和活动信息。',
  custom: '之后可以在聊天里告诉小龙虾更具体的偏好。',
}

export function AdoptionFlow() {
  const [step, setStep] = useState<AdoptionStep>('hello')
  const [doneMessage, setDoneMessage] = useState('')
  const adoptionDraft = useLobsterStore((state) => state.adoptionDraft)
  const closeAdoption = useLobsterStore((state) => state.closeAdoption)
  const updateAdoptionDraft = useLobsterStore(
    (state) => state.updateAdoptionDraft,
  )
  const toggleInterest = useLobsterStore((state) => state.toggleInterest)
  const completeAdoption = useLobsterStore((state) => state.completeAdoption)

  const selectedPersonality = useMemo(
    () =>
      personalityOptions.find((item) => item.id === adoptionDraft.personality) ??
      personalityOptions[0],
    [adoptionDraft.personality],
  )

  useEffect(() => {
    if (step !== 'done') {
      return
    }

    let mounted = true
    void openclawAiAdapter
      .createAdoptionGreeting({
        lobsterName: adoptionDraft.lobsterName.trim() || '小钳',
        userCallsign: adoptionDraft.userCallsign.trim() || '队长',
        personality: adoptionDraft.personality,
        interests: adoptionDraft.interests,
      })
      .then((message) => {
        if (mounted) {
          setDoneMessage(message)
        }
      })

    return () => {
      mounted = false
    }
  }, [adoptionDraft, step])

  function finishAdoption() {
    completeAdoption()
    setStep('done')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm">
      <section className="w-full max-w-[620px] overflow-hidden rounded-lg border border-white/70 bg-white shadow-panel">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <LobsterAvatar size="sm" mood="curious" animated />
            <div>
              <p className="text-sm font-semibold text-ink-900">小龙虾认养</p>
              <p className="text-xs text-ink-500">QQ 里的新伙伴</p>
            </div>
          </div>
          <button
            className="grid h-9 w-9 place-items-center rounded-lg text-ink-500 transition hover:bg-slate-100 hover:text-ink-900"
            type="button"
            onClick={closeAdoption}
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-[420px] px-6 py-6">
          {step === 'hello' ? (
            <div className="grid gap-6 rounded-lg bg-white md:grid-cols-[140px_1fr] md:items-center">
              <div className="mx-auto rounded-lg bg-white p-5 ring-1 ring-slate-100">
                <LobsterAvatar size="lg" mood="curious" animated />
              </div>
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-xl font-semibold text-ink-900">
                    你好，我是刚从 QQ 里探头的小龙虾。
                  </p>
                  <p className="text-sm leading-6 text-ink-500">
                    我现在还不会看你的群消息，也没有开始工作。先把我认养下来，之后再由你一步步授权我能做什么。
                  </p>
                </div>
                <button
                  className="inline-flex items-center gap-2 rounded-lg bg-lobster-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lift transition hover:bg-lobster-600"
                  type="button"
                  onClick={() => setStep('profile')}
                >
                  <Heart className="h-4 w-4" />
                  开始认养
                </button>
              </div>
            </div>
          ) : null}

          {step === 'profile' ? (
            <div className="space-y-6">
              <div>
                <p className="text-lg font-semibold text-ink-900">先定个称呼</p>
                <p className="mt-1 text-sm text-ink-500">
                  这些会写入本地状态，后续能力按阶段接入。
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-ink-700">
                  小龙虾名字
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-qq-500 focus:ring-4 focus:ring-qq-100"
                    value={adoptionDraft.lobsterName}
                    maxLength={8}
                    onChange={(event) =>
                      updateAdoptionDraft({
                        lobsterName: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-ink-700">
                  它怎么叫你
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-qq-500 focus:ring-4 focus:ring-qq-100"
                    value={adoptionDraft.userCallsign}
                    maxLength={8}
                    onChange={(event) =>
                      updateAdoptionDraft({
                        userCallsign: event.target.value,
                      })
                    }
                  />
                </label>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-500 transition hover:bg-slate-100 hover:text-ink-900"
                  type="button"
                  onClick={() => setStep('hello')}
                >
                  <ChevronLeft className="h-4 w-4" />
                  返回
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-lg bg-qq-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-qq-600"
                  type="button"
                  onClick={() => setStep('personality')}
                >
                  下一步
                  <Sparkles className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}

          {step === 'personality' ? (
            <div className="space-y-5">
              <div>
                <p className="text-lg font-semibold text-ink-900">
                  选择初始性格和兴趣
                </p>
                <p className="mt-1 text-sm text-ink-500">
                  第一阶段先保存偏好，完整互动在后续阶段展开。
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {personalityOptions.map((option) => {
                  const selected = option.id === adoptionDraft.personality
                  return (
                    <button
                      className={[
                        'rounded-lg border px-3 py-3 text-left transition',
                        selected
                          ? 'border-lobster-400 bg-lobster-50 text-lobster-600'
                          : 'border-slate-200 bg-white text-ink-700 hover:border-qq-200 hover:bg-qq-50',
                      ].join(' ')}
                      type="button"
                      key={option.id}
                      onClick={() =>
                        updateAdoptionDraft({ personality: option.id })
                      }
                    >
                      <span className="flex items-center justify-between gap-3 text-sm font-semibold">
                        {option.label}
                        {selected ? <Check className="h-4 w-4" /> : null}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-ink-500">
                        {option.sample}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-ink-700">兴趣</p>
                <div className="flex flex-wrap gap-2">
                  {interestOptions.map((option) => {
                    const selected = adoptionDraft.interests.includes(option.id)
                    return (
                      <button
                        className={[
                          'rounded-lg border px-3 py-2 text-sm transition',
                          selected
                            ? 'border-qq-500 bg-qq-50 text-qq-700'
                            : 'border-slate-200 bg-white text-ink-500 hover:border-qq-200 hover:text-qq-700',
                        ].join(' ')}
                        type="button"
                        key={option.id}
                        onClick={() => toggleInterest(option.id)}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
                {adoptionDraft.interests.length > 0 ? (
                  <div className="space-y-1 rounded-lg bg-qq-50 px-3 py-3">
                    {adoptionDraft.interests.map((interest) => {
                      const copy = interestAbilityCopy[interest]
                      if (!copy) {
                        return null
                      }

                      return (
                        <p
                          className="text-xs leading-5 text-qq-700"
                          key={interest}
                        >
                          {copy}
                        </p>
                      )
                    })}
                  </div>
                ) : null}
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-ink-900">
                  {selectedPersonality.label}
                </p>
                <p className="mt-1 text-sm text-ink-500">
                  {selectedPersonality.sample}
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-500 transition hover:bg-slate-100 hover:text-ink-900"
                  type="button"
                  onClick={() => setStep('profile')}
                >
                  <ChevronLeft className="h-4 w-4" />
                  返回
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-lg bg-lobster-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lift transition hover:bg-lobster-600"
                  type="button"
                  onClick={finishAdoption}
                >
                  <Check className="h-4 w-4" />
                  完成认养
                </button>
              </div>
            </div>
          ) : null}

          {step === 'done' ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
              <div className="rounded-lg bg-lobster-50 p-5">
                <LobsterAvatar size="lg" mood="happy" animated />
              </div>
              <p className="mt-5 text-xl font-semibold text-ink-900">
                {adoptionDraft.lobsterName || '小钳'}已经住进 QQ
              </p>
              <p className="mt-3 max-w-[420px] text-sm leading-6 text-ink-500">
                {doneMessage || '认养完成。'}
              </p>
              <button
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-qq-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-qq-600"
                type="button"
                onClick={closeAdoption}
              >
                去小龙虾聊天
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
