"use client"

import { useState, useEffect, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Eye, EyeOff, Lightbulb, ChevronDown, ChevronUp, Check, X, Lock, Download, ArrowLeftRight, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useDemo } from "@/context/DemoContext"
import { useToast } from "@/components/ui/Toast"
import { CandidateListRow } from "@/components/ui/CandidateListRow"
import { CandidateDetail } from "@/components/ui/CandidateDetail"
import { nudgeWeights, computeScore, STRONG_THRESHOLD, type BucketId, type Candidate, DEMO_CANDIDATE_IDS, APPLIED_VIA_LOOKUP } from "@/data/demo"
import { Button } from "@/components/ui/Button"
import { ImportModal } from "@/components/ImportModal"

// ─── Bucket configuration ─────────────────────────────────────────────────────

const BUCKET_TABS: { id: BucketId; label: string }[] = [
  { id: "priority", label: "Priority" },
  { id: "strong", label: "Strong match" },
  { id: "review", label: "Worth reviewing" },
  { id: "not_now", label: "Not now" },
  { id: "shortlisted", label: "Shortlist" },
]

const BUCKET_LABELS: Record<BucketId, string> = {
  priority: "Priority", strong: "Strong match", review: "Worth reviewing",
  not_now: "Not now", shortlisted: "Shortlist",
}

const BUCKET_KEY_MAP: Record<string, BucketId> = {
  "1": "priority", "2": "strong", "3": "review", "4": "not_now",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toLevel(val: number): "high" | "med" | "low" {
  return val >= 70 ? "high" : val >= 40 ? "med" : "low"
}

function StrengthDots({ value }: { value: number }) {
  const level = toLevel(value)
  const filled = level === "high" ? 3 : level === "med" ? 2 : 1
  return (
    <div className="flex gap-0.5 items-center">
      {[1, 2, 3].map((i) => (
        <div key={i} className={`w-2 h-2 rounded-full ${i <= filled ? "bg-accent" : "bg-border"}`} />
      ))}
      <span className="ml-1 text-xs text-muted">
        {level === "high" ? "High" : level === "med" ? "Med" : "Low"}
      </span>
    </div>
  )
}

// ─── Compare view ─────────────────────────────────────────────────────────────

interface CompareViewProps {
  initialIds: string[]
  bucketCandidates: Candidate[]
  effectiveShowNames: boolean
  onClose: () => void
  onShortlist: (id: string) => void
  onMoveTo: (id: string, bucket: BucketId) => void
}

function CompareView({
  initialIds,
  bucketCandidates,
  effectiveShowNames,
  onClose,
  onShortlist,
  onMoveTo,
}: CompareViewProps) {
  const { candidates, role, getBucketOf } = useDemo()
  const [compareIds, setCompareIds] = useState<string[]>(initialIds)
  const [similarOpen, setSimilarOpen] = useState(false)
  const [swapOpen, setSwapOpen] = useState<number | null>(null) // column index

  const cols = compareIds
    .map((id) => candidates.find((c) => c.id === id))
    .filter(Boolean) as Candidate[]

  if (cols.length < 2) return null

  const gridCols = `9rem repeat(${cols.length}, 1fr)`

  // Which candidates can be swapped in (in bucket, not already in compare)
  const swapPool = bucketCandidates.filter((c) => !compareIds.includes(c.id))

  // Classify traits: differ vs similar
  const differingTraits = role.traits.filter((t) => {
    const levels = new Set(cols.map((c) => toLevel(c.traitVector[t.id] ?? 0)))
    return levels.size > 1
  })
  const similarTraits = role.traits.filter((t) => {
    const levels = new Set(cols.map((c) => toLevel(c.traitVector[t.id] ?? 0)))
    return levels.size === 1
  })

  // For each differing trait, find which column is strongest
  const strongestPerTrait: Record<string, string> = {}
  for (const trait of differingTraits) {
    let best = cols[0].id
    let bestVal = cols[0].traitVector[trait.id] ?? 0
    for (const col of cols.slice(1)) {
      const val = col.traitVector[trait.id] ?? 0
      if (val > bestVal) { best = col.id; bestVal = val }
    }
    strongestPerTrait[trait.id] = best
  }

  const TraitRow = ({ trait, isDiffering }: { trait: typeof role.traits[0]; isDiffering: boolean }) => (
    <div
      className="grid border-b border-border hover:bg-bg/40 transition-colors"
      style={{ gridTemplateColumns: gridCols }}
    >
      <div className="px-3 py-2.5 border-r border-border flex items-start">
        <p className="text-xs font-medium text-muted leading-snug">{trait.label}</p>
      </div>
      {cols.map((c) => {
        const val = c.traitVector[trait.id] ?? 0
        const isStrongest = isDiffering && strongestPerTrait[trait.id] === c.id && val > 0
        const ev = c.evidence.find((e) => e.traitId === trait.id)
        return (
          <div
            key={c.id}
            className={`px-3 py-2.5 border-r border-border last:border-r-0 ${isStrongest ? "bg-accent-light/50" : ""}`}
          >
            <StrengthDots value={val} />
            {ev ? (
              <p className="mt-1.5 text-xs text-muted leading-relaxed line-clamp-2">
                "{ev.quote}"
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-muted/50 italic">No evidence found</p>
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="flex flex-col h-full overflow-hidden" onClick={() => setSwapOpen(null)}>
      {/* Fixed header */}
      <div className="flex-shrink-0 border-b border-border">
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <div className="flex items-center gap-2">
            <ArrowLeftRight size={13} className="text-muted" />
            <span className="text-sm font-semibold text-text">
              Comparing {cols.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-muted hover:text-text transition-colors cursor-pointer flex items-center gap-1"
          >
            <X size={12} /> Close
          </button>
        </div>

        {/* Column headers */}
        <div className="grid" style={{ gridTemplateColumns: gridCols }}>
          <div className="px-3 py-3 border-r border-border" />
          {cols.map((c, colIdx) => {
            const hasProof = c.evidence.some((e) => e.source === "proof_answer")
            const isImported = !DEMO_CANDIDATE_IDS.has(c.id)
            const displayName = effectiveShowNames ? c.name : c.initials
            const bucket = getBucketOf(c)
            return (
              <div key={c.id} className="px-3 py-3 border-r border-border last:border-r-0">
                {/* Name + swap dropdown */}
                <div className="flex items-start justify-between gap-1 mb-1">
                  <p className="text-sm font-semibold text-text truncate leading-tight">{displayName}</p>
                  {swapPool.length > 0 && (
                    <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSwapOpen(swapOpen === colIdx ? null : colIdx)}
                        className="p-0.5 rounded text-muted hover:text-text hover:bg-bg transition-colors cursor-pointer"
                        title="Swap candidate"
                      >
                        <RefreshCw size={11} />
                      </button>
                      {swapOpen === colIdx && (
                        <div className="absolute top-full right-0 mt-1 bg-surface border border-border rounded-xl shadow-lg z-30 w-44 max-h-40 overflow-y-auto">
                          <p className="px-3 pt-2 pb-1 text-[10px] font-medium text-muted uppercase tracking-wide">Swap with</p>
                          {swapPool.map((sc) => (
                            <button
                              key={sc.id}
                              onClick={() => {
                                setCompareIds((prev) => prev.map((id, i) => i === colIdx ? sc.id : id))
                                setSwapOpen(null)
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-text hover:bg-bg transition-colors cursor-pointer border-t border-border first:border-t-0"
                            >
                              <span className="font-medium">{effectiveShowNames ? sc.name : sc.initials}</span>
                              <span className="block text-muted truncate">{sc.headline}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted truncate mb-1.5">{c.headline}</p>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${hasProof && !isImported ? "bg-accent-light text-accent border border-accent/20" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                    {hasProof && !isImported ? "Answered" : "Resume only"}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-xs bg-bg border border-border text-muted">
                    {BUCKET_LABELS[bucket]}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Scrollable trait rows */}
      <div className="flex-1 overflow-y-auto">
        {/* Differing traits */}
        {differingTraits.length > 0 && (
          <>
            <div className="px-3 py-1.5 bg-bg border-b border-border">
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wide">
                Where they differ
              </p>
            </div>
            {differingTraits.map((trait) => (
              <TraitRow key={trait.id} trait={trait} isDiffering={true} />
            ))}
          </>
        )}

        {/* Similar traits (collapsed) */}
        {similarTraits.length > 0 && (
          <>
            <button
              onClick={() => setSimilarOpen((v) => !v)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-bg border-b border-border hover:bg-bg/80 transition-colors cursor-pointer"
            >
              {similarOpen
                ? <ChevronUp size={11} className="text-muted" />
                : <ChevronDown size={11} className="text-muted" />}
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wide">
                Similar on {similarTraits.length} trait{similarTraits.length !== 1 ? "s" : ""}
              </p>
            </button>
            {similarOpen && similarTraits.map((trait) => (
              <TraitRow key={trait.id} trait={trait} isDiffering={false} />
            ))}
          </>
        )}
      </div>

      {/* Fixed footer — per-column actions */}
      <div
        className="flex-shrink-0 border-t border-border grid"
        style={{ gridTemplateColumns: gridCols }}
      >
        <div className="px-3 py-3 border-r border-border" />
        {cols.map((c) => {
          const bucket = getBucketOf(c)
          return (
            <ColumnFooter
              key={c.id}
              candidate={c}
              bucket={bucket}
              onShortlist={() => { onShortlist(c.id); onClose() }}
              onMoveTo={(b) => { onMoveTo(c.id, b); onClose() }}
            />
          )
        })}
      </div>
    </div>
  )
}

function ColumnFooter({
  candidate,
  bucket,
  onShortlist,
  onMoveTo,
}: {
  candidate: Candidate
  bucket: BucketId
  onShortlist: () => void
  onMoveTo: (b: BucketId) => void
}) {
  const [moveOpen, setMoveOpen] = useState(false)
  const moveOptions: BucketId[] = (["priority", "strong", "review", "not_now"] as BucketId[]).filter(
    (b) => b !== bucket
  )

  return (
    <div className="px-3 py-3 border-r border-border last:border-r-0 flex flex-col gap-1.5">
      {bucket !== "shortlisted" && (
        <button
          onClick={onShortlist}
          className="w-full flex items-center justify-center gap-1 py-2 px-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors cursor-pointer"
        >
          <Check size={11} /> Shortlist
        </button>
      )}
      <div className="flex gap-1">
        <div className="relative flex-1">
          <button
            onClick={(e) => { e.stopPropagation(); setMoveOpen((v) => !v) }}
            className="w-full flex items-center justify-center gap-1 py-1.5 px-2 rounded text-xs border border-border text-muted hover:bg-bg hover:text-text transition-colors cursor-pointer"
          >
            Move to <ChevronDown size={9} />
          </button>
          {moveOpen && (
            <div className="absolute bottom-full mb-1 left-0 right-0 bg-surface border border-border rounded-xl shadow-lg overflow-hidden z-20">
              {moveOptions.map((b) => (
                <button
                  key={b}
                  onClick={(e) => { e.stopPropagation(); onMoveTo(b); setMoveOpen(false) }}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-text hover:bg-bg transition-colors cursor-pointer"
                >
                  {BUCKET_LABELS[b]}
                </button>
              ))}
            </div>
          )}
        </div>
        {bucket !== "not_now" && (
          <button
            onClick={() => { onMoveTo("not_now"); }}
            className="flex items-center justify-center py-1.5 px-2 rounded text-xs border border-border text-muted hover:bg-bg hover:text-text transition-colors cursor-pointer"
            title="Not now"
          >
            <X size={11} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function QueuePage() {
  const {
    role,
    candidates,
    showNames,
    nudgeCount,
    setShowNames,
    shortlist,
    bulkShortlist,
    bulkMoveToBucket,
    moveToBucket,
    applyNudge,
    scoreOf,
    getBucketOf,
    bucketCounts,
    blindScreening,
    advanceStep,
  } = useDemo()

  const effectiveShowNames = blindScreening ? false : showNames
  const { toast } = useToast()

  const [activeBucket, setActiveBucket] = useState<BucketId>("strong")

  const bucketCandidates = candidates
    .filter((c) => getBucketOf(c) === activeBucket)
    .sort((a, b) => scoreOf(b) - scoreOf(a))

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [lastCheckedIdx, setLastCheckedIdx] = useState<number | null>(null)
  const [insightsOpen, setInsightsOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [compareIds, setCompareIds] = useState<string[] | null>(null)

  // Auto-select first candidate when bucket changes
  useEffect(() => {
    if (!selectedId || !bucketCandidates.find((c) => c.id === selectedId)) {
      setSelectedId(bucketCandidates[0]?.id ?? null)
    }
  }, [activeBucket, bucketCandidates.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear compare + checked when bucket switches
  useEffect(() => {
    setCompareIds(null)
    setCheckedIds(new Set())
  }, [activeBucket])

  const selectedCandidate = bucketCandidates.find((c) => c.id === selectedId) ?? null
  const selectedIndex = selectedCandidate ? bucketCandidates.indexOf(selectedCandidate) : -1

  const advanceSelection = useCallback(
    (fromIndex: number) => {
      const remaining = bucketCandidates.filter((c) => c.id !== selectedId)
      if (remaining.length === 0) { setSelectedId(null); return }
      setSelectedId(remaining[Math.min(fromIndex, remaining.length - 1)]?.id ?? null)
    },
    [bucketCandidates, selectedId]
  )

  const handleShortlist = useCallback(
    (id: string) => {
      const idx = bucketCandidates.findIndex((c) => c.id === id)
      shortlist(id)
      setCheckedIds((prev) => { const n = new Set(prev); n.delete(id); return n })
      toast(`${effectiveShowNames ? (bucketCandidates.find((c) => c.id === id)?.name ?? "Candidate") : "Candidate"} shortlisted`)
      advanceSelection(idx)
      advanceStep(3)
    },
    [bucketCandidates, shortlist, effectiveShowNames, toast, advanceSelection, advanceStep]
  )

  const handlePass = useCallback(
    (id: string) => {
      const idx = bucketCandidates.findIndex((c) => c.id === id)
      moveToBucket(id, "not_now")
      setCheckedIds((prev) => { const n = new Set(prev); n.delete(id); return n })
      toast("Moved to Not now")
      advanceSelection(idx)
    },
    [bucketCandidates, moveToBucket, toast, advanceSelection]
  )

  const handleMoveTo = useCallback(
    (id: string, bucket: BucketId) => {
      if (bucket === "shortlisted") { handleShortlist(id); return }
      if (bucket === "not_now") { handlePass(id); return }
      const idx = bucketCandidates.findIndex((c) => c.id === id)
      moveToBucket(id, bucket)
      setCheckedIds((prev) => { const n = new Set(prev); n.delete(id); return n })
      advanceSelection(idx)
    },
    [bucketCandidates, moveToBucket, handleShortlist, handlePass, advanceSelection]
  )

  const handleNudge = useCallback(
    (candidateId: string, dir: "more" | "less") => {
      const candidate = bucketCandidates.find((c) => c.id === candidateId)
      if (!candidate) return

      const { updated: newTraits, changed } = nudgeWeights(role.traits, candidate, dir)
      const autoMovable = candidates.filter((c) => c.status === "pending" && !c.manuallyBucketed)
      const beforeBuckets = new Map(
        autoMovable.map((c) => [c.id, computeScore(c, role.traits) >= STRONG_THRESHOLD ? "strong" : "review"])
      )
      const afterBuckets = new Map(
        autoMovable.map((c) => [c.id, computeScore(c, newTraits) >= STRONG_THRESHOLD ? "strong" : "review"])
      )

      applyNudge(candidateId, dir)

      let toStrong = 0, toReview = 0
      for (const [id, before] of beforeBuckets) {
        const after = afterBuckets.get(id)
        if (before !== after) {
          if (after === "strong") toStrong++
          else toReview++
        }
      }

      if (changed.length > 0) {
        changed.forEach(({ label, dir: changeDir }) => {
          toast(`${changeDir === "raised" ? "Raised" : "Lowered"}: ${label}`, "info")
        })
      } else {
        toast(dir === "more" ? "Weights nudged up — queue re-ranked" : "Weights nudged down — queue re-ranked", "info")
      }

      if (toStrong > 0) {
        const movedLabel = changed.length > 0 ? ` because you weighted ${changed[0].label} ${changed[0].dir === "raised" ? "higher" : "lower"}` : ""
        toast(`Moved ${toStrong} candidate${toStrong > 1 ? "s" : ""} from Worth reviewing to Strong match${movedLabel}`, "info")
      }
      if (toReview > 0) {
        toast(`Moved ${toReview} candidate${toReview > 1 ? "s" : ""} from Strong match to Worth reviewing`, "info")
      }
    },
    [bucketCandidates, candidates, role.traits, applyNudge, toast]
  )

  const handleCheckboxToggle = useCallback(
    (id: string, idx: number, shiftKey: boolean) => {
      setCheckedIds((prev) => {
        const next = new Set(prev)
        if (shiftKey && lastCheckedIdx !== null) {
          const lo = Math.min(idx, lastCheckedIdx)
          const hi = Math.max(idx, lastCheckedIdx)
          const isChecking = !prev.has(id)
          for (let i = lo; i <= hi; i++) {
            const cid = bucketCandidates[i]?.id
            if (cid) { if (isChecking) next.add(cid); else next.delete(cid) }
          }
        } else {
          if (next.has(id)) next.delete(id); else next.add(id)
        }
        return next
      })
      setLastCheckedIdx(idx)
    },
    [bucketCandidates, lastCheckedIdx]
  )

  const handleBulkShortlist = () => {
    const ids = [...checkedIds]
    bulkShortlist(ids)
    setCheckedIds(new Set())
    toast(`${ids.length} shortlisted`)
    advanceStep(3)
  }

  const handleBulkMoveTo = (bucket: BucketId) => {
    const ids = [...checkedIds]
    bulkMoveToBucket(ids, bucket)
    setCheckedIds(new Set())
    toast(`${ids.length} moved to ${BUCKET_LABELS[bucket]}`)
  }

  const handleSelectAll = () => {
    if (checkedIds.size === bucketCandidates.length) setCheckedIds(new Set())
    else setCheckedIds(new Set(bucketCandidates.map((c) => c.id)))
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return
      if ((e.key === "s" || e.key === "S") && selectedId) handleShortlist(selectedId)
      else if ((e.key === "p" || e.key === "P") && selectedId) handlePass(selectedId)
      else if (e.key === "ArrowDown") {
        e.preventDefault()
        if (selectedIndex < bucketCandidates.length - 1) setSelectedId(bucketCandidates[selectedIndex + 1].id)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        if (selectedIndex > 0) setSelectedId(bucketCandidates[selectedIndex - 1].id)
      } else if (BUCKET_KEY_MAP[e.key] && selectedId) {
        handleMoveTo(selectedId, BUCKET_KEY_MAP[e.key])
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [selectedId, selectedIndex, bucketCandidates, handleShortlist, handlePass, handleMoveTo])

  const insights = nudgeCount >= 1 ? [
    "Your feedback shows you value shipped projects over company brand.",
    nudgeCount >= 3 ? "You lean toward candidates who built systems others rely on." : null,
    nudgeCount >= 5 ? "Ambiguity tolerance is trending higher in your recent shortlists." : null,
  ].filter(Boolean) as string[] : []

  const shortlisted = candidates.filter((c) => c.status === "shortlisted")
  const checkedArr = [...checkedIds]
  const canCompare = checkedArr.length >= 2 && checkedArr.length <= 3
  const canCompareTop3 = bucketCandidates.length >= 2

  // "Compare with next" for detail panel
  const nextCandidate = selectedIndex >= 0 && selectedIndex < bucketCandidates.length - 1
    ? bucketCandidates[selectedIndex + 1]
    : null

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">

        {/* ── Bucket tabs ───────────────────────────────────────── */}
        <div className="flex-shrink-0 border-b border-border bg-surface">
          <div className="flex items-center px-4">
            {BUCKET_TABS.map((tab) => {
              const count = bucketCounts[tab.id]
              const isActive = activeBucket === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveBucket(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                    isActive ? "border-accent text-accent" : "border-transparent text-muted hover:text-text"
                  }`}
                >
                  {tab.label}
                  <span className={`min-w-[18px] px-1 py-0.5 rounded-full text-[10px] font-bold leading-none text-center ${
                    isActive ? "bg-accent text-white" : "bg-bg border border-border text-muted"
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
            <div className="ml-auto flex items-center gap-2 pr-2">
              {shortlisted.length > 0 && (
                <Link href="/outreach" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-accent text-white hover:bg-accent-hover transition-colors">
                  Next: Invite →
                </Link>
              )}
              <button
                onClick={() => setImportOpen(true)}
                className="flex items-center gap-1.5 text-xs text-muted hover:text-text transition-colors cursor-pointer"
              >
                <Download size={12} />
                Import
              </button>
            </div>
          </div>
        </div>

        {/* ── Main two-column layout ─────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Left: list ──────────────────────────────────────── */}
          <div className="w-80 flex-shrink-0 flex flex-col border-r border-border">

            {/* List header */}
            <div className="px-3 py-2 border-b border-border flex-shrink-0 flex items-center gap-2">
              {blindScreening ? (
                <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border bg-accent-light text-accent border-accent/30 select-none">
                  <Lock size={10} />
                  Names hidden
                </span>
              ) : (
                <button
                  onClick={() => setShowNames(!showNames)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                    !showNames ? "bg-accent-light text-accent border-accent/30" : "border-border text-muted hover:text-text hover:bg-bg"
                  }`}
                >
                  {showNames ? <Eye size={10} /> : <EyeOff size={10} />}
                  {showNames ? "Names on" : "Names off"}
                </button>
              )}
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-1 text-xs text-muted hover:text-text transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  readOnly
                  checked={checkedIds.size === bucketCandidates.length && bucketCandidates.length > 0}
                  className="w-3 h-3 rounded border-border accent-accent pointer-events-none"
                />
                All
              </button>
              <div className="ml-auto flex items-center gap-1.5">
                {/* Compare top 3 button */}
                {canCompareTop3 && (
                  <button
                    onClick={() => setCompareIds(bucketCandidates.slice(0, Math.min(3, bucketCandidates.length)).map((c) => c.id))}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-muted border border-border hover:bg-bg hover:text-text transition-colors cursor-pointer"
                    title="Compare top 3 in this bucket"
                  >
                    <ArrowLeftRight size={10} />
                    Top {Math.min(3, bucketCandidates.length)}
                  </button>
                )}
                <span className="text-xs text-muted tabular-nums">{bucketCandidates.length}</span>
              </div>
            </div>

            {/* Bulk action bar */}
            {checkedIds.size > 0 && (
              <div className="px-3 py-2 border-b border-border bg-accent-light flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                <span className="text-xs font-semibold text-accent mr-1">{checkedIds.size} selected</span>
                <Button size="sm" variant="primary" onClick={handleBulkShortlist}>
                  <Check size={11} /> Shortlist
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleBulkMoveTo("not_now")}>
                  <X size={11} /> Not now
                </Button>
                <BulkMoveDropdown onMoveTo={handleBulkMoveTo} currentBucket={activeBucket} />
                {canCompare && (
                  <button
                    onClick={() => setCompareIds(checkedArr.slice(0, 3))}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-surface text-accent border border-accent/30 hover:bg-accent-light transition-colors cursor-pointer"
                  >
                    <ArrowLeftRight size={10} />
                    Compare ({checkedArr.length})
                  </button>
                )}
                <button
                  onClick={() => setCheckedIds(new Set())}
                  className="text-xs text-muted hover:text-text transition-colors cursor-pointer ml-auto"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Insights strip */}
            {nudgeCount > 0 && insights.length > 0 && (
              <div className="border-b border-border flex-shrink-0">
                <button
                  onClick={() => setInsightsOpen((v) => !v)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-amber-50 hover:bg-amber-50/80 transition-colors cursor-pointer"
                >
                  <Lightbulb size={12} className="text-amber-600 flex-shrink-0" />
                  <p className="text-xs text-amber-800 font-medium flex-1 text-left">What Pathline has learned</p>
                  {insightsOpen ? <ChevronUp size={11} className="text-amber-600" /> : <ChevronDown size={11} className="text-amber-600" />}
                </button>
                {insightsOpen && (
                  <div className="px-3 pb-2.5 bg-amber-50 flex flex-col gap-1">
                    {insights.map((insight, i) => (
                      <p key={i} className="text-xs text-amber-800 flex items-start gap-1.5">
                        <span className="text-amber-500 mt-0.5 flex-shrink-0">·</span>
                        {insight}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Candidate list */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="popLayout" initial={false}>
                {bucketCandidates.map((candidate, i) => (
                  <motion.div
                    key={candidate.id}
                    layout
                    layoutId={candidate.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="relative"
                  >
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
                      <input
                        type="checkbox"
                        checked={checkedIds.has(candidate.id)}
                        onChange={() => {}}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCheckboxToggle(candidate.id, i, e.shiftKey)
                        }}
                        className="w-3.5 h-3.5 rounded border-border accent-accent cursor-pointer"
                      />
                    </div>
                    <div className="pl-7">
                      <CandidateListRow
                        candidate={candidate}
                        isSelected={selectedId === candidate.id}
                        showNames={effectiveShowNames}
                        onClick={() => setSelectedId(candidate.id)}
                      />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {bucketCandidates.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 text-center px-6">
                  <p className="text-sm font-medium text-text">Empty bucket</p>
                  <p className="text-xs text-muted mt-1">Move candidates here from other buckets</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Right: detail or compare ─────────────────────────── */}
          <div className="flex-1 overflow-hidden">
            {compareIds !== null && compareIds.length >= 2 ? (
              <CompareView
                initialIds={compareIds}
                bucketCandidates={bucketCandidates}
                effectiveShowNames={effectiveShowNames}
                onClose={() => setCompareIds(null)}
                onShortlist={handleShortlist}
                onMoveTo={handleMoveTo}
              />
            ) : selectedCandidate ? (
              <CandidateDetail
                key={selectedCandidate.id}
                candidate={selectedCandidate}
                traits={role.traits}
                showNames={effectiveShowNames}
                onShortlist={() => handleShortlist(selectedCandidate.id)}
                onPass={() => handlePass(selectedCandidate.id)}
                onNudge={(dir) => handleNudge(selectedCandidate.id, dir)}
                onMoveTo={(bucket) => handleMoveTo(selectedCandidate.id, bucket)}
                onCompareWithNext={nextCandidate
                  ? () => setCompareIds([selectedCandidate.id, nextCandidate.id])
                  : undefined}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-sm font-medium text-text">No candidates in this bucket</p>
                <p className="text-xs text-muted mt-1">Switch to another bucket or import more applicants</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {importOpen && <ImportModal onClose={() => setImportOpen(false)} />}
    </>
  )
}

// ─── Bulk move dropdown ───────────────────────────────────────────────────────

function BulkMoveDropdown({
  onMoveTo,
  currentBucket,
}: {
  onMoveTo: (bucket: BucketId) => void
  currentBucket: BucketId
}) {
  const [open, setOpen] = useState(false)
  const options: BucketId[] = (["priority", "strong", "review"] as BucketId[]).filter((b) => b !== currentBucket)
  if (options.length === 0) return null
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs border border-border text-muted hover:bg-surface hover:text-text transition-colors cursor-pointer"
      >
        Move to <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 bg-surface border border-border rounded-xl shadow-lg overflow-hidden z-20 w-36">
          {options.map((b) => (
            <button
              key={b}
              onClick={() => { onMoveTo(b); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-xs text-text hover:bg-bg transition-colors cursor-pointer"
            >
              {BUCKET_LABELS[b]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
