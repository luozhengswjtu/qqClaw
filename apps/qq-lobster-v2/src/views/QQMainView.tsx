import { AdoptionFlow } from '../components/AdoptionFlow'
import { LobsterChatView } from '../components/LobsterChatView'
import { QQShell } from '../components/QQShell'
import { useLobsterStore } from '../store/useLobsterStore'

export function QQMainView() {
  const appView = useLobsterStore((state) => state.appView)

  return (
    <>
      {appView === 'lobster_chat' || appView === 'lobster_space' ? (
        <LobsterChatView />
      ) : (
        <QQShell />
      )}
      {appView === 'adoption' ? <AdoptionFlow /> : null}
    </>
  )
}
