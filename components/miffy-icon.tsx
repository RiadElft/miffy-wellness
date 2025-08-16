export function MiffyIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <div className={`${className} relative`}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Miffy's head */}
        <ellipse cx="50" cy="55" rx="25" ry="30" fill="currentColor" className="text-primary" />

        {/* Ears */}
        <ellipse cx="35" cy="25" rx="8" ry="20" fill="currentColor" className="text-primary" />
        <ellipse cx="65" cy="25" rx="8" ry="20" fill="currentColor" className="text-primary" />

        {/* Inner ears */}
        <ellipse cx="35" cy="25" rx="3" ry="12" fill="currentColor" className="text-accent" />
        <ellipse cx="65" cy="25" rx="3" ry="12" fill="currentColor" className="text-accent" />

        {/* Eyes */}
        <circle cx="42" cy="48" r="2" fill="currentColor" className="text-foreground" />
        <circle cx="58" cy="48" r="2" fill="currentColor" className="text-foreground" />

        {/* Mouth */}
        <path
          d="M 50 58 Q 45 62 40 58"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          className="text-foreground"
        />
        <path
          d="M 50 58 Q 55 62 60 58"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          className="text-foreground"
        />
      </svg>
    </div>
  )
}
