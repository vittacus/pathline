"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import {
  DEMO_ROLE,
  DEMO_CANDIDATES,
  DEMO_CANDIDATE_IDS,
  computeScore,
  nudgeWeights,
  STRONG_THRESHOLD,
  type BucketId,
  type Role,
  type Candidate,
  type Trait,
} from "@/data/demo"

interface DemoContextValue {
  role: Role
  candidates: Candidate[]
  sortedCandidates: Candidate[] // sorted by score, only pending/pass
  showNames: boolean
  nudgeCount: number // how many more/less actions have been taken
  responseCommitment: number // days (5/7/10/14)
  blindScreening: boolean // names hidden in queue until shortlisted
  maxReachedStep: number // furthest workflow step index (0=setup…4=closure)
  resumeUrls: Record<string, string> // candidateId → object URL for imported PDFs
  bucketCounts: Record<BucketId, number>
  setShowNames: (v: boolean) => void
  setResponseCommitment: (days: number) => void
  setBlindScreening: (v: boolean) => void
  advanceStep: (stepIndex: number) => void
  shortlist: (id: string) => void
  bulkShortlist: (ids: string[]) => void
  setPass: (id: string) => void
  bulkPass: (ids: string[]) => void
  moveToBucket: (id: string, bucket: BucketId) => void
  bulkMoveToBucket: (ids: string[], bucket: BucketId) => void
  applyNudge: (candidateId: string, dir: "more" | "less") => void
  updateTraitWeights: (traits: Trait[]) => void
  addImportedCandidates: (newCandidates: Candidate[], urls: Record<string, string>) => void
  scoreOf: (candidate: Candidate) => number
  getBucketOf: (candidate: Candidate) => BucketId
  resetDemo: () => void
}

const DemoContext = createContext<DemoContextValue | null>(null)

const STORAGE_KEY = "pathline-demo-state"

interface PersistedState {
  traits: Trait[]
  candidates: Array<{ id: string; status: Candidate["status"]; bucket?: "priority" | "strong" | "review"; manuallyBucketed?: boolean }>
  showNames: boolean
  nudgeCount: number
  responseCommitment: number
  blindScreening: boolean
  maxReachedStep: number
}

function loadState(): PersistedState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PersistedState) : null
  } catch {
    return null
  }
}

function saveState(state: PersistedState) {
  try {
    // Only persist statuses for original demo candidates — imported ones are memory-only
    const toSave: PersistedState = {
      ...state,
      candidates: state.candidates.filter((c) => DEMO_CANDIDATE_IDS.has(c.id)),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch {
    // ignore
  }
}

function getBucketOf(candidate: Candidate, traits: Trait[]): BucketId {
  if (candidate.status === "shortlisted") return "shortlisted"
  if (candidate.status === "pass") return "not_now"
  if (candidate.bucket) return candidate.bucket
  return computeScore(candidate, traits) >= STRONG_THRESHOLD ? "strong" : "review"
}

function getInitialState(): {
  traits: Trait[]
  candidates: Candidate[]
  showNames: boolean
  nudgeCount: number
  responseCommitment: number
  blindScreening: boolean
  maxReachedStep: number
} {
  const persisted = loadState()
  if (!persisted) {
    const shortlistedCount = DEMO_CANDIDATES.filter((c) => c.status === "shortlisted").length
    return {
      traits: DEMO_ROLE.traits,
      candidates: DEMO_CANDIDATES,
      showNames: false,
      nudgeCount: 0,
      responseCommitment: 7,
      blindScreening: true,
      maxReachedStep: shortlistedCount > 0 ? 2 : 0,
    }
  }
  const traitMap = new Map(persisted.traits.map((t) => [t.id, t]))
  const traits = DEMO_ROLE.traits.map((t) => traitMap.get(t.id) ?? t)
  const candidateMap = new Map(persisted.candidates.map((c) => [c.id, c]))
  const candidates = DEMO_CANDIDATES.map((c) => {
    const p = candidateMap.get(c.id)
    return {
      ...c,
      status: p?.status ?? c.status,
      bucket: p?.bucket ?? c.bucket,
      manuallyBucketed: p?.manuallyBucketed ?? c.manuallyBucketed,
    }
  })
  return {
    traits,
    candidates,
    showNames: persisted.showNames,
    nudgeCount: persisted.nudgeCount,
    responseCommitment: persisted.responseCommitment ?? 7,
    blindScreening: persisted.blindScreening ?? true,
    maxReachedStep: persisted.maxReachedStep ?? (candidates.filter((c) => c.status === "shortlisted").length > 0 ? 2 : 0),
  }
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false)
  const [traits, setTraits] = useState<Trait[]>(DEMO_ROLE.traits)
  const [candidates, setCandidates] = useState<Candidate[]>(DEMO_CANDIDATES)
  const [showNames, setShowNamesState] = useState(false)
  const [nudgeCount, setNudgeCount] = useState(0)
  const [responseCommitment, setResponseCommitmentState] = useState(7)
  const [blindScreening, setBlindScreeningState] = useState(true)
  const [maxReachedStep, setMaxReachedStep] = useState(0)
  const [resumeUrls, setResumeUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    const init = getInitialState()
    setTraits(init.traits)
    setCandidates(init.candidates)
    setShowNamesState(init.showNames)
    setNudgeCount(init.nudgeCount)
    setResponseCommitmentState(init.responseCommitment)
    setBlindScreeningState(init.blindScreening)
    setMaxReachedStep(init.maxReachedStep)
    setInitialized(true)
  }, [])

  const persist = useCallback(
    (
      nextTraits: Trait[],
      nextCandidates: Candidate[],
      nextShowNames: boolean,
      nextNudgeCount: number,
      nextResponseCommitment?: number,
      nextBlindScreening?: boolean,
      nextMaxReachedStep?: number
    ) => {
      saveState({
        traits: nextTraits,
        candidates: nextCandidates.map((c) => ({ id: c.id, status: c.status, bucket: c.bucket, manuallyBucketed: c.manuallyBucketed })),
        showNames: nextShowNames,
        nudgeCount: nextNudgeCount,
        responseCommitment: nextResponseCommitment ?? responseCommitment,
        blindScreening: nextBlindScreening ?? blindScreening,
        maxReachedStep: nextMaxReachedStep ?? maxReachedStep,
      })
    },
    [responseCommitment, blindScreening, maxReachedStep]
  )

  const scoreOf = useCallback(
    (candidate: Candidate) => computeScore(candidate, traits),
    [traits]
  )

  const getBucketOfCb = useCallback(
    (candidate: Candidate): BucketId => getBucketOf(candidate, traits),
    [traits]
  )

  const bucketCounts: Record<BucketId, number> = { priority: 0, strong: 0, review: 0, not_now: 0, shortlisted: 0 }
  for (const c of candidates) {
    bucketCounts[getBucketOf(c, traits)]++
  }

  const sortedCandidates = [...candidates]
    .filter((c) => c.status === "pending" || c.status === "pass")
    .sort((a, b) => computeScore(b, traits) - computeScore(a, traits))

  const setShowNames = useCallback(
    (v: boolean) => {
      setShowNamesState(v)
      persist(traits, candidates, v, nudgeCount)
    },
    [traits, candidates, nudgeCount, persist]
  )

  const setResponseCommitment = useCallback(
    (days: number) => {
      setResponseCommitmentState(days)
      persist(traits, candidates, showNames, nudgeCount, days, blindScreening, maxReachedStep)
    },
    [traits, candidates, showNames, nudgeCount, blindScreening, maxReachedStep, persist]
  )

  const setBlindScreening = useCallback(
    (v: boolean) => {
      setBlindScreeningState(v)
      persist(traits, candidates, showNames, nudgeCount, responseCommitment, v, maxReachedStep)
    },
    [traits, candidates, showNames, nudgeCount, responseCommitment, maxReachedStep, persist]
  )

  const advanceStep = useCallback(
    (stepIndex: number) => {
      if (stepIndex <= maxReachedStep) return
      setMaxReachedStep(stepIndex)
      persist(traits, candidates, showNames, nudgeCount, responseCommitment, blindScreening, stepIndex)
    },
    [traits, candidates, showNames, nudgeCount, responseCommitment, blindScreening, maxReachedStep, persist]
  )

  const shortlist = useCallback(
    (id: string) => {
      const next = candidates.map((c) => (c.id === id ? { ...c, status: "shortlisted" as const } : c))
      setCandidates(next)
      persist(traits, next, showNames, nudgeCount)
    },
    [candidates, traits, showNames, nudgeCount, persist]
  )

  const bulkShortlist = useCallback(
    (ids: string[]) => {
      const idSet = new Set(ids)
      const next = candidates.map((c) => idSet.has(c.id) ? { ...c, status: "shortlisted" as const } : c)
      setCandidates(next)
      persist(traits, next, showNames, nudgeCount)
    },
    [candidates, traits, showNames, nudgeCount, persist]
  )

  const setPass = useCallback(
    (id: string) => {
      const next = candidates.map((c) => (c.id === id ? { ...c, status: "pass" as const } : c))
      setCandidates(next)
      persist(traits, next, showNames, nudgeCount)
    },
    [candidates, traits, showNames, nudgeCount, persist]
  )

  const bulkPass = useCallback(
    (ids: string[]) => {
      const idSet = new Set(ids)
      const next = candidates.map((c) => idSet.has(c.id) ? { ...c, status: "pass" as const } : c)
      setCandidates(next)
      persist(traits, next, showNames, nudgeCount)
    },
    [candidates, traits, showNames, nudgeCount, persist]
  )

  const moveToBucket = useCallback(
    (id: string, bucket: BucketId) => {
      const next = candidates.map((c) => {
        if (c.id !== id) return c
        if (bucket === "shortlisted") return { ...c, status: "shortlisted" as const, bucket: undefined, manuallyBucketed: true }
        if (bucket === "not_now") return { ...c, status: "pass" as const, bucket: undefined, manuallyBucketed: true }
        return { ...c, status: "pending" as const, bucket, manuallyBucketed: true }
      })
      setCandidates(next)
      persist(traits, next, showNames, nudgeCount)
    },
    [candidates, traits, showNames, nudgeCount, persist]
  )

  const bulkMoveToBucket = useCallback(
    (ids: string[], bucket: BucketId) => {
      const idSet = new Set(ids)
      const next = candidates.map((c) => {
        if (!idSet.has(c.id)) return c
        if (bucket === "shortlisted") return { ...c, status: "shortlisted" as const, bucket: undefined, manuallyBucketed: true }
        if (bucket === "not_now") return { ...c, status: "pass" as const, bucket: undefined, manuallyBucketed: true }
        return { ...c, status: "pending" as const, bucket, manuallyBucketed: true }
      })
      setCandidates(next)
      persist(traits, next, showNames, nudgeCount)
    },
    [candidates, traits, showNames, nudgeCount, persist]
  )

  const applyNudge = useCallback(
    (candidateId: string, dir: "more" | "less") => {
      const candidate = candidates.find((c) => c.id === candidateId)
      if (!candidate) return
      const { updated } = nudgeWeights(traits, candidate, dir)
      const nextNudgeCount = nudgeCount + 1
      setTraits(updated)
      setNudgeCount(nextNudgeCount)
      persist(updated, candidates, showNames, nextNudgeCount)
    },
    [traits, candidates, showNames, nudgeCount, persist]
  )

  const updateTraitWeights = useCallback(
    (nextTraits: Trait[]) => {
      setTraits(nextTraits)
      persist(nextTraits, candidates, showNames, nudgeCount)
    },
    [candidates, showNames, nudgeCount, persist]
  )

  const addImportedCandidates = useCallback(
    (newCandidates: Candidate[], urls: Record<string, string>) => {
      const next = [...candidates, ...newCandidates]
      setCandidates(next)
      persist(traits, next, showNames, nudgeCount)
      setResumeUrls((prev) => ({ ...prev, ...urls }))
    },
    [candidates, traits, showNames, nudgeCount, persist]
  )

  const resetDemo = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setTraits(DEMO_ROLE.traits)
    setCandidates(DEMO_CANDIDATES)
    setShowNamesState(false)
    setNudgeCount(0)
    setResponseCommitmentState(7)
    setBlindScreeningState(true)
    setMaxReachedStep(DEMO_CANDIDATES.filter((c) => c.status === "shortlisted").length > 0 ? 2 : 0)
    setResumeUrls((prev) => {
      Object.values(prev).forEach((url) => URL.revokeObjectURL(url))
      return {}
    })
  }, [])

  const role: Role = { ...DEMO_ROLE, traits }

  if (!initialized) return null

  return (
    <DemoContext.Provider
      value={{
        role,
        candidates,
        sortedCandidates,
        showNames,
        nudgeCount,
        responseCommitment,
        blindScreening,
        maxReachedStep,
        resumeUrls,
        bucketCounts,
        setShowNames,
        setResponseCommitment,
        setBlindScreening,
        advanceStep,
        shortlist,
        bulkShortlist,
        setPass,
        bulkPass,
        moveToBucket,
        bulkMoveToBucket,
        applyNudge,
        updateTraitWeights,
        addImportedCandidates,
        scoreOf,
        getBucketOf: getBucketOfCb,
        resetDemo,
      }}
    >
      {children}
    </DemoContext.Provider>
  )
}

export function useDemo() {
  const ctx = useContext(DemoContext)
  if (!ctx) throw new Error("useDemo must be used within DemoProvider")
  return ctx
}
