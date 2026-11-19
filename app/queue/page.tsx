"use client"

import { useState, useEffect, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Download, Eye, EyeOff, Lightbulb, ChevronDown, ChevronUp, Check, X, Lock } from "lucide-react"
import Link from "next/link"
import { useDemo } from "@/context/DemoContext"
import { useToast } from "@/components/ui/Toast"
import { CandidateListRow } from "@/components/ui/CandidateListRow"
import { CandidateDetail } from "@/components/ui/CandidateDetail"
import { nudgeWeights } from "@/data/demo"
import { Button } from "@/components/ui/Button"
import { ImportModal } from "@/components/ImportModal"

export default function QueuePage() {
  const {
    role,
    candidates,
    sortedCandidates,
    showNames,
    nudgeCount,
    setShowNames,
    shortlist,
    bulkShortlist,
    setPass,
    bulkPass,
    applyNudge,
    scoreOf,
    blindScreening,
  } = useDemo()

  const effectiveShowNames = blindScreening ? false : showNames
  const shortlisted = candidates.filter((c) => c.status === "shortlisted")
  const { toast } = useToast()

  const pending = sortedCandidates.filter((c) => c.status === "pending")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [lastCheckedIdx, setLastCheckedIdx] = useState<number | null>(null)
  const [insightsOpen, setInsightsOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  // Auto-select first candidate on load / when list changes
  useEffect(() => {
    if (!selectedId || !pending.find((c) => c.id === selectedId)) {
      setSelectedId(pending[0]?.id ?? null)
    }
  }, [pending.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedCandidate = pending.find((c) => c.id === selectedId) ?? null
  const selectedIndex = selectedCandidate ? pending.indexOf(selectedCandidate) : -1

  const advanceSelection = useCallback(
    (fromIndex: number) => {
      const nextPending = pending.filter((c) => c.id !== selectedId)
      if (nextPending.length === 0) {
        setSelectedId(null)
        return
      }
      const nextIndex = Math.min(fromIndex, nextPending.length - 1)
      setSelectedId(nextPending[nextIndex]?.id ?? null)
    },
    [pending, selectedId]
  )

  const handleShortlist = useCallback(
    (id: string) => {
      const idx = pending.findIndex((c) => c.id === id)
      shortlist(id)
      setCheckedIds((prev) => { const next = new Set(prev); next.delete(id); return next })
      toast(`${effectiveShowNames ? (pending.find((c) => c.id === id)?.name ?? "Candidate") : "Candidate"} shortlisted`)
      advanceSelection(idx)
    },
    [pending, shortlist, effectiveShowNames, toast, advanceSelection]
  )

  const handlePass = useCallback(
    (id: string) => {
      const idx = pending.findIndex((c) => c.id === id)
      setPass(id)
      setCheckedIds((prev) => { const next = new Set(prev); next.delete(id); return next })
      toast("Passed")
      advanceSelection(idx)
    },
    [pending, setPass, toast, advanceSelection]
  )

  const handleNudge = useCallback(
    (candidateId: string, dir: "more" | "less") => {
      const candidate = pending.find((c) => c.id === candidateId)
      if (!candidate) return
      const { changed } = nudgeWeights(role.traits, candidate, dir)
      applyNudge(candidateId, dir)
      if (changed.length > 0) {
        changed.forEach(({ label, dir: changeDir }) => {
          toast(`${changeDir === "raised" ? "Raised" : "Lowered"}: ${label}`, "info")
        })
      } else {
        toast(dir === "more" ? "Weights nudged up — queue re-ranked" : "Weights nudged down — queue re-ranked", "info")
      }
    },
    [pending, role.traits, applyNudge, toast]
  )

  // Checkbox toggle with shift-click range select
  const handleCheckboxToggle = useCallback(
    (id: string, idx: number, shiftKey: boolean) => {
      setCheckedIds((prev) => {
        const next = new Set(prev)
        if (shiftKey && lastCheckedIdx !== null) {
          const lo = Math.min(idx, lastCheckedIdx)
          const hi = Math.max(idx, lastCheckedIdx)
          const isChecking = !prev.has(id)
          for (let i = lo; i <= hi; i++) {
            const cid = pending[i]?.id
            if (cid) {
              if (isChecking) next.add(cid)
              else next.delete(cid)
            }
          }
        } else {
          if (next.has(id)) next.delete(id)
          else next.add(id)
        }
        return next
      })
      setLastCheckedIdx(idx)
    },
    [pending, lastCheckedIdx]
  )

  const handleBulkShortlist = () => {
    const ids = [...checkedIds]
    bulkShortlist(ids)
    setCheckedIds(new Set())
    toast(`${ids.length} shortlisted`)
  }

  const handleBulkPass = () => {
    const ids = [...checkedIds]
    bulkPass(ids)
    setCheckedIds(new Set())
    toast(`${ids.length} passed`)
  }

  const handleSelectAll = () => {
    if (checkedIds.size === pending.length) {
      setCheckedIds(new Set())
    } else {
      setCheckedIds(new Set(pending.map((c) => c.id)))
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return

      if (e.key === "ArrowDown") {
        e.preventDefault()
        const idx = selectedIndex
        if (idx < pending.length - 1) setSelectedId(pending[idx + 1].id)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        const idx = selectedIndex
        if (idx > 0) setSelectedId(pending[idx - 1].id)
      } else if ((e.key === "s" || e.key === "S") && selectedId) {
        handleShortlist(selectedId)
      } else if ((e.key === "p" || e.key === "P") && selectedId) {
        handlePass(selectedId)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [selectedId, selectedIndex, pending, handleShortlist, handlePass])

  const heardBack = sortedCandidates.filter((c) => c.status !== "pending").length

  // Dynamic insights derived from nudgeCount (simplified signal)
  const insights = nudgeCount >= 1 ? [
    "Your feedback shows you value shipped projects over company brand.",
    nudgeCount >= 3 ? "You lean toward candidates who built systems others rely on." : null,
    nudgeCount >= 5 ? "Ambiguity tolerance is trending higher in your recent shortlists." : null,
  ].filter(Boolean) as string[] : []

  return (
    <>
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* ── Left: compact list ───────────────────────────────── */}
      <div className="w-96 flex-shrink-0 flex flex-col border-r border-border">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <h1 className="text-sm font-semibold text-text">
                {role.applicantCount} applicants
                <span className="text-muted font-normal ml-1">· top {pending.length} to review</span>
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {shortlisted.length > 0 && (
                <Link
                  href="/outreach"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-accent text-white hover:bg-accent-hover transition-colors"
                >
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

          {/* Controls */}
          <div className="flex items-center gap-2">
            {blindScreening ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-accent-light text-accent border-accent/30 select-none">
                <Lock size={11} />
                Names hidden until shortlist
              </span>
            ) : (
              <button
                onClick={() => setShowNames(!showNames)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                  !showNames
                    ? "bg-accent-light text-accent border-accent/30"
                    : "border-border text-muted hover:text-text hover:bg-bg"
                }`}
              >
                {showNames ? <Eye size={11} /> : <EyeOff size={11} />}
                {showNames ? "Showing names" : "Names hidden"}
              </button>
            )}
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-1 text-xs text-muted hover:text-text transition-colors cursor-pointer"
            >
              <input
                type="checkbox"
                readOnly
                checked={checkedIds.size === pending.length && pending.length > 0}
                className="w-3 h-3 rounded border-border accent-accent pointer-events-none"
              />
              All
            </button>
            {/* 7-day tracker */}
            <div className="flex items-center gap-1 ml-auto">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-muted">
                {Math.min(heardBack * 8 + 42, 312)}/{role.applicantCount} heard back
              </span>
            </div>
          </div>
        </div>

        {/* Bulk action bar — when candidates are checked */}
        {checkedIds.size > 0 && (
          <div className="px-4 py-2.5 border-b border-border bg-accent-light flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-semibold text-accent flex-1">
              {checkedIds.size} selected
            </span>
            <Button size="sm" variant="primary" onClick={handleBulkShortlist}>
              <Check size={12} />
              Shortlist
            </Button>
            <Button size="sm" variant="secondary" onClick={handleBulkPass}>
              <X size={12} />
              Pass
            </Button>
            <button
              onClick={() => setCheckedIds(new Set())}
              className="text-xs text-muted hover:text-text transition-colors cursor-pointer ml-1"
            >
              Clear
            </button>
          </div>
        )}

        {/* What Pathline has learned — after first nudge */}
        {nudgeCount > 0 && insights.length > 0 && (
          <div className="border-b border-border flex-shrink-0">
            <button
              onClick={() => setInsightsOpen((v) => !v)}
              className="w-full flex items-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-50/80 transition-colors cursor-pointer"
            >
              <Lightbulb size={13} className="text-amber-600 flex-shrink-0" />
              <p className="text-xs text-amber-800 font-medium flex-1 text-left">
                What Pathline has learned
              </p>
              {insightsOpen ? (
                <ChevronUp size={12} className="text-amber-600" />
              ) : (
                <ChevronDown size={12} className="text-amber-600" />
              )}
            </button>
            {insightsOpen && (
              <div className="px-4 pb-3 bg-amber-50 flex flex-col gap-1.5">
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
            {pending.map((candidate, i) => (
              <motion.div
                key={candidate.id}
                layout
                layoutId={candidate.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="relative group"
              >
                {/* Checkbox */}
                <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
                  <input
                    type="checkbox"
                    checked={checkedIds.has(candidate.id)}
                    onChange={() => {/* handled by click */}}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCheckboxToggle(candidate.id, i, e.shiftKey)
                    }}
                    className="w-3.5 h-3.5 rounded border-border accent-accent cursor-pointer"
                  />
                </div>
                <CandidateListRow
                  candidate={candidate}
                  score={scoreOf(candidate)}
                  rank={i + 1}
                  isSelected={selectedId === candidate.id}
                  showNames={effectiveShowNames}
                  onClick={() => setSelectedId(candidate.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {pending.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-center px-6">
              <p className="text-sm font-medium text-text">All caught up</p>
              <p className="text-xs text-muted mt-1">Head to Outreach to send invites</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: detail panel ──────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {selectedCandidate ? (
          <CandidateDetail
            key={selectedCandidate.id}
            candidate={selectedCandidate}
            score={scoreOf(selectedCandidate)}
            traits={role.traits}
            showNames={effectiveShowNames}
            onShortlist={() => handleShortlist(selectedCandidate.id)}
            onNotNow={() => handlePass(selectedCandidate.id)}
            onNudge={(dir, reason) => handleNudge(selectedCandidate.id, dir)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm font-medium text-text">No pending candidates</p>
            <p className="text-xs text-muted mt-1">All candidates have been actioned</p>
          </div>
        )}
      </div>
    </div>
    {importOpen && <ImportModal onClose={() => setImportOpen(false)} />}
    </>
  )
}
