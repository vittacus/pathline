"use client"

import { ScoreBadge } from "./ScoreBadge"
import { type Candidate, APPLIED_VIA_LOOKUP, DEMO_CANDIDATE_IDS } from "@/data/demo"

interface CandidateListRowProps {
  candidate: Candidate
  score: number
  rank: number
  isSelected: boolean
  showNames: boolean
  onClick: () => void
}

export function CandidateListRow({
  candidate,
  score,
  rank,
  isSelected,
  showNames,
  onClick,
}: CandidateListRowProps) {
  const hasProof = candidate.evidence.some((e) => e.source === "proof_answer")
  const displayName = showNames ? candidate.name : candidate.initials
  const isDemoCandidate = DEMO_CANDIDATE_IDS.has(candidate.id)
  const appliedVia = isDemoCandidate
    ? (APPLIED_VIA_LOOKUP[candidate.id] ?? "LinkedIn")
    : "Imported (Greenhouse)"
  const isImported = !isDemoCandidate || appliedVia === "Imported"

  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-border transition-colors cursor-pointer group ${
        isSelected ? "bg-accent-light" : "hover:bg-bg"
      }`}
    >
      {/* Rank */}
      <span className="text-xs text-muted tabular-nums w-5 text-right flex-shrink-0 font-medium">
        {rank}
      </span>

      {/* Score */}
      <div className="flex-shrink-0">
        <ScoreBadge score={score} size="sm" />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span
            className={`text-sm font-medium truncate ${
              isSelected ? "text-accent" : "text-text"
            }`}
          >
            {displayName}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span
              className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                hasProof && !isImported
                  ? "bg-accent-light text-accent border border-accent/20"
                  : "bg-slate-100 text-slate-500 border border-slate-200"
              }`}
            >
              {hasProof && !isImported ? "Answered questions" : "Resume only"}
            </span>
            <span className="px-1.5 py-0.5 rounded text-xs text-muted border border-border bg-bg">
              {isDemoCandidate ? `via ${appliedVia}` : "Imported (Greenhouse)"}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted truncate mb-1">{candidate.headline}</p>
        <div className="flex gap-1 flex-wrap">
          {candidate.whySurfaced.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 rounded-full text-xs bg-bg border border-border text-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </button>
  )
}
