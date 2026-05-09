import { useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { QQMainView } from './views/QQMainView'
import { useLobsterStore } from './store/useLobsterStore'
import { openclawClient } from './api/openclawClient'

function App() {
  const [resetting, setResetting] = useState(false)
  const hydrateFromOpenClaw = useLobsterStore(
    (state) => state.hydrateFromOpenClaw,
  )

  useEffect(() => {
    hydrateFromOpenClaw()
  }, [hydrateFromOpenClaw])

  async function handleResetDemoState() {
    if (resetting) {
      return
    }

    const confirmed = window.confirm(
      '确定要初始化状态吗？当前领养、聊天、日记、空间和打卡进度都会恢复到第一次打开的状态。',
    )
    if (!confirmed) {
      return
    }

    setResetting(true)
    try {
      await openclawClient.resetDemoState()
      window.localStorage.removeItem('qqclaw.seenAchievementMomentIds.v1')
      window.location.reload()
    } catch {
      setResetting(false)
      window.alert('初始化失败，请确认 OpenClaw API 正在运行。')
    }
  }

  return (
    <>
      <QQMainView />
      <button
        className="fixed bottom-4 right-4 z-[60] inline-flex items-center gap-2 rounded-lg bg-white/95 px-3 py-2 text-xs font-semibold text-ink-600 shadow-panel ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-ink-300"
        type="button"
        disabled={resetting}
        onClick={handleResetDemoState}
      >
        <RotateCcw className="h-3.5 w-3.5" />
        {resetting ? '初始化中...' : '初始化状态'}
      </button>
    </>
  )
}

export default App
