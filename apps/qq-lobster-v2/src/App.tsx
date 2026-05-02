import { useEffect } from 'react'
import { QQMainView } from './views/QQMainView'
import { useLobsterStore } from './store/useLobsterStore'

function App() {
  const hydrateFromOpenClaw = useLobsterStore(
    (state) => state.hydrateFromOpenClaw,
  )

  useEffect(() => {
    hydrateFromOpenClaw()
  }, [hydrateFromOpenClaw])

  return <QQMainView />
}

export default App
