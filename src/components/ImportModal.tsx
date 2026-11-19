"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { X, Upload, Download, Check, AlertCircle, FileText, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { useDemo } from "@/context/DemoContext"
import { useToast } from "@/components/ui/Toast"
import { type Candidate, type EvidenceItem, computeScore } from "@/data/demo"
import JSZip from "jszip"
import Papa from "papaparse"

// ─── Trait keyword heuristics ────────────────────────────────────────────────

const TRAIT_IDS = ["ownership", "data", "systems", "xfunc", "ambiguity", "operator"] as const
type TraitId = (typeof TRAIT_IDS)[number]

const TRAIT_KEYWORDS: Record<TraitId, RegExp> = {
  ownership: /\b(built|owned|ran|led|first|from scratch|end[- ]to[- ]end|launched|designed|created|founded)\b/i,
  data: /\b(SQL|Python|dashboard|model|analysis|analytics|forecast|Tableau|metrics|data|spreadsheet)\b/i,
  systems: /\b(process|playbook|handbook|checklist|document|system|SOP|workflow|procedure|template)\b/i,
  xfunc: /\b(team|partner|coordinated|across|product|finance|stakeholder|cross[- ]functional|collab)\b/i,
  ambiguity: /\b(seed|startup|founder|first.*hire|Series A|ambig|undefined|greenfield|no.*process|0[- ]to[- ]1|scaled)\b/i,
  operator: /\b(customer|client|account|vendor|support|pilot|partner|B2B|relationship)\b/i,
}

const TRAIT_LABEL: Record<TraitId, string> = {
  ownership: "Owns messy problems end to end",
  data: "Data and analytical fluency",
  systems: "Builds systems and processes",
  xfunc: "Cross-functional communication",
  ambiguity: "Comfort with ambiguity and startup pace",
  operator: "Customer or operator exposure",
}

function extractEvidence(text: string, candidateId: string): {
  traitVector: Record<string, number>
  evidence: EvidenceItem[]
  whySurfaced: string[]
} {
  // Grab experience section if present, else use full text
  const expMatch = text.match(/EXPERIENCE[\s\S]*?(?=EDUCATION|SKILLS|$)/i)
  const section = expMatch ? expMatch[0] : text

  // Split into bullet lines (strip bullet markers, skip short lines / headers)
  const lines = section.split(/\n/)
    .map((l) => l.replace(/^[•\-\*→]\s*/, "").trim())
    .filter((l) => l.length > 25 && !/^(EXPERIENCE|EDUCATION|SKILLS|SUMMARY)/i.test(l) && !/^\d{4}/.test(l))

  // Count keyword hits per trait per line
  type LineHit = { line: string; count: number }
  const hitsByTrait: Record<TraitId, LineHit[]> = {
    ownership: [], data: [], systems: [], xfunc: [], ambiguity: [], operator: [],
  }
  for (const traitId of TRAIT_IDS) {
    for (const line of lines) {
      const matches = line.match(new RegExp(TRAIT_KEYWORDS[traitId].source, "gi"))
      if (matches) hitsByTrait[traitId].push({ line, count: matches.length })
    }
    hitsByTrait[traitId].sort((a, b) => b.count - a.count)
  }

  // Strength: 0 matches → 15, 1 → 42, 2 → 62, 3 → 76, 4+ → 88
  const STRENGTH = [15, 42, 62, 76, 88]
  const traitVector: Record<string, number> = {}
  for (const traitId of TRAIT_IDS) {
    traitVector[traitId] = STRENGTH[Math.min(hitsByTrait[traitId].length, 4)]
  }

  // Build evidence cards: best line per trait, up to 4 total, deduplicated
  const usedLines = new Set<string>()
  const evidence: EvidenceItem[] = []
  let idx = 0

  // Sort traits by strength desc for top evidence selection
  const sortedTraits = [...TRAIT_IDS].sort((a, b) => traitVector[b] - traitVector[a])

  for (const traitId of sortedTraits) {
    if (hitsByTrait[traitId].length === 0) continue
    const best = hitsByTrait[traitId][0]
    if (!usedLines.has(best.line)) {
      usedLines.add(best.line)
      evidence.push({
        id: `${candidateId}_ev${idx++}`,
        source: "resume",
        traitId,
        quote: best.line.length > 160 ? best.line.slice(0, 157) + "…" : best.line,
        strength: Math.min(90, 25 + best.count * 15),
      })
    }
    if (evidence.length >= 4) break
  }

  // whySurfaced: top 2 trait labels
  const topTraits = sortedTraits
    .filter((t) => traitVector[t] >= 42)
    .slice(0, 2)
    .map((t) => TRAIT_LABEL[t])

  return { traitVector, evidence, whySurfaced: topTraits.length ? topTraits : ["Strong experience background"] }
}

// ─── PDF text extraction ─────────────────────────────────────────────────────

let pdfjsConfigured = false

async function extractPDFText(buffer: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist")
  if (!pdfjsConfigured) {
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"
    pdfjsConfigured = true
  }
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise
  const parts: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    // Build line-aware text by grouping items by Y position
    const byY = new Map<number, string[]>()
    for (const item of content.items) {
      if (!("str" in item)) continue
      const y = Math.round(("transform" in item ? (item as any).transform[5] : 0) / 2) * 2
      if (!byY.has(y)) byY.set(y, [])
      byY.get(y)!.push((item as any).str)
    }
    // Sort by Y descending (PDF coords are bottom-up)
    const lines = [...byY.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, words]) => words.join(" ").trim())
      .filter((l) => l.length > 0)
    parts.push(lines.join("\n"))
  }
  return parts.join("\n")
}

// ─── CSV column mapping ───────────────────────────────────────────────────────

const CSV_FIELD_MAP: Record<string, keyof CsvRow> = {
  first_name: "first_name", firstname: "first_name", "first name": "first_name",
  last_name: "last_name", lastname: "last_name", "last name": "last_name",
  name: "name", full_name: "name",
  email: "email",
  current_title: "current_title", title: "current_title", job_title: "current_title", "current title": "current_title",
  current_company: "current_company", company: "current_company", employer: "current_company", "current company": "current_company",
  applied_date: "applied_date", date: "applied_date", apply_date: "applied_date", "applied date": "applied_date",
  linkedin_url: "linkedin_url", linkedin: "linkedin_url",
  resume_file: "resume_file", resume: "resume_file", "resume file": "resume_file", filename: "resume_file",
}

interface CsvRow {
  first_name?: string
  last_name?: string
  name?: string
  email?: string
  current_title?: string
  current_company?: string
  applied_date?: string
  linkedin_url?: string
  resume_file?: string
}

function mapCsvHeaders(headers: string[]): Record<string, keyof CsvRow | null> {
  const result: Record<string, keyof CsvRow | null> = {}
  for (const h of headers) {
    result[h] = CSV_FIELD_MAP[h.toLowerCase().trim()] ?? null
  }
  return result
}

function applyMapping(row: Record<string, string>, mapping: Record<string, keyof CsvRow | null>): CsvRow {
  const out: CsvRow = {}
  for (const [col, field] of Object.entries(mapping)) {
    if (field && row[col] !== undefined) (out as Record<string, string>)[field] = row[col]
  }
  return out
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface ParsedFile {
  csvRows: Array<{ raw: Record<string, string>; mapped: CsvRow }>
  pdfBuffers: Record<string, ArrayBuffer> // filename → buffer
  headers: string[]
  mapping: Record<string, keyof CsvRow | null>
  matchCount: number
  parseErrors: string[]
}

type Step = "upload" | "preview" | "processing" | "done"

// ─── Component ───────────────────────────────────────────────────────────────

interface ImportModalProps {
  onClose: () => void
}

export function ImportModal({ onClose }: ImportModalProps) {
  const { role, candidates, addImportedCandidates, scoreOf } = useDemo()
  const { toast } = useToast()
  const [step, setStep] = useState<Step>("upload")
  const [isDragging, setIsDragging] = useState(false)
  const [parsed, setParsed] = useState<ParsedFile | null>(null)
  const [progressCurrent, setProgressCurrent] = useState(0)
  const [progressTotal, setProgressTotal] = useState(0)
  const [progressStage, setProgressStage] = useState("")
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [importedCount, setImportedCount] = useState(0)
  const [topCount, setTopCount] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files)
    const pdfBuffers: Record<string, ArrayBuffer> = {}
    let csvText: string | null = null
    const parseErrors: string[] = []

    // Single .zip
    const zipFile = fileArr.find((f) => f.name.endsWith(".zip"))
    if (zipFile) {
      const zipBuf = await zipFile.arrayBuffer()
      const zip = await JSZip.loadAsync(zipBuf)
      for (const [path, entry] of Object.entries(zip.files)) {
        if (entry.dir) continue
        const name = path.split("/").pop()!
        if (name.endsWith(".pdf")) {
          pdfBuffers[name] = await entry.async("arraybuffer")
        } else if (name.endsWith(".csv")) {
          csvText = await entry.async("string")
        }
      }
    } else {
      // CSV + PDFs dropped together
      const csvFile = fileArr.find((f) => f.name.endsWith(".csv"))
      if (csvFile) csvText = await csvFile.text()
      for (const f of fileArr.filter((f) => f.name.endsWith(".pdf"))) {
        pdfBuffers[f.name] = await f.arrayBuffer()
      }
    }

    if (!csvText) {
      parseErrors.push("No CSV found. Drop a .zip or a CSV alongside PDFs.")
      setParsed({ csvRows: [], pdfBuffers: {}, headers: [], mapping: {}, matchCount: 0, parseErrors })
      setStep("preview")
      return
    }

    const result = Papa.parse<Record<string, string>>(csvText.trim(), {
      header: true, skipEmptyLines: true,
    })
    const headers = result.meta.fields ?? []
    const mapping = mapCsvHeaders(headers)
    const csvRows = result.data.map((raw) => ({ raw, mapped: applyMapping(raw, mapping) }))

    // Count rows with a matched PDF
    const matchCount = csvRows.filter((r) => {
      const fn = r.mapped.resume_file
      return fn && pdfBuffers[fn]
    }).length

    setParsed({ csvRows, pdfBuffers, headers, mapping, matchCount, parseErrors })
    setStep("preview")
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleImport = useCallback(async () => {
    if (!parsed) return
    setStep("processing")
    const errors: string[] = [...parsed.parseErrors]
    const newCandidates: Candidate[] = []
    const urls: Record<string, string> = {}
    const total = parsed.csvRows.length
    setProgressTotal(total)

    // Stage 1: Reading resumes
    setProgressStage("Reading resumes…")
    for (let i = 0; i < total; i++) {
      setProgressCurrent(i + 1)
      await new Promise((r) => setTimeout(r, 60)) // small yield for UI
    }

    // Stage 2: Extracting evidence
    setProgressStage("Extracting evidence…")
    for (let i = 0; i < total; i++) {
      setProgressCurrent(i)
      const { mapped } = parsed.csvRows[i]
      const id = `imp_${Date.now()}_${i}`
      const firstName = mapped.first_name ?? mapped.name?.split(" ")[0] ?? "Unknown"
      const lastName = mapped.last_name ?? mapped.name?.split(" ").slice(1).join(" ") ?? ""
      const fullName = `${firstName} ${lastName}`.trim()
      const initials = `${firstName[0] ?? "?"}${lastName[0] ?? ""}`.toUpperCase()
      const title = mapped.current_title ?? "Unknown Title"
      const company = mapped.current_company ?? "Unknown Company"
      const appliedDate = mapped.applied_date ?? new Date().toISOString().slice(0, 10)

      let traitVector: Record<string, number> = Object.fromEntries(TRAIT_IDS.map((t) => [t, 15]))
      let evidence: EvidenceItem[] = []
      let whySurfaced = ["Imported from ATS"]

      const pdfFile = mapped.resume_file
      if (pdfFile && parsed.pdfBuffers[pdfFile]) {
        try {
          const text = await extractPDFText(parsed.pdfBuffers[pdfFile])
          const extracted = extractEvidence(text, id)
          traitVector = extracted.traitVector
          evidence = extracted.evidence
          whySurfaced = extracted.whySurfaced

          const blob = new Blob([parsed.pdfBuffers[pdfFile]], { type: "application/pdf" })
          urls[id] = URL.createObjectURL(blob)
        } catch (err) {
          errors.push(`Couldn't read ${pdfFile}: ${err instanceof Error ? err.message : "unknown error"}`)
        }
      } else if (pdfFile) {
        errors.push(`PDF not found for ${fullName}: ${pdfFile}`)
      }

      const headline = `${title}, ${company}`

      newCandidates.push({
        id,
        name: fullName,
        initials,
        headline,
        summary: evidence.length > 0
          ? `Imported from Greenhouse. ${evidence[0]?.quote.slice(0, 100) ?? ""}${evidence[0] && evidence[0].quote.length > 100 ? "…" : ""}`
          : `Imported from Greenhouse. ${title} at ${company}.`,
        traitVector,
        evidence,
        whySurfaced,
        personalLine: evidence.length > 0
          ? `Your experience — ${evidence[0]?.quote.slice(0, 100)}${evidence[0] && evidence[0].quote.length > 100 ? "…" : ""} — stood out to us.`
          : `Your background as ${title} at ${company} caught our attention.`,
        status: "pending",
        appliedDate,
      })
    }

    // Stage 3: Scoring
    setProgressStage("Scoring against your calibration…")
    setProgressCurrent(0)
    for (let i = 0; i < newCandidates.length; i++) {
      setProgressCurrent(i + 1)
      await new Promise((r) => setTimeout(r, 40))
    }

    // Count how many make top 40
    const existingPending = candidates.filter((c) => c.status === "pending")
    const allForRank = [...existingPending, ...newCandidates]
    allForRank.sort((a, b) => computeScore(b, role.traits) - computeScore(a, role.traits))
    const inTop40 = newCandidates.filter((c) => {
      const rank = allForRank.findIndex((r) => r.id === c.id)
      return rank < 40
    }).length

    addImportedCandidates(newCandidates, urls)
    setImportErrors(errors)
    setImportedCount(newCandidates.length)
    setTopCount(inTop40)
    setStep("done")

    const errorMsg = errors.length > 0 ? ` · Couldn't read ${errors.length} resume${errors.length !== 1 ? "s" : ""}` : ""
    toast(`Imported ${newCandidates.length} applicants · ${inTop40} entered your top 40${errorMsg}`)
  }, [parsed, candidates, role.traits, addImportedCandidates, toast])

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface rounded-2xl border border-border shadow-xl w-full max-w-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-text">
              {step === "upload" && "Import applicants"}
              {step === "preview" && "Import preview"}
              {step === "processing" && "Importing…"}
              {step === "done" && "Import complete"}
            </h2>
            {step === "upload" && (
              <p className="text-xs text-muted mt-0.5">Drop a .zip (CSV + resumes) or a CSV + PDFs</p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-bg transition-colors cursor-pointer">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Upload ── */}
          {step === "upload" && (
            <div className="p-6">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-3 p-10 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                  isDragging ? "border-accent bg-accent-light" : "border-border hover:border-accent/40 hover:bg-bg"
                }`}
              >
                <Upload size={24} className="text-muted" />
                <div className="text-center">
                  <p className="text-sm font-medium text-text">Drop your export here</p>
                  <p className="text-xs text-muted mt-1">
                    A .zip with applicants.csv + resumes/, or drop a CSV and PDFs together
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }}>
                  Browse files
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept=".zip,.csv,.pdf"
                  className="hidden"
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                />
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-muted">Format: CSV with applicant metadata + PDFs in a resumes/ folder</p>
                <a
                  href="/vittacus_bizops_applicants_export.zip"
                  download
                  className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-hover transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download size={12} />
                  Download sample export
                </a>
              </div>
            </div>
          )}

          {/* ── Preview ── */}
          {step === "preview" && parsed && (
            <div className="p-6 flex flex-col gap-5">
              {parsed.parseErrors.length > 0 && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2">
                  <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    {parsed.parseErrors.map((e, i) => (
                      <p key={i} className="text-xs text-red-700">{e}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Column mapping */}
              {parsed.headers.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Column mapping</p>
                  <div className="flex flex-wrap gap-1.5">
                    {parsed.headers.map((h) => {
                      const mapped = parsed.mapping[h]
                      return (
                        <span
                          key={h}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs border ${
                            mapped
                              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                              : "bg-bg border-border text-muted"
                          }`}
                        >
                          {h}
                          {mapped && (
                            <>
                              <ChevronRight size={10} />
                              <span className="font-medium">{mapped}</span>
                            </>
                          )}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* First 3 rows */}
              {parsed.csvRows.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">First 3 rows</p>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-bg border-b border-border">
                        <tr>
                          <th className="text-left px-3 py-2 text-muted font-medium">Name</th>
                          <th className="text-left px-3 py-2 text-muted font-medium">Title</th>
                          <th className="text-left px-3 py-2 text-muted font-medium">Date</th>
                          <th className="text-left px-3 py-2 text-muted font-medium">Resume</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.csvRows.slice(0, 3).map((row, i) => {
                          const m = row.mapped
                          const name = m.name ?? (`${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || "—")
                          const hasResume = !!(m.resume_file && parsed.pdfBuffers[m.resume_file])
                          return (
                            <tr key={i} className="border-b border-border last:border-0">
                              <td className="px-3 py-2 text-text font-medium truncate max-w-[100px]">{name}</td>
                              <td className="px-3 py-2 text-muted truncate max-w-[120px]">{m.current_title ?? "—"}</td>
                              <td className="px-3 py-2 text-muted">{m.applied_date ?? "—"}</td>
                              <td className="px-3 py-2">
                                {hasResume
                                  ? <span className="flex items-center gap-1 text-emerald-700"><Check size={10} /> Found</span>
                                  : <span className="text-muted">—</span>
                                }
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Match summary */}
              <div className={`flex items-center gap-2 p-3 rounded-xl border ${
                parsed.matchCount > 0 ? "bg-emerald-50 border-emerald-200" : "bg-bg border-border"
              }`}>
                {parsed.matchCount > 0
                  ? <Check size={14} className="text-emerald-600 flex-shrink-0" />
                  : <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
                }
                <p className="text-xs text-text">
                  {parsed.matchCount > 0
                    ? <><span className="font-semibold">{parsed.matchCount} resume{parsed.matchCount !== 1 ? "s" : ""}</span> matched to {parsed.matchCount} applicant{parsed.matchCount !== 1 ? "s" : ""} · {parsed.csvRows.length - parsed.matchCount} resume-only</>
                    : parsed.csvRows.length > 0
                      ? <><span className="font-semibold">{parsed.csvRows.length} applicants</span> found · no PDFs matched (will import as resume-only)</>
                      : "No applicants found in CSV"
                  }
                </p>
              </div>
            </div>
          )}

          {/* ── Processing ── */}
          {step === "processing" && (
            <div className="p-6 flex flex-col gap-5">
              <div>
                <div className="flex items-center justify-between text-xs text-muted mb-2">
                  <span>{progressStage}</span>
                  <span>{progressTotal > 0 ? Math.round((progressCurrent / progressTotal) * 100) : 0}%</span>
                </div>
                <div className="h-2 rounded-full bg-bg border border-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-300"
                    style={{ width: progressTotal > 0 ? `${(progressCurrent / progressTotal) * 100}%` : "0%" }}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {[
                  "Reading resumes…",
                  "Extracting evidence…",
                  "Scoring against your calibration…",
                ].map((label) => {
                  const stages = ["Reading resumes…", "Extracting evidence…", "Scoring against your calibration…"]
                  const thisIdx = stages.indexOf(label)
                  const currentIdx = stages.indexOf(progressStage)
                  const done = thisIdx < currentIdx
                  const active = thisIdx === currentIdx
                  return (
                    <div key={label} className="flex items-center gap-2.5">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                        done ? "bg-emerald-500" : active ? "bg-accent" : "bg-bg border border-border"
                      }`}>
                        {done && <Check size={8} className="text-white" />}
                        {active && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                      </div>
                      <span className={`text-sm ${active ? "text-text font-medium" : done ? "text-muted" : "text-muted/50"}`}>
                        {label.replace("…", done ? "" : active ? "…" : "")}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Done ── */}
          {step === "done" && (
            <div className="p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <Check size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text">
                    Imported {importedCount} applicant{importedCount !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {topCount} entered your top 40 · scored with current calibration
                  </p>
                </div>
              </div>
              {importErrors.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="text-xs font-medium text-amber-800 mb-1.5">
                    Couldn't read {importErrors.length} resume{importErrors.length !== 1 ? "s" : ""} — skipped
                  </p>
                  {importErrors.slice(0, 3).map((e, i) => (
                    <p key={i} className="text-xs text-amber-700 flex items-start gap-1">
                      <span className="flex-shrink-0">·</span> {e}
                    </p>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-bg border border-border">
                <FileText size={14} className="text-muted flex-shrink-0" />
                <p className="text-xs text-muted">
                  Imported candidates are marked <span className="font-medium text-text">Resume only</span> and <span className="font-medium text-text">Imported</span> in the queue.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3 flex-shrink-0">
          {step === "upload" && (
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          )}

          {step === "preview" && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setStep("upload")}>Back</Button>
              <Button
                size="sm"
                disabled={!parsed || parsed.csvRows.length === 0}
                onClick={handleImport}
              >
                Import {parsed?.csvRows.length ?? 0} applicants →
              </Button>
            </>
          )}

          {step === "processing" && (
            <p className="text-xs text-muted">Processing — please wait…</p>
          )}

          {step === "done" && (
            <div className="flex justify-end w-full">
              <Button size="sm" onClick={onClose}>Go to queue →</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
