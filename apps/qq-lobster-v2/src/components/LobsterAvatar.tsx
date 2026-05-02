interface LobsterAvatarProps {
  size?: 'sm' | 'md' | 'lg'
  mood?: 'curious' | 'happy' | 'focused'
  animated?: boolean
}

const sizeClass = {
  sm: 'h-12 w-12',
  md: 'h-20 w-20',
  lg: 'h-28 w-28',
}

export function LobsterAvatar({
  size = 'md',
  mood = 'curious',
  animated = false,
}: LobsterAvatarProps) {
  return (
    <div
      className={[
        'lobster-avatar',
        sizeClass[size],
        `lobster-${mood}`,
        animated ? 'lobster-animated' : '',
      ].join(' ')}
      aria-label="Q 版小龙虾"
      role="img"
    >
      <span className="lobster-claw lobster-claw-left" />
      <span className="lobster-claw lobster-claw-right" />
      <span className="lobster-body">
        <span className="lobster-eye lobster-eye-left" />
        <span className="lobster-eye lobster-eye-right" />
        <span className="lobster-mouth" />
      </span>
      <span className="lobster-tail" />
    </div>
  )
}
