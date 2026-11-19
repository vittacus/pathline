"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Check, Sparkles, Plus, X, ChevronDown, ChevronUp, Pencil, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { useDemo } from "@/context/DemoContext"
import { useToast } from "@/components/ui/Toast"
import {
  EXAMPLE_PROFILES,
  CALIBRATION_RESULT,
  DEMO_CANDIDATES,
  questionForTrait,
  toWeightLabel,
  computeScore,
  type Trait,
  type ProofPrompt,
} from "@/data/demo"

type WeightLabel = "Low" | "Medium" | "High"

const WEIGHT_VALUES: Record<WeightLabel, number> = { Low: 1, Medium: 2, High: 3 }
const LABEL_ORDER: Record<WeightLabel, number> = { Low: 0, Medium: 1, High: 2 }

function SegmentedControl({
  value,
  onChange,
  highlighted,
}: {
  value: WeightLabel
  onChange: (v: WeightLabel) => void
  highlighted?: boolean
}) {
  const options: WeightLabel[] = ["Low", "Medium", "High"]
  return (
    <div className={`flex items-center gap-0.5 rounded-lg p-0.5 transition-colors ${highlighted ? "bg-amber-100 border border-amber-300" : "bg-bg border border-border"}`}>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            value === opt
              ? "bg-surface shadow-sm text-text border border-border"
              : "text-muted hover:text-text"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

function ImpactPreview({ traits, approvedIds }: { traits: Trait[]; approvedIds: Set<string> }) {
  const { strongCount, top3 } = useMemo(() => {
    const activeTrait = traits.filter((t) => approvedIds.has(t.id))
    if (activeTrait.length === 0) return { strongCount: 0, top3: [] }
    const scores = DEMO_CANDIDATES.map((c) => ({
      headline: c.headline,
      score: computeScore(c, activeTrait),
    }))
    // Cap at the number of candidates we're ranking (40)
    const strong = Math.min(scores.filter((s) => s.score >= 70).length, DEMO_CANDIDATES.length)
    const scaled = Math.round((strong / DEMO_CANDIDATES.length) * 487)
    const topThree = [...scores].sort((a, b) => b.score - a.score).slice(0, 3)
    return { strongCount: scaled, top3: topThree }
  }, [traits, approvedIds])

  return (
    <div className="p-4 rounded-xl bg-accent-light border border-accent/20">
      <p className="text-xs font-medium text-accent mb-1">Live impact preview</p>
      {approvedIds.size === 0 ? (
        <p className="text-sm text-muted">Approve at least one trait to see matches</p>
      ) : (
        <>
          <p className="text-sm font-semibold text-text mb-3">
            ~{strongCount} of 487 strong matches
          </p>
          <p className="text-xs font-medium text-muted mb-1.5">Top candidates with these weights</p>
          <div className="flex flex-col gap-1.5">
            {top3.map(({ headline, score }, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <p className="text-xs text-text truncate flex-1">{headline}</p>
                <span className="text-xs font-semibold text-accent flex-shrink-0">{score}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

interface PendingChange {
  traitId: string
  label: string
  from: WeightLabel
  to: WeightLabel
  reason: string
}

export default function CalibratePage() {
  const router = useRouter()
  const { role, updateTraitWeights, advanceStep } = useDemo()
  const { toast } = useToast()

  const [traits, setTraits] = useState<Trait[]>(role.traits)
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set())
  const [analyzing, setAnalyzing] = useState(false)
  const [examplesOpen, setExamplesOpen] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([])
  const [changeIndex, setChangeIndex] = useState(0)
  const [acceptedCount, setAcceptedCount] = useState(0)
  const [highlightedTraitIds, setHighlightedTraitIds] = useState<Set<string>>(new Set())
  const [editingTrait, setEditingTrait] = useState<string | null>(null)
  const [editingTraitLabel, setEditingTraitLabel] = useState("")

  const top2TraitIds = useMemo(
    () =>
      [...traits]
        .sort((a, b) => b.numericWeight - a.numericWeight)
        .slice(0, 2)
        .map((t) => t.id),
    [traits]
  )

  const [userEdits, setUserEdits] = useState<Record<string, string>>({})
  const [userApproved, setUserApproved] = useState<Set<string>>(new Set())
  const [editingPromptPos, setEditingPromptPos] = useState<string | null>(null)
  const [editingText, setEditingText] = useState("")

  const top2Key = top2TraitIds.join(",")
  useEffect(() => {
    setUserEdits({})
    setUserApproved(new Set())
  }, [top2Key]) // eslint-disable-line react-hooks/exhaustive-deps

  const proofPrompts: ProofPrompt[] = top2TraitIds.map((traitId, i) => {
    const trait = traits.find((t) => t.id === traitId)
    const baseQuestion = questionForTrait(traitId, trait?.label ?? traitId)
    const posKey = String(i)
    return {
      id: `pp${i + 1}`,
      question: userEdits[posKey] ?? baseQuestion,
      approved: userApproved.has(posKey),
      basedOnTraits: [traitId],
    }
  })

  const sortedTraits = [...traits].sort((a, b) => b.numericWeight - a.numericWeight)

  const updateWeight = (id: string, label: WeightLabel) => {
    setTraits((prev) =>
      prev.map((t) => (t.id === id ? { ...t, numericWeight: WEIGHT_VALUES[label] } : t))
    )
  }

  const toggleApproveAll = () => {
    if (approvedIds.size === traits.length) {
      setApprovedIds(new Set())
    } else {
      setApprovedIds(new Set(traits.map((t) => t.id)))
    }
  }

  const toggleApproveTrait = (id: string) => {
    setApprovedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAnalyze = () => {
    // Compute changes synchronously from current traits (before any state update)
    const beforeTraits = traits
    setAnalyzing(true)
    setTimeout(() => {
      setAnalyzing(false)

      const sourceCount = (traitId: string) =>
        (CALIBRATION_RESULT.traitSources[traitId] ?? []).length
      const reason = (traitId: string) => {
        const n = sourceCount(traitId)
        if (n >= 3) return "All 3 examples show this"
        if (n === 2) return "2 of 3 examples show this"
        if (n === 1) return "1 of 3 examples shows this"
        return "Suggested based on role type"
      }

      const changes: PendingChange[] = []
      beforeTraits.forEach((t) => {
        const newWeight = CALIBRATION_RESULT.weights[t.id]
        if (newWeight === undefined) return
        const fromLabel = toWeightLabel(t.numericWeight)
        const toLabel = toWeightLabel(newWeight)
        if (fromLabel !== toLabel) {
          changes.push({
            traitId: t.id,
            label: t.label,
            from: fromLabel,
            to: toLabel,
            reason: reason(t.id),
          })
        }
      })

      setPendingChanges(changes)
      setChangeIndex(0)
      setAcceptedCount(0)
    }, 1800)
  }

  const handleAccept = () => {
    const change = pendingChanges[changeIndex]
    setTraits((prev) =>
      prev.map((t) =>
        t.id === change.traitId ? { ...t, numericWeight: WEIGHT_VALUES[change.to] } : t
      )
    )
    setHighlightedTraitIds(new Set([change.traitId]))
    setTimeout(() => setHighlightedTraitIds(new Set()), 2000)
    setAcceptedCount((c) => c + 1)
    setChangeIndex((i) => i + 1)
  }

  const handleSkip = () => {
    setChangeIndex((i) => i + 1)
  }

  const removeTrait = (id: string) => {
    setTraits((prev) => prev.filter((t) => t.id !== id))
    setApprovedIds((prev) => { const next = new Set(prev); next.delete(id); return next })
  }

  const addTrait = () => {
    const id = `custom_${Date.now()}`
    setTraits((prev) => [
      ...prev,
      { id, label: "New trait", numericWeight: 2, jdQuote: "added manually" },
    ])
    setEditingTrait(id)
    setEditingTraitLabel("New trait")
  }

  const saveTraitLabel = () => {
    if (!editingTrait) return
    setTraits((prev) =>
      prev.map((t) => (t.id === editingTrait ? { ...t, label: editingTraitLabel } : t))
    )
    setEditingTrait(null)
    setEditingTraitLabel("")
  }

  const startEditPrompt = (posKey: string, question: string) => {
    setEditingPromptPos(posKey)
    setEditingText(question)
  }

  const savePrompt = () => {
    if (editingPromptPos === null) return
    setUserEdits((prev) => ({ ...prev, [editingPromptPos]: editingText }))
    setEditingPromptPos(null)
    setEditingText("")
  }

  const cancelEdit = () => {
    setEditingPromptPos(null)
    setEditingText("")
  }

  const toggleApprovePrompt = (posKey: string) => {
    setUserApproved((prev) => {
      const next = new Set(prev)
      if (next.has(posKey)) next.delete(posKey)
      else next.add(posKey)
      return next
    })
  }

  const handleSaveTemplate = () => {
    updateTraitWeights(traits)
    toast("Template saved")
  }

  const handleContinue = () => {
    updateTraitWeights(traits)
    advanceStep(2)
    router.push("/queue")
  }

  const analysisComplete = pendingChanges.length > 0 && changeIndex >= pendingChanges.length
  const currentChange = pendingChanges[changeIndex]

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text tracking-tight">Calibrate the role</h1>
        <p className="text-muted text-sm mt-1">
          Set what matters most. These weights drive the ranking — you can adjust anytime.
        </p>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-6 items-start">
        {/* ── Left column ─────────────────────────────────── */}
        <div className="flex flex-col gap-5">

          {/* Section 1: Traits from job description */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
              <h3 className="text-sm font-semibold text-text">Traits from the job description</h3>
            </div>
            <Card>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted">
                  Pathline found these in the job description. Approve the ones that fit — set a weight for each.
                </p>
              </div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-text">
                  {approvedIds.size} of {traits.length} traits approved
                </p>
                <button
                  onClick={toggleApproveAll}
                  className="text-xs font-medium text-accent hover:text-accent-hover transition-colors cursor-pointer"
                >
                  {approvedIds.size === traits.length ? "Unapprove all" : "Approve all"}
                </button>
              </div>
              <div className="flex flex-col gap-3 mb-4">
                {sortedTraits.map((trait) => {
                  const label = toWeightLabel(trait.numericWeight)
                  const isHighlighted = highlightedTraitIds.has(trait.id)
                  const isApproved = approvedIds.has(trait.id)
                  const sources = analysisComplete
                    ? (CALIBRATION_RESULT.traitSources[trait.id] ?? [])
                    : []
                  return (
                    <div key={trait.id} className={`p-3.5 rounded-xl border transition-colors ${isHighlighted ? "bg-amber-50 border-amber-200" : isApproved ? "bg-bg border-accent/30" : "bg-bg border-border"}`}>
                      <div className="flex items-start gap-2 mb-2.5">
                        <div className="flex-1 min-w-0">
                          {editingTrait === trait.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                autoFocus
                                value={editingTraitLabel}
                                onChange={(e) => setEditingTraitLabel(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveTraitLabel()
                                  if (e.key === "Escape") { setEditingTrait(null); setEditingTraitLabel("") }
                                }}
                                className="text-sm text-text bg-surface border border-accent/40 rounded-lg px-2 py-1 focus:outline-none focus:border-accent flex-1"
                              />
                              <Button size="sm" variant="primary" onClick={saveTraitLabel}>Save</Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-text">{trait.label}</span>
                              <button
                                onClick={() => { setEditingTrait(trait.id); setEditingTraitLabel(trait.label) }}
                                className="p-0.5 rounded text-muted hover:text-text transition-colors cursor-pointer"
                              >
                                <Pencil size={11} />
                              </button>
                            </div>
                          )}
                          <p className="text-xs text-muted mt-0.5 italic leading-relaxed">
                            &ldquo;{trait.jdQuote}&rdquo;
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {sources.length > 0 && (
                            <div className="flex gap-0.5">
                              {sources.map((profileId) => {
                                const profile = EXAMPLE_PROFILES.find((p) => p.id === profileId)
                                return profile ? (
                                  <span
                                    key={profileId}
                                    title={profile.name}
                                    className="w-4 h-4 rounded-full bg-accent-light border border-accent/20 flex items-center justify-center font-semibold text-accent"
                                    style={{ fontSize: "9px" }}
                                  >
                                    {profile.initials.charAt(0)}
                                  </span>
                                ) : null
                              })}
                            </div>
                          )}
                          <button
                            onClick={() => removeTrait(trait.id)}
                            className="p-1 rounded text-muted hover:text-danger transition-colors cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <SegmentedControl
                          value={label}
                          onChange={(v) => updateWeight(trait.id, v)}
                          highlighted={isHighlighted}
                        />
                        <button
                          onClick={() => toggleApproveTrait(trait.id)}
                          className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex-shrink-0 ${
                            isApproved
                              ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                              : "bg-bg text-muted border border-border hover:border-accent/40 hover:text-accent"
                          }`}
                        >
                          {isApproved ? <Check size={11} /> : null}
                          {isApproved ? "Approved" : "Approve"}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
              <Button size="sm" variant="ghost" onClick={addTrait}>
                <Plus size={13} />
                Add a trait
              </Button>
            </Card>
          </div>

          {/* Section 2: Learn from your best hires */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
              <h3 className="text-sm font-semibold text-text">Learn from your best hires</h3>
            </div>
            <Card>
              <p className="text-xs text-muted mb-4">
                Add 3 people you&apos;d hire again, like a top current employee. Pathline finds what they have in common and suggests weight changes. You approve each one.
              </p>

              <button
                onClick={() => setExamplesOpen((v) => !v)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-border bg-bg hover:bg-bg/80 transition-colors cursor-pointer mb-3"
              >
                <span className="text-sm text-text font-medium">Example: your 3 best hires</span>
                {examplesOpen ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
              </button>

              {examplesOpen && (
                <div>
                  <div className="flex flex-col gap-3 mb-4">
                    {EXAMPLE_PROFILES.map((profile) => (
                      <div
                        key={profile.id}
                        className="flex items-start gap-3 p-3.5 rounded-xl bg-bg border border-border"
                      >
                        <div className="w-8 h-8 rounded-full bg-accent-light border border-accent/20 flex items-center justify-center text-xs font-semibold text-accent flex-shrink-0">
                          {profile.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text">{profile.name}</p>
                          <p className="text-xs text-muted mb-2">{profile.currentRole}</p>
                          <ul className="flex flex-col gap-1">
                            {profile.highlights.map((h, i) => (
                              <li key={i} className="text-xs text-text/80 flex items-start gap-1.5">
                                <span className="text-accent mt-0.5 flex-shrink-0">·</span>
                                {h}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Analyze / Accept-Skip flow */}
                  {pendingChanges.length === 0 ? (
                    <Button
                      variant="primary"
                      onClick={handleAnalyze}
                      disabled={analyzing}
                      className="w-full justify-center"
                    >
                      {analyzing ? (
                        <><Sparkles size={14} className="animate-pulse" /> Analyzing profiles…</>
                      ) : (
                        <><Sparkles size={14} /> Analyze profiles</>
                      )}
                    </Button>
                  ) : analysisComplete ? (
                    <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                      <Check size={14} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-emerald-800">
                        Done — {acceptedCount} change{acceptedCount !== 1 ? "s" : ""} applied, {pendingChanges.length - acceptedCount} skipped.
                      </p>
                    </div>
                  ) : currentChange ? (
                    <div className="rounded-xl border border-border bg-bg p-4">
                      <p className="text-xs text-muted mb-2">
                        Suggested change {changeIndex + 1} of {pendingChanges.length}
                      </p>
                      <div className="flex items-center gap-3 mb-2">
                        {LABEL_ORDER[currentChange.to] > LABEL_ORDER[currentChange.from] ? (
                          <ArrowUp size={16} className="text-emerald-600 flex-shrink-0" />
                        ) : (
                          <ArrowDown size={16} className="text-amber-600 flex-shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-semibold text-text">{currentChange.label}</p>
                          <p className="text-xs text-muted">
                            {currentChange.from} → <span className={`font-semibold ${LABEL_ORDER[currentChange.to] > LABEL_ORDER[currentChange.from] ? "text-emerald-700" : "text-amber-700"}`}>{currentChange.to}</span>
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted mb-3">{currentChange.reason}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="primary" onClick={handleAccept}>Accept</Button>
                        <Button size="sm" variant="ghost" onClick={handleSkip}>Skip</Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {!examplesOpen && (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-border text-center"
                >
                  <p className="text-xs text-muted">Drop a resume or LinkedIn URL here to add a custom example</p>
                  <p className="text-xs text-muted/60">· Simulated in this demo</p>
                </div>
              )}
            </Card>
          </div>

          {/* Section 3: Application questions */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
              <h3 className="text-sm font-semibold text-text">Application questions</h3>
            </div>
            <Card>
              <div className="mb-4">
                <p className="text-xs text-muted">
                  Auto-suggested from your top traits. Optional for applicants — takes about 5 minutes.
                </p>
                <p className="text-xs text-muted mt-1.5">
                  Answers count as evidence for the same traits as a resume, never as a bonus for answering.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {proofPrompts.map((prompt, i) => {
                  const posKey = String(i)
                  const basedOnLabel = traits.find((t) => t.id === prompt.basedOnTraits[0])?.label
                  return (
                    <div key={prompt.id} className="rounded-xl border border-border bg-bg p-3.5">
                      {basedOnLabel && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-bg border border-border text-muted font-medium mb-2 inline-block">
                          {basedOnLabel}
                        </span>
                      )}
                      {editingPromptPos === posKey ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full text-sm text-text bg-surface border border-border rounded-lg p-2.5 resize-none focus:outline-none focus:border-accent/50 h-20"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button size="sm" variant="primary" onClick={savePrompt}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={cancelEdit}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm text-text leading-relaxed flex-1">{prompt.question}</p>
                          <div className="flex gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => startEditPrompt(posKey, prompt.question)}
                              className="text-xs text-muted hover:text-text px-2 py-1 rounded-lg hover:bg-border/50 transition-colors cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => toggleApprovePrompt(posKey)}
                              className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                                prompt.approved
                                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                  : "bg-accent-light text-accent border border-accent/20 hover:bg-accent hover:text-white"
                              }`}
                            >
                              <Check size={11} />
                              {prompt.approved ? "Approved" : "Approve"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        </div>

        {/* ── Right column (sticky) ────────────────────────── */}
        <div className="sticky top-20 flex flex-col gap-4">
          <ImpactPreview traits={traits} approvedIds={approvedIds} />
          <div className="flex flex-col gap-2">
            <Button size="lg" className="w-full justify-center" onClick={handleContinue}>
              Next: Review →
            </Button>
            <Button size="sm" variant="ghost" className="w-full justify-center" onClick={handleSaveTemplate}>
              Save as template
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
