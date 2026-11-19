"use client"

import { useState } from "react"
import { Check, X, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp } from "lucide-react"
import { ScoreBadge } from "./ScoreBadge"
import { EvidenceCard } from "./EvidenceCard"
import { Button } from "./Button"
import { type Candidate } from "@/data/demo"

const REASON_OPTIONS = [
  "Strong track record",
  "Unusual / interesting background",
  "Great short answers",
  "Data and analytical depth",
  "Built things that lasted",
  "Startup experience",
]

interface CandidateCardProps {
  candidate: Candidate
  score: number
  rank: number
  showNames: boolean
  onShortlist: () => void
  onNotNow: () => void
  onNudge: (dir: "more" | "less", reason: string) => void
}

export function CandidateCard({
  candidate,
  score,
  rank,
  showNames,
  onShortlist,
  onNotNow,
  onNudge,
}: CandidateCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [nudgeMode, setNudgeMode] = useState<"more" | "less" | null>(null)
  const [selectedReason, setSelectedReason] = useState("")

  const displayName = showNames ? candidate.name : candidate.initials
  const hasProof = candidate.evidence.some((e) => e.source === "proof_answer")

  const confirmNudge = () => {
    if (!nudgeMode) return
    onNudge(nudgeMode, selectedReason || "No reason given")
    setNudgeMode(null)
    setSelectedReason("")
  }

  const cancelNudge = () => {
    setNudgeMode(null)
    setSelectedReason("")
  }

  return (
    <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Rank + Score */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
            <span className="text-xs font-medium text-muted tabular-nums">#{rank}</span>
            <ScoreBadge score={score} size="md" />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-text">{displayName}</h3>
                  {hasProof && (
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-accent-light text-accent border border-accent/20">
                      Answered questions
                    </span>
                  )}
                  {!hasProof && (
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                      Resume only
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted mt-0.5">{candidate.headline}</p>
              </div>
              <button
                onClick={() => setExpanded((e) => !e)}
                className="flex-shrink-0 text-muted hover:text-text transition-colors p-1 cursor-pointer"
                aria-label={expanded ? "Collapse" : "Expand"}
              >
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            {/* Summary */}
            <p className="text-sm text-text/80 mt-2 leading-relaxed">{candidate.summary}</p>

            {/* Why surfaced chips */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {candidate.whySurfaced.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full text-xs font-medium bg-bg border border-border text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Top 2 evidence cards */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              {candidate.evidence.slice(0, 2).map((ev) => (
                <EvidenceCard
                  key={ev.id}
                  source={ev.source}
                  quote={ev.quote}
                  masked={!showNames}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Expanded: remaining evidence */}
        {expanded && candidate.evidence.length > 2 && (
          <div className="mt-3 ml-16 grid grid-cols-2 gap-2">
            {candidate.evidence.slice(2).map((ev) => (
              <EvidenceCard
                key={ev.id}
                source={ev.source}
                quote={ev.quote}
                masked={!showNames}
              />
            ))}
          </div>
        )}

        {/* Nudge reason picker */}
        {nudgeMode && (
          <div className="mt-4 ml-16 p-3.5 rounded-xl bg-bg border border-border">
            <p className="text-xs font-medium text-muted mb-2.5">
              {nudgeMode === "more"
                ? "What stood out? (optional)"
                : "What's the concern? (optional)"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {REASON_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedReason(selectedReason === r ? "" : r)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
                    selectedReason === r
                      ? "bg-accent text-white border-accent"
                      : "bg-surface border-border text-muted hover:border-accent/40 hover:text-text"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="primary" onClick={confirmNudge}>
                Confirm
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelNudge}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Action row */}
        {!nudgeMode && (
          <div className="flex items-center gap-2 mt-4 ml-16">
            <Button size="sm" variant="primary" onClick={onShortlist}>
              <Check size={13} />
              Shortlist
            </Button>
            <Button size="sm" variant="secondary" onClick={onNotNow}>
              <X size={13} />
              Pass
            </Button>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setNudgeMode("more")}
              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            >
              <ThumbsUp size={13} />
              More like this
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setNudgeMode("less")}
              className="text-slate-500 hover:text-slate-700"
            >
              <ThumbsDown size={13} />
              Less like this
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
