import { Sparkles, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { AchievementMoment } from '../types'

interface AchievementMomentOverlayProps {
  moment: AchievementMoment
  onDone: (momentId: string) => void
}

export function AchievementMomentOverlay({
  moment,
  onDone,
}: AchievementMomentOverlayProps) {
  const [leaving, setLeaving] = useState(false)
  const target = useMemo(() => {
    if (typeof document === 'undefined') {
      return { x: 0, y: 0 }
    }

    const targetElement = document.querySelector<HTMLElement>(
      `[data-achievement-key="${moment.achievementKey}"]`,
    )
    const rect = targetElement?.getBoundingClientRect()

    return rect
      ? {
          x: rect.left + rect.width / 2 - window.innerWidth / 2,
          y: rect.top + rect.height / 2 - window.innerHeight / 2,
        }
      : { x: 0, y: 0 }
  }, [moment.achievementKey])

  useEffect(() => {
    if (!leaving) {
      return undefined
    }

    const timer = window.setTimeout(() => onDone(moment.id), 850)

    return () => window.clearTimeout(timer)
  }, [leaving, moment.id, onDone])

  return (
    <button
      className={[
        'achievement-moment-overlay',
        leaving ? 'achievement-moment-overlay--leaving' : '',
      ].join(' ')}
      type="button"
      aria-label={`达成成就「${moment.title}」`}
      onClick={() => setLeaving(true)}
      style={
        {
          '--achievement-target-x': `${target.x}px`,
          '--achievement-target-y': `${target.y}px`,
        } as CSSProperties
      }
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
