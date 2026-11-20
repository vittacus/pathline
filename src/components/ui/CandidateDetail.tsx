"use client"

import { useState } from "react"
import { Check, X, ThumbsUp, ThumbsDown, FileText, ChevronDown } from "lucide-react"
import { EvidenceCard } from "./EvidenceCard"
import { Button } from "./Button"
import { type Candidate, type Trait, type BucketId, APPLIED_VIA_LOOKUP, DEMO_CANDIDATE_IDS } from "@/data/demo"
import { useDemo } from "@/context/DemoContext"

const BUCKET_LABELS: Record<BucketId, string> = {
  priority: "Priority",
  strong: "Strong match",
  review: "Worth reviewing",
  not_now: "Not now",
  shortlisted: "Shortlist",
}

const MOVE_TO_OPTIONS: BucketId[] = ["priority", "strong", "review", "not_now"]

function whyInBucket(bucket: BucketId, candidate: Candidate, manuallyBucketed: boolean): string {
  if (bucket === "priority") return "You flagged this candidate as a priority."
  if (bucket === "shortlisted") return "You shortlisted this candidate for an invite."
  if (bucket === "not_now") return "You passed on this candidate."
  if (bucket === "strong") {
    return manuallyBucketed
      ? "You moved this candidate to Strong match."
      : "Evidence is strong across your highest-weighted traits."
  }
  return manuallyBucketed
    ? "You moved this candidate to Worth reviewing."
    : "Mixed evidence across traits — worth a closer look before deciding."
}

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
  traits: Trait[]
  showNames: boolean
  onShortlist: () => void
  onPass: () => void
  onNudge: (dir: "more" | "less", reason: string) => void
  onMoveTo: (bucket: BucketId) => void
  onCompareWithNext?: () => void
}

export function CandidateDetail({
  candidate,
  traits,
  showNames,
  onShortlist,
  onPass,
  onNudge,
  onMoveTo,
  onCompareWithNext,
}: CandidateDetailProps) {
  const [nudgeMode, setNudgeMode] = useState<"more" | "less" | null>(null)
  const [selectedReason, setSelectedReason] = useState("")
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const { resumeUrls, getBucketOf } = useDemo()

  const bucket = getBucketOf(candidate)
  const displayName = showNames ? candidate.name : candidate.initials
  const hasProof = candidate.evidence.some((e) => e.source === "proof_answer")
  const isDemoCandidate = DEMO_CANDIDATE_IDS.has(candidate.id)
  const appliedVia = isDemoCandidate
    ? (APPLIED_VIA_LOOKUP[candidate.id] ?? "LinkedIn")
    : "Imported (Greenhouse)"
  const isImported = !isDemoCandidate
  const resumeUrl = resumeUrls[candidate.id]
  const whyText = whyInBucket(bucket, candidate, !!candidate.manuallyBucketed)

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
        {/* Header — no score badge */}
        <div className="mb-5">
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

        {/* Why in this bucket */}
        <div className="mb-5 p-3 rounded-xl bg-bg border border-border">
          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1">
            {BUCKET_LABELS[bucket]}
          </p>
          <p className="text-sm text-text">{whyText}</p>
        </div>

        {/* Summary */}
        <div className="mb-5">
          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Summary</p>
          <p className="text-sm text-text leading-relaxed">{candidate.summary}</p>
        </div>

        {/* Score breakdown (collapsed) */}
        <div className="mb-5">
          <button
            onClick={() => setShowScoreBreakdown((v) => !v)}
            className="text-xs font-medium text-accent hover:text-accent-hover transition-colors cursor-pointer"
          >
            {showScoreBreakdown ? "Hide score breakdown" : "Show score breakdown"}
          </button>
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
        <div className="mb-5">
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
        <div>
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
              {bucket !== "shortlisted" && (
                <button
                  onClick={onShortlist}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover transition-colors cursor-pointer active:scale-[0.98]"
                >
                  <Check size={15} />
                  Shortlist
                </button>
              )}
              {/* Move to dropdown */}
              <div className="relative flex-1">
                <button
                  onClick={() => setMoveOpen((v) => !v)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-surface border border-border text-text text-sm font-medium hover:bg-bg transition-colors cursor-pointer"
                >
                  Move to
                  <ChevronDown size={13} />
                </button>
                {moveOpen && (
                  <div className="absolute bottom-full mb-1 left-0 right-0 bg-surface border border-border rounded-xl shadow-lg overflow-hidden z-10">
                    {MOVE_TO_OPTIONS.filter((b) => b !== bucket).map((b) => (
                      <button
                        key={b}
                        onClick={() => { onMoveTo(b); setMoveOpen(false) }}
                        className="w-full text-left px-3 py-2 text-sm text-text hover:bg-bg transition-colors cursor-pointer"
                      >
                        {BUCKET_LABELS[b]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={onPass}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-surface border border-border text-muted text-sm hover:bg-bg hover:text-text transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
            {/* Learning actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setNudgeMode("more")}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                <ThumbsUp size={13} />
                More like this
              </button>
              <button
                onClick={() => setNudgeMode("less")}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-border bg-bg text-muted text-sm font-medium hover:bg-border/50 hover:text-text transition-colors cursor-pointer"
              >
                <ThumbsDown size={13} />
                Less like this
              </button>
            </div>
            {/* Compare with next */}
            {onCompareWithNext && (
              <button
                onClick={onCompareWithNext}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl border border-border bg-bg text-muted text-sm font-medium hover:bg-border/50 hover:text-text transition-colors cursor-pointer"
              >
                Compare with next
              </button>
            )}
            {/* Keyboard hint */}
            <p className="text-center text-xs text-muted mt-0.5">
              <kbd className="px-1 py-0.5 rounded bg-bg border border-border font-mono text-xs">S</kbd> shortlist ·{" "}
              <kbd className="px-1 py-0.5 rounded bg-bg border border-border font-mono text-xs">P</kbd> pass ·{" "}
              <kbd className="px-1 py-0.5 rounded bg-bg border border-border font-mono text-xs">1–4</kbd> move ·{" "}
              <kbd className="px-1 py-0.5 rounded bg-bg border border-border font-mono text-xs">↑↓</kbd> navigate
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
