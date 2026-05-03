import { Sparkles, Trophy } from 'lucide-react'
import { useEffect } from 'react'
import type { AchievementMoment } from '../types'

interface AchievementMomentOverlayProps {
  moment: AchievementMoment
  onDone: (momentId: string) => void
}

export function AchievementMomentOverlay({
  moment,
  onDone,
}: AchievementMomentOverlayProps) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      onDone(moment.id)
    }, 1900)

    return () => window.clearTimeout(timer)
  }, [moment.id, onDone])

  return (
    <button
      className="achievement-moment-overlay"
      type="button"
      aria-label={`达成成就「${moment.title}」`}
      onClick={() => onDone(moment.id)}
    >
      <span className="achievement-moment-card">
        <span className="achievement-moment-kicker">
          <Trophy className="h-4 w-4" />
          达成成就
        </span>
        <span className="achievement-moment-title">「{moment.title}」</span>
        <span className="achievement-moment-description">
          {moment.description}
        </span>
        <span className="achievement-moment-reward">
          <span className="achievement-moment-badge">
            <Sparkles className="h-5 w-5" />
          </span>
          {moment.reward}
        </span>
      </span>
      <span className="achievement-moment-comet" />
    </button>
  )
}
