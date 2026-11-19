"use client"

interface ScoreBadgeProps {
  score: number
  size?: "sm" | "md" | "lg"
}

function scoreColor(score: number): string {
  if (score >= 75) return "text-score-high"
  if (score >= 50) return "text-score-mid"
  return "text-score-low"
}

function scoreBg(score: number): string {
  if (score >= 75) return "bg-emerald-50 border-emerald-200"
  if (score >= 50) return "bg-amber-50 border-amber-200"
  return "bg-slate-50 border-slate-200"
}

const sizeClasses = {
  sm: "w-10 h-10 text-sm",
  md: "w-14 h-14 text-lg",
  lg: "w-16 h-16 text-xl",
}

export function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  return (
    <div
      className={`flex-shrink-0 flex items-center justify-center rounded-full border-2 font-semibold tabular-nums ${sizeClasses[size]} ${scoreColor(score)} ${scoreBg(score)}`}
    >
      {score}
    </div>
  )
}
