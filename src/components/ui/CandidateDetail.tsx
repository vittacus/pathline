"use client"

import { useState } from "react"
import { Check, X, ThumbsUp, ThumbsDown, FileText } from "lucide-react"
import { EvidenceCard } from "./EvidenceCard"
import { ScoreBadge } from "./ScoreBadge"
import { Button } from "./Button"
import { type Candidate, type Trait, APPLIED_VIA_LOOKUP, DEMO_CANDIDATE_IDS } from "@/data/demo"
import { useDemo } from "@/context/DemoContext"

const MORE_REASONS = [
  "Strong track record",
  "Unusual / interesting background",
  "Great short answers",
  "Data and analytical depth",
  "Built things that lasted",
  "Startup experience",
]

const LESS_REASONS = [
  "Not enough ops depth",
  "Evidence too thin",
  "Too senior or too junior",
  "Missing data skills",
  "Other",
]

interface CandidateDetailProps {
  candidate: Candidate
  score: number
  traits: Trait[]
  showNames: boolean
  onShortlist: () => void
  onNotNow: () => void
  onNudge: (dir: "more" | "less", reason: string) => void
}

export function CandidateDetail({
  candidate,
  score,
  traits,
  showNames,
  onShortlist,
  onNotNow,
  onNudge,
}: CandidateDetailProps) {
  const [nudgeMode, setNudgeMode] = useState<"more" | "less" | null>(null)
  const [selectedReason, setSelectedReason] = useState("")
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false)
  const { resumeUrls } = useDemo()

  const displayName = showNames ? candidate.name : candidate.initials
  const hasProof = candidate.evidence.some((e) => e.source === "proof_answer")
  const isDemoCandidate = DEMO_CANDIDATE_IDS.has(candidate.id)
  const appliedVia = isDemoCandidate
    ? (APPLIED_VIA_LOOKUP[candidate.id] ?? "LinkedIn")
    : "Imported (Greenhouse)"
  const isImported = !isDemoCandidate || appliedVia === "Imported"
  const resumeUrl = resumeUrls[candidate.id]

  const reasons = nudgeMode === "more" ? MORE_REASONS : LESS_REASONS

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
    <div className="flex flex-col h-full">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-5">
          <ScoreBadge score={score} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <h2 className="text-xl font-semibold text-text">{displayName}</h2>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                  hasProof && !isImported
                    ? "bg-accent-light text-accent border-accent/20"
                    : "bg-slate-100 text-slate-500 border-slate-200"
                }`}
              >
                {hasProof && !isImported ? "Answered questions" : "Resume only"}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs text-muted border border-border bg-bg">
                {isDemoCandidate ? `via ${appliedVia}` : "Imported (Greenhouse)"}
              </span>
            </div>
            <p className="text-sm text-muted">{candidate.headline}</p>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-5">
          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Summary</p>
          <p className="text-sm text-text leading-relaxed">{candidate.summary}</p>
        </div>

        {/* Why ranked here + score breakdown */}
        <div className="mb-5">
          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
            Why ranked here
          </p>
          <p className="text-sm text-text leading-relaxed mb-2">
            {candidate.whySurfaced.length >= 2
              ? `${candidate.whySurfaced[0]}, with ${candidate.whySurfaced[1]}.`
              : candidate.whySurfaced.length === 1
              ? `${candidate.whySurfaced[0]}.`
              : ""}
          </p>
          <button
            onClick={() => setShowScoreBreakdown((v) => !v)}
            className="text-xs font-medium text-accent hover:text-accent-hover transition-colors cursor-pointer"
          >
            {showScoreBreakdown ? "Hide score breakdown" : "Show score breakdown"}
          </button>
          {/* Score breakdown (collapsed by default) */}
          {showScoreBreakdown && (() => {
            const totalWeight = traits.reduce((s, t) => s + t.numericWeight, 0)
            const breakdown = traits
              .map((t) => ({
                label: t.label,
                contribution: Math.round((t.numericWeight / totalWeight) * (candidate.traitVector[t.id] ?? 0)),
              }))
              .filter((item) => item.contribution > 0)
              .sort((a, b) => b.contribution - a.contribution)
            if (breakdown.length === 0) return null
            const maxContribution = breakdown[0].contribution
            return (
              <div className="flex flex-col gap-1.5 mt-3">
                {breakdown.map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className="text-xs text-muted w-32 flex-shrink-0 truncate" title={item.label}>
                      {item.label.length > 20 ? item.label.slice(0, 20) + "…" : item.label}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-bg border border-border overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent/60"
                        style={{ width: `${(item.contribution / maxContribution) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-accent font-medium w-8 text-right flex-shrink-0">
                      +{item.contribution}
                    </span>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>

        {/* Evidence */}
        <div>
          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Evidence</p>
          <div className="flex flex-col gap-2">
            {candidate.evidence.map((ev) => {
              const matchingTrait = traits.find((t) => t.id === ev.traitId)
              return (
                <EvidenceCard
                  key={ev.id}
                  source={ev.source}
                  quote={ev.quote}
                  masked={!showNames}
                  traitLabel={matchingTrait?.label}
                />
              )
            })}
          </div>
        </div>

        {/* Resume */}
        <div className="mt-5">
          {resumeUrl ? (
            <a
              href={resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-bg hover:bg-accent-light hover:border-accent/30 transition-colors text-sm font-medium text-text"
            >
              <FileText size={14} className="text-accent flex-shrink-0" />
              View original resume
            </a>
          ) : (
            <p className="text-xs text-muted italic">Resume not available in sample data</p>
          )}
        </div>
      </div>

      {/* Pinned action footer */}
      <div className="flex-shrink-0 border-t border-border bg-surface p-4">
        {nudgeMode ? (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium text-muted">
              {nudgeMode === "more" ? "What stood out?" : "What's the concern?"}{" "}
              <span className="font-normal">(optional)</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {reasons.map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedReason(selectedReason === r ? "" : r)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                    selectedReason === r
                      ? "bg-accent text-white border-accent"
                      : "bg-surface border-border text-muted hover:border-accent/40 hover:text-text"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={confirmNudge} className="flex-1 justify-center">
                Confirm
              </Button>
              <Button variant="ghost" size="sm" onClick={cancelNudge} className="flex-1 justify-center">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Primary actions */}
            <div className="flex gap-2">
              <button
                onClick={onShortlist}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover transition-colors cursor-pointer active:scale-[0.98]"
              >
                <Check size={16} />
                Shortlist
              </button>
              <button
                onClick={onNotNow}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-surface border border-border text-text text-sm font-semibold hover:bg-bg transition-colors cursor-pointer active:scale-[0.98]"
              >
                <X size={16} />
                Pass
              </button>
            </div>
            {/* Learning actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setNudgeMode("more")}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                <ThumbsUp size={14} />
                More like this
              </button>
              <button
                onClick={() => setNudgeMode("less")}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-border bg-bg text-muted text-sm font-medium hover:bg-border/50 hover:text-text transition-colors cursor-pointer"
              >
                <ThumbsDown size={14} />
                Less like this
              </button>
            </div>
            {/* Keyboard hint */}
            <p className="text-center text-xs text-muted mt-0.5">
              <kbd className="px-1 py-0.5 rounded bg-bg border border-border font-mono text-xs">S</kbd> shortlist ·{" "}
              <kbd className="px-1 py-0.5 rounded bg-bg border border-border font-mono text-xs">P</kbd> pass ·{" "}
              <kbd className="px-1 py-0.5 rounded bg-bg border border-border font-mono text-xs">↑↓</kbd> navigate
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
